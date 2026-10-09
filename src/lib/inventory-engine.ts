import { db } from '../db/index.ts';
import {
  seatInventory,
  ticketTypes,
  orders,
  tickets,
  settlements,
  events,
  organizers,
  seats,
  venueSections,
  coupons,
  auditLogs,
  eventSessions,
} from '../db/schema.ts';
import { eq, and, sql, inArray, lt, or, ne } from 'drizzle-orm';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { PricingBreakdown } from './types.ts';
import { getTicketShareUrl } from './public-url.ts';
import { sendBookingTicketEmail } from './email-service.ts';
import { generateSecureTicketQr } from './ticket-crypto.ts';

function getTicketSecret(): string {
  return process.env.TICKET_SECRET || 'mahaticket_secure_signing_key_2026';
}

const TICKET_SECRET = getTicketSecret();
const HOLD_DURATION_MINUTES = 5;
const MAX_SEATS_PER_BOOKING = 5;

/**
 * Immediately release held seats for a user session/token on back/cancel/discard
 */
export async function releaseSeatsHold(
  sessionId: number,
  holdToken: string,
  seatIds?: number[]
): Promise<number> {
  try {
    const conditions = [
      eq(seatInventory.sessionId, sessionId),
      eq(seatInventory.status, 'held'),
      eq(seatInventory.heldByUserId, holdToken),
    ];
    if (seatIds && seatIds.length > 0) {
      conditions.push(inArray(seatInventory.seatId, seatIds));
    }
    const result = await db
      .update(seatInventory)
      .set({
        status: 'available',
        heldByUserId: null,
        holdExpiresAt: null,
      })
      .where(and(...conditions))
      .returning({ id: seatInventory.id });

    return result.length;
  } catch (error) {
    console.error('Error releasing held seats:', error);
    return 0;
  }
}

/**
 * Release any seat holds that have expired past their 5-minute reservation window
 */
export async function releaseExpiredHolds(sessionId: number): Promise<number> {
  try {
    const now = new Date();
    const result = await db
      .update(seatInventory)
      .set({
        status: 'available',
        heldByUserId: null,
        holdExpiresAt: null,
      })
      .where(
        and(
          eq(seatInventory.sessionId, sessionId),
          eq(seatInventory.status, 'held'),
          lt(seatInventory.holdExpiresAt, now)
        )
      )
      .returning({ id: seatInventory.id });

    return result.length;
  } catch (error) {
    console.error('Error releasing expired holds:', error);
    return 0;
  }
}

/**
 * Calculate transparent ticket pricing breakdown
 */
export async function calculatePricing(
  event: any,
  ticketCount: number,
  faceValueTotal: number,
  couponCode?: string
): Promise<PricingBreakdown> {
  // Platform / Convenience Fee calculation
  let platformFeePerTicket = event.convenienceFeeValue || 3000; // in paise (e.g. ₹30.00)
  if (event.convenienceFeeType === 'percent') {
    platformFeePerTicket = Math.round((faceValueTotal / ticketCount) * 0.05); // 5%
  }
  const platformFeeTotal = platformFeePerTicket * ticketCount;

  // 18% GST exclusively on the platform convenience fee
  const gstPercent = event.gstPercent || 18;
  const taxTotal = Math.round((platformFeeTotal * gstPercent) / 100);

  // Gateway cost estimate (2% on total collected amount)
  const grossSubtotal = faceValueTotal + platformFeeTotal + taxTotal;
  const gatewayCostEstimate = Math.round(grossSubtotal * 0.02);

  // Coupon discount check
  let discountTotal = 0;
  let appliedCoupon: string | null = null;

  if (couponCode && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    const couponList = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, cleanCode), eq(coupons.active, 1)));

    if (couponList.length > 0) {
      const c = couponList[0];
      if (grossSubtotal >= c.minOrderValue) {
        if (c.discountType === 'percentage') {
          const discount = Math.round((grossSubtotal * c.discountValue) / 10000);
          discountTotal = Math.min(discount, c.maxDiscount);
        } else {
          discountTotal = Math.min(c.discountValue, grossSubtotal);
        }
        appliedCoupon = c.code;
      }
    }
  }

  const grandTotal = Math.max(0, grossSubtotal - discountTotal);

  return {
    ticketCount,
    ticketFaceValueTotal: faceValueTotal,
    platformFeeTotal,
    taxTotal,
    gatewayCostEstimate,
    discountTotal,
    grandTotal,
    appliedCoupon,
  };
}

/**
 * Atomically create a temporary reservation/hold for selected seats
 */
export async function createTemporarySeatHold(params: {
  sessionId: number;
  seatIds: number[];
  userIdStr: string;
}) {
  const { sessionId, seatIds, userIdStr } = params;

  if (!seatIds || seatIds.length === 0) {
    throw new Error('Please select at least one seat.');
  }

  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    throw new Error(`Maximum ${MAX_SEATS_PER_BOOKING} seats allowed per booking. Please select up to 5 seats.`);
  }

  // 1. First sweep away expired holds for this session
  await releaseExpiredHolds(sessionId);

  // 2. Fetch target event and session details
  const sessionInventories = await db
    .select({
      invId: seatInventory.id,
      seatId: seatInventory.seatId,
      status: seatInventory.status,
      heldBy: seatInventory.heldByUserId,
      holdExpires: seatInventory.holdExpiresAt,
      ticketTypeId: seatInventory.ticketTypeId,
      price: ticketTypes.price,
      seatCode: seats.seatCode,
      tier: seats.tier,
      sectionId: seats.sectionId,
    })
    .from(seatInventory)
    .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
    .innerJoin(seats, eq(seatInventory.seatId, seats.id))
    .where(
      and(
        eq(seatInventory.sessionId, sessionId),
        inArray(seatInventory.seatId, seatIds)
      )
    );

  if (sessionInventories.length < seatIds.length) {
    const missingCount = seatIds.length - sessionInventories.length;
    const existingIds = sessionInventories.map((i) => i.seatId);
    const availableExtras = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        heldBy: seatInventory.heldByUserId,
        holdExpires: seatInventory.holdExpiresAt,
        ticketTypeId: seatInventory.ticketTypeId,
        price: ticketTypes.price,
        seatCode: seats.seatCode,
        tier: seats.tier,
        sectionId: seats.sectionId,
      })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .where(and(eq(seatInventory.sessionId, sessionId), eq(seatInventory.status, 'available')))
      .limit(missingCount + existingIds.length);

    for (const extra of availableExtras) {
      if (!existingIds.includes(extra.seatId) && sessionInventories.length < seatIds.length) {
        sessionInventories.push(extra);
        existingIds.push(extra.seatId);
      }
    }
  }

  const effectiveSeatIds = sessionInventories.map((i) => i.seatId);

  // 3. Concurrency check: Ensure none of the seats are booked or held by another user
  const now = new Date();
  for (const inv of sessionInventories) {
    if (inv.status === 'booked') {
      throw new Error(`Seat ${inv.seatCode} is already booked.`);
    }
    if (inv.status === 'held' && inv.heldBy !== userIdStr) {
      if (inv.holdExpires && new Date(inv.holdExpires) > now) {
        throw new Error(`Seat ${inv.seatCode} is currently held by another user.`);
      }
    }
  }

  // 4. Race-safe hold: only transition available → held (or re-hold own expired/active hold)
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

  const heldRows = await db
    .update(seatInventory)
    .set({
      status: 'held',
      heldByUserId: userIdStr,
      holdExpiresAt: expiresAt,
    })
    .where(
      and(
        eq(seatInventory.sessionId, sessionId),
        inArray(seatInventory.seatId, effectiveSeatIds),
        or(
          eq(seatInventory.status, 'available'),
          lt(seatInventory.holdExpiresAt, now),
          and(eq(seatInventory.status, 'held'), eq(seatInventory.heldByUserId, userIdStr))
        )
      )
    )
    .returning({ seatId: seatInventory.seatId });

  if (heldRows.length === 0 && effectiveSeatIds.length > 0) {
    throw new Error('One or more seats were just taken. Please reselect available seats.');
  }

  // Compute face value total (server-authoritative from ticket_types)
  const faceValueTotal = sessionInventories.reduce((sum, item) => sum + item.price, 0);

  return {
    holdToken: userIdStr,
    heldSeatIds: seatIds,
    heldSeats: sessionInventories.map((i) => ({
      seatId: i.seatId,
      seatCode: i.seatCode,
      price: i.price,
      tier: i.tier,
    })),
    holdExpiresAt: expiresAt.toISOString(),
    expiresInSeconds: HOLD_DURATION_MINUTES * 60,
    faceValueTotal,
  };
}

/**
 * Confirm booking after payment verification and generate cryptographically signed QR tickets
 */
export async function confirmBookingOrder(params: {
  sessionId: number;
  eventId: number;
  seatIds: number[];
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  pricing: PricingBreakdown;
  paymentDetails: {
    gateway: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    idempotencyKey?: string;
  };
}) {
  const { sessionId, eventId, seatIds, userId, userName, userEmail, userPhone, pricing, paymentDetails } = params;

  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    throw new Error(`Maximum ${MAX_SEATS_PER_BOOKING} seats allowed per booking.`);
  }

  // Idempotency: If this Razorpay payment ID was already processed, return existing order and tickets safely
  if (paymentDetails.razorpayPaymentId) {
    const existingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayPaymentId, paymentDetails.razorpayPaymentId))
      .limit(1);

    if (existingOrders.length > 0) {
      const existingTickets = await db
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, existingOrders[0].id));

      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      return {
        order: existingOrders[0],
        tickets: existingTickets,
        event: existingEvent,
        pricing,
      };
    }
  }

  // 1. Sweep expired holds first
  await releaseExpiredHolds(sessionId);

  // 2. Query event and organizer
  const [eventRecord] = await db.select().from(events).where(eq(events.id, eventId));
  if (!eventRecord) {
    throw new Error(`Event #${eventId} not found.`);
  }

  let organizerRecord = eventRecord.organizerId 
    ? (await db.select().from(organizers).where(eq(organizers.id, eventRecord.organizerId)))[0]
    : null;

  if (!organizerRecord) {
    const [firstOrg] = await db.select().from(organizers).limit(1);
    organizerRecord = firstOrg;
  }

  // 3. Verify that the seats are indeed held or available (not already booked by anyone else)
  const currentSeats = await db
    .select({
      invId: seatInventory.id,
      seatId: seatInventory.seatId,
      status: seatInventory.status,
      ticketTypeId: seatInventory.ticketTypeId,
      seatCode: seats.seatCode,
      price: ticketTypes.price,
    })
    .from(seatInventory)
    .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
    .innerJoin(seats, eq(seatInventory.seatId, seats.id))
    .where(
      and(
        eq(seatInventory.sessionId, sessionId),
        inArray(seatInventory.seatId, seatIds)
      )
    );

  if (currentSeats.length < seatIds.length) {
    const missingCount = seatIds.length - currentSeats.length;
    const existingIds = currentSeats.map((s) => s.seatId);
    const availableExtras = await db
      .select({
        invId: seatInventory.id,
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        ticketTypeId: seatInventory.ticketTypeId,
        seatCode: seats.seatCode,
        price: ticketTypes.price,
      })
      .from(seatInventory)
      .innerJoin(ticketTypes, eq(seatInventory.ticketTypeId, ticketTypes.id))
      .innerJoin(seats, eq(seatInventory.seatId, seats.id))
      .where(and(eq(seatInventory.sessionId, sessionId), ne(seatInventory.status, 'booked')))
      .limit(missingCount + existingIds.length);

    for (const extra of availableExtras) {
      if (!existingIds.includes(extra.seatId) && currentSeats.length < seatIds.length) {
        currentSeats.push(extra);
        existingIds.push(extra.seatId);
      }
    }
  }

  const effectiveSeatIds = currentSeats.map((s) => s.seatId);

  for (const s of currentSeats) {
    if (s.status === 'booked') {
      throw new Error(`Cannot confirm: Seat ${s.seatCode} has already been purchased.`);
    }
  }

  // 4. Create authoritative Order
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const orderNumber = `MT-${new Date().getFullYear()}-${randomSuffix}`;

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId,
      userEmail,
      userPhone,
      userName,
      eventId,
      sessionId,
      ticketCount: pricing.ticketCount,
      ticketFaceValueTotal: pricing.ticketFaceValueTotal,
      platformFeeTotal: pricing.platformFeeTotal,
      taxTotal: pricing.taxTotal,
      gatewayCostEstimate: pricing.gatewayCostEstimate || 0,
      discountTotal: pricing.discountTotal || 0,
      grandTotal: pricing.grandTotal,
      currency: 'INR',
      paymentStatus: 'captured',
      orderStatus: 'confirmed',
      razorpayOrderId: paymentDetails.razorpayOrderId || null,
      razorpayPaymentId: paymentDetails.razorpayPaymentId || null,
      idempotencyKey: paymentDetails.idempotencyKey || `idem_${orderNumber}`,
    })
    .returning();

  // 5. Update seat inventory to 'booked' and attach orderId
  await db
    .update(seatInventory)
    .set({
      status: 'booked',
      heldByUserId: null,
      holdExpiresAt: null,
      orderId: order.id,
    })
    .where(
      and(
        eq(seatInventory.sessionId, sessionId),
        inArray(seatInventory.seatId, effectiveSeatIds.length > 0 ? effectiveSeatIds : seatIds)
      )
    );

  // 6. Generate individual tickets with QR codes & HMAC SHA-256 signatures
  const generatedTickets: any[] = [];

  for (let idx = 0; idx < currentSeats.length; idx++) {
    const s = currentSeats[idx];
    const ticketCode = `MT-TK-${order.id}-${s.seatCode.replace(/[^A-Za-z0-9]/g, '')}-${idx + 1}`;

    // Cryptographic signature: HMAC SHA256 of ticketCode + eventId + sessionId + seatCode
    const rawData = `${ticketCode}|${eventId}|${sessionId}|${s.seatCode}|${userName}`;
    const securityHash = crypto
      .createHmac('sha256', TICKET_SECRET)
      .update(rawData)
      .digest('hex');

    // Secure encrypted QR barcode: hides ticket ID/number from public eyes, verified cryptographically by organizer scanner
    const qrPayload = generateSecureTicketQr(ticketCode, eventId);

    // Generate real scannable QR Data URL that opens the ticket URL directly
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });

    const [ticketRecord] = await db
      .insert(tickets)
      .values({
        ticketCode,
        orderId: order.id,
        sessionId,
        ticketTypeId: s.ticketTypeId,
        seatId: s.seatId,
        seatCode: s.seatCode,
        attendeeName: userName,
        faceValue: s.price,
        securityHash,
        qrPayload,
        status: 'valid',
      })
      .returning();

    generatedTickets.push({
      ...ticketRecord,
      qrDataUrl,
    });
  }

  // 7. Update Settlement Ledger for the Organiser
  // Calculate commission: e.g. 500 basis points = 5.0%
  const orgCommRate = organizerRecord?.commissionRate || 500;
  const platformCommissionEarned = Math.round(
    (pricing.ticketFaceValueTotal * orgCommRate) / 10000
  );
  const netPayableToOrganizer = pricing.ticketFaceValueTotal - platformCommissionEarned;

  const targetOrgId = organizerRecord?.id || 1;
  const settleRef = `SETTLE-${new Date().getFullYear()}-${targetOrgId.toString().padStart(3, '0')}-${order.id}`;

  try {
    await db.insert(settlements).values({
      settlementReference: settleRef,
      organizerId: targetOrgId,
      eventId: eventRecord.id,
      totalGrossTicketSales: pricing.ticketFaceValueTotal,
      totalPlatformFeesCollected: pricing.platformFeeTotal,
      totalPaymentGatewayCost: pricing.gatewayCostEstimate,
      totalTaxCollected: pricing.taxTotal,
      platformCommissionEarned,
      totalRefundDeductions: 0,
      netPayableToOrganizer,
      status: 'pending',
    });
  } catch (settleErr) {
    console.warn('[Booking] Settlement record notice:', settleErr);
  }

  // 8. Audit log for financial & booking integrity
  try {
    await db.insert(auditLogs).values({
      actorId: `user-${userId}`,
      actorRole: 'customer',
      action: 'ORDER_CONFIRMED',
      entityType: 'order',
      entityId: order.orderNumber,
      details: JSON.stringify({
        orderId: order.id,
        seats: currentSeats.map((c) => c.seatCode),
        grandTotal: pricing.grandTotal,
        organizerNet: netPayableToOrganizer,
      }),
    });
  } catch (auditErr) {
    console.warn('[Booking] Audit log notice:', auditErr);
  }

  // 9. Instant booking confirmation email dispatch via SMTP / Resend
  if (generatedTickets.length > 0 && userEmail) {
    sendBookingTicketEmail({
      ticketCode: generatedTickets[0].ticketCode,
      recipientEmail: userEmail,
    }).catch((emailErr) => {
      console.warn('[Booking] Background email dispatch error:', emailErr);
    });
  }

  return {
    order,
    tickets: generatedTickets,
    event: eventRecord,
    organizer: organizerRecord,
    pricing,
  };
}

/**
 * Safely generate session seat inventory from a master venue layout template.
 * Idempotent: Never overwrites existing orders, tickets, or seat holds.
 */
export async function generateSessionInventory(
  sessionId: number,
  venueId: number,
  defaultPriceRupees?: number
): Promise<{ createdCount: number; totalSeats: number }> {
  try {
    // 1. Fetch physical venue sections and seats
    const sections = await db
      .select()
      .from(venueSections)
      .where(eq(venueSections.venueId, venueId));

    if (sections.length === 0) {
      return { createdCount: 0, totalSeats: 0 };
    }

    const allSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.venueId, venueId));

    if (allSeats.length === 0) {
      return { createdCount: 0, totalSeats: 0 };
    }

    // Fetch eventId for this session
    const [sessRecord] = await db
      .select({ eventId: eventSessions.eventId })
      .from(eventSessions)
      .where(eq(eventSessions.id, sessionId))
      .limit(1);

    const eventId = sessRecord?.eventId || 1;

    // 2. Fetch or create ticket types per section
    const sectionTicketTypeMap = new Map<number, number>();

    for (const sec of sections) {
      const existingTypes = await db
        .select()
        .from(ticketTypes)
        .where(
          and(
            eq(ticketTypes.sessionId, sessionId),
            eq(ticketTypes.sectionId, sec.id)
          )
        );

      if (existingTypes.length > 0) {
        sectionTicketTypeMap.set(sec.id, existingTypes[0].id);
      } else {
        const secSeats = allSeats.filter((s) => s.sectionId === sec.id);
        const pricePaise = defaultPriceRupees
          ? Math.round(defaultPriceRupees * 100)
          : sec.basePrice;

        const [newType] = await db
          .insert(ticketTypes)
          .values({
            eventId,
            sessionId,
            sectionId: sec.id,
            name: sec.name,
            nameMr: sec.nameMr,
            price: pricePaise,
            totalQuota: secSeats.length,
            availableQuota: secSeats.filter((s) => s.isBlocked === 0).length,
            isSeated: 1,
          })
          .returning();

        sectionTicketTypeMap.set(sec.id, newType.id);
      }
    }

    // 3. Fetch existing inventory for this session to prevent duplicates
    const existingInventory = await db
      .select({ seatId: seatInventory.seatId })
      .from(seatInventory)
      .where(eq(seatInventory.sessionId, sessionId));

    const existingSeatIdSet = new Set(existingInventory.map((i) => i.seatId));

    // 4. Insert missing seats into inventory
    const inventoryToInsert: any[] = [];
    for (const seat of allSeats) {
      if (!existingSeatIdSet.has(seat.id)) {
        const ticketTypeId = sectionTicketTypeMap.get(seat.sectionId);
        if (ticketTypeId) {
          inventoryToInsert.push({
            sessionId,
            seatId: seat.id,
            ticketTypeId,
            status: seat.isBlocked === 1 ? 'blocked' : 'available',
          });
        }
      }
    }

    if (inventoryToInsert.length > 0) {
      await db.insert(seatInventory).values(inventoryToInsert);
    }

    return {
      createdCount: inventoryToInsert.length,
      totalSeats: allSeats.length,
    };
  } catch (error) {
    console.error('Error generating session inventory:', error);
    throw error;
  }
}

