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
  venues,
} from '../db/schema.ts';
import { eq, and, sql, inArray, lt, or, ne, isNull, gte } from 'drizzle-orm';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { PricingBreakdown } from './types.ts';
import { getTicketShareUrl } from './public-url.ts';
import { sendBookingTicketEmail } from './email-service.ts';
import { generateSecureTicketQr, generateSecureGroupOrderQr } from './ticket-crypto.ts';
import {
  clearSeatsHeldInCache,
  markSeatsHeldInCache,
  sessionSeatsCacheKey,
  cacheDel,
} from './redis.ts';

function getTicketSecret(): string {
  return process.env.TICKET_SECRET || 'mahaticket_secure_signing_key_2026';
}

const TICKET_SECRET = getTicketSecret();
const HOLD_DURATION_MINUTES = 5;
export const CHECKOUT_HOLD_EXTENSION_MINUTES = 10;
const MAX_SEATS_PER_BOOKING = 5;
export {
  generateSecureHoldToken,
  isValidHoldTokenFormat,
  HOLD_TOKEN_PREFIX,
} from './hold-token.ts';
import { generateSecureHoldToken } from './hold-token.ts';

/**
 * Immediately release held seats for a user session/token on back/cancel/discard
 */
export async function releaseSeatsHold(
  sessionId: number,
  holdToken: string,
  seatIds?: number[]
): Promise<number> {
  try {
    if (!holdToken || !String(holdToken).trim()) {
      return 0;
    }

    const conditions = [
      eq(seatInventory.sessionId, sessionId),
      eq(seatInventory.status, 'held'),
      eq(seatInventory.heldByUserId, String(holdToken)),
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
      .returning({ id: seatInventory.id, seatId: seatInventory.seatId });

    if (result.length > 0) {
      await clearSeatsHeldInCache(
        sessionId,
        result.map((r) => r.seatId)
      ).catch(() => undefined);
    }

    // Always invalidate session seats cache on any release call
    await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);

    return result.length;
  } catch (error) {
    console.error('Error releasing held seats:', error);
    await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);
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

    if (result.length > 0) {
      await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);
    }

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
      const used = Number(c.usedCount) || 0;
      const limit = c.usageLimit != null ? Number(c.usageLimit) : null;
      const withinUsage = limit == null || used < limit;
      const now = Date.now();
      const startsOk = !c.startsAt || new Date(c.startsAt).getTime() <= now;
      const endsOk = !c.endsAt || new Date(c.endsAt).getTime() >= now;
      if (withinUsage && startsOk && endsOk && grossSubtotal >= c.minOrderValue) {
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
 * Atomically create a temporary reservation/hold for selected seats (single DB transaction).
 */
export async function createTemporarySeatHold(params: {
  sessionId: number;
  seatIds: number[];
  /** @deprecated Ignored — hold ownership is the server-issued holdToken only */
  userIdStr?: string;
}) {
  const { sessionId, seatIds } = params;

  if (!seatIds || seatIds.length === 0) {
    throw new Error('Please select at least one seat.');
  }

  const [holdSession] = await db
    .select()
    .from(eventSessions)
    .where(eq(eventSessions.id, sessionId))
    .limit(1);
  if (!holdSession) {
    throw new Error('Showtime not found.');
  }
  const { isSessionBookable } = await import('@/src/lib/session-lifecycle.ts');
  if (!isSessionBookable(holdSession)) {
    throw new Error('हे शो संपले आहे / बुकिंग बंद आहे (This showtime is no longer bookable).');
  }

  const sortedSeatIds = [...seatIds].sort((a, b) => a - b);

  if (sortedSeatIds.length > MAX_SEATS_PER_BOOKING) {
    throw new Error(`Maximum ${MAX_SEATS_PER_BOOKING} seats allowed per booking. Please select up to 5 seats.`);
  }

  const holdToken = generateSecureHoldToken();
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);
  const now = new Date();

  const txResult = await db.transaction(async (tx) => {
    await tx
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
      );

    const sessionInventories = await tx
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
          inArray(seatInventory.seatId, sortedSeatIds)
      )
    );

    if (sessionInventories.length < sortedSeatIds.length) {
      throw new Error('One or more selected seats are not available in this show. Please select valid seats.');
  }

  for (const inv of sessionInventories) {
    if (inv.status === 'booked') {
      throw new Error(`Seat ${inv.seatCode} is already booked.`);
    }
      if (inv.status === 'held' && inv.heldBy !== holdToken) {
      if (inv.holdExpires && new Date(inv.holdExpires) > now) {
        throw new Error(`Seat ${inv.seatCode} is currently held by another user.`);
      }
    }
  }

    const heldRows = await tx
    .update(seatInventory)
    .set({
      status: 'held',
        heldByUserId: holdToken,
      holdExpiresAt: expiresAt,
    })
    .where(
      and(
        eq(seatInventory.sessionId, sessionId),
          inArray(seatInventory.seatId, sortedSeatIds),
          or(
            eq(seatInventory.status, 'available'),
            lt(seatInventory.holdExpiresAt, now),
            and(eq(seatInventory.status, 'held'), eq(seatInventory.heldByUserId, holdToken))
          ),
          ne(seatInventory.status, 'booked')
        )
      )
      .returning({ seatId: seatInventory.seatId });

    if (heldRows.length < sortedSeatIds.length) {
      throw new Error(
        'One or more selected seats were just reserved by another customer. Please select different seats.'
      );
    }

  const faceValueTotal = sessionInventories.reduce((sum, item) => sum + item.price, 0);

  return {
      heldSeatIds: heldRows.map((r) => r.seatId).sort((a, b) => a - b),
    heldSeats: sessionInventories.map((i) => ({
      seatId: i.seatId,
      seatCode: i.seatCode,
      price: i.price,
      tier: i.tier,
    })),
      faceValueTotal,
    };
  });

  const heldIds = txResult.heldSeatIds;
  await markSeatsHeldInCache(sessionId, heldIds, holdToken, HOLD_DURATION_MINUTES * 60).catch(
    () => undefined
  );
  await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);

  return {
    holdToken,
    heldSeatIds: heldIds,
    heldSeats: txResult.heldSeats,
    holdExpiresAt: expiresAt.toISOString(),
    expiresInSeconds: HOLD_DURATION_MINUTES * 60,
    faceValueTotal: txResult.faceValueTotal,
  };
}

/**
 * Extend checkout hold and bind seats to a pending platform order (transactional, token-gated).
 */
export async function extendHoldForCheckout(params: {
  sessionId: number;
  seatIds: number[];
  holdToken: string;
  pendingOrderId: number;
}): Promise<{ extendedCount: number; holdExpiresAt: Date }> {
  const { sessionId, holdToken, pendingOrderId } = params;
  const sortedSeatIds = [...params.seatIds].sort((a, b) => a - b);
  const now = new Date();
  const holdExpiresAt = new Date(Date.now() + CHECKOUT_HOLD_EXTENSION_MINUTES * 60 * 1000);

  const extendedCount = await db.transaction(async (tx) => {
    await tx
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
      );

    const rows = await tx
      .select({
        seatId: seatInventory.seatId,
        status: seatInventory.status,
        heldBy: seatInventory.heldByUserId,
        holdExpires: seatInventory.holdExpiresAt,
      })
      .from(seatInventory)
      .where(
        and(
          eq(seatInventory.sessionId, sessionId),
          inArray(seatInventory.seatId, sortedSeatIds)
        )
      );

    if (rows.length < sortedSeatIds.length) {
      throw new Error('One or more selected seats are not available. Please refresh the seat map.');
    }

    for (const seat of rows) {
      if (seat.status === 'booked') {
        throw new Error('One or more seats are already booked');
      }
      const isExpired = seat.holdExpires && new Date(seat.holdExpires) < now;
      if (seat.status === 'held' && !isExpired && seat.heldBy !== holdToken) {
        throw new Error('One or more seats are currently held by another customer');
      }
      if (seat.status === 'available') {
        throw new Error('Seat hold expired or missing. Please select seats again.');
      }
    }

    const updated = await tx
      .update(seatInventory)
      .set({
        status: 'held',
        heldByUserId: holdToken,
        holdExpiresAt,
        orderId: pendingOrderId,
      })
      .where(
        and(
          eq(seatInventory.sessionId, sessionId),
          inArray(seatInventory.seatId, sortedSeatIds),
          eq(seatInventory.status, 'held'),
          eq(seatInventory.heldByUserId, holdToken),
          or(isNull(seatInventory.holdExpiresAt), gte(seatInventory.holdExpiresAt, now))
        )
      )
      .returning({ id: seatInventory.id });

    if (updated.length < sortedSeatIds.length) {
      throw new Error('One or more seats are currently held by another customer');
    }

    return updated.length;
  });

  await markSeatsHeldInCache(
    sessionId,
    sortedSeatIds,
    holdToken,
    CHECKOUT_HOLD_EXTENSION_MINUTES * 60
  ).catch(() => undefined);
  await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => undefined);

  return { extendedCount, holdExpiresAt };
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
      const existingOrder = existingOrders[0];
      if (existingOrder.userId !== userId && existingOrder.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
        throw new Error('Unauthorized: Booking order belongs to another customer.');
      }

      const existingTickets = await db
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, existingOrders[0].id));

      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      const [existingSession] = await db
        .select()
        .from(eventSessions)
        .where(eq(eventSessions.id, existingOrder.sessionId || sessionId))
        .limit(1);

      let existingVenue: any = null;
      if (existingEvent?.venueId) {
        const [v] = await db.select().from(venues).where(eq(venues.id, existingEvent.venueId));
        existingVenue = v;
      }

      return {
        order: existingOrders[0],
        tickets: existingTickets,
        event: existingEvent
          ? { ...existingEvent, venue: existingVenue }
          : existingEvent,
        venue: existingVenue,
        session: existingSession
          ? {
              ...existingSession,
              sessionStartTime: existingSession.sessionStartTime,
              venue: existingVenue,
            }
          : { id: existingOrder.sessionId || sessionId, venue: existingVenue },
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

  let venueRecord: any = null;
  if (eventRecord.venueId) {
    const [v] = await db.select().from(venues).where(eq(venues.id, eventRecord.venueId));
    venueRecord = v;
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
    throw new Error('Cannot confirm: One or more requested seats are missing or invalid.');
  }

  const effectiveSeatIds = currentSeats.map((s) => s.seatId);

  for (const s of currentSeats) {
    if (s.status === 'booked') {
      throw new Error(`Cannot confirm: Seat ${s.seatCode} has already been purchased.`);
    }
  }

  // 4. Update existing pending order OR create new authoritative Order
  let order: any = null;
  if (paymentDetails.razorpayOrderId) {
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, paymentDetails.razorpayOrderId))
      .limit(1);

    if (pendingOrders.length > 0) {
      const pending = pendingOrders[0];
      const [updatedOrder] = await db
        .update(orders)
        .set({
          userId,
          userEmail,
          userPhone,
          userName,
          paymentStatus: 'captured',
          orderStatus: 'confirmed',
          razorpayPaymentId: paymentDetails.razorpayPaymentId || pending.razorpayPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, pending.id))
        .returning();
      order = updatedOrder;
    }
  }

  if (!order) {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `MT-${new Date().getFullYear()}-${randomSuffix}`;

    const [newOrder] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId,
      userEmail,
      userPhone,
      userName,
      eventId,
      sessionId,
        ticketCount: pricing.ticketCount || seatIds.length || 1,
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
    order = newOrder;
  }

  // 5. Update seat inventory to 'booked' (never overwrite seats booked by another order)
  const bookedSeatUpdate = await db
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
        inArray(seatInventory.seatId, effectiveSeatIds.length > 0 ? effectiveSeatIds : seatIds),
        or(
          ne(seatInventory.status, 'booked'),
          eq(seatInventory.orderId, order.id)
        )
      )
    )
    .returning({ seatId: seatInventory.seatId });

  if (bookedSeatUpdate.length < (effectiveSeatIds.length || seatIds.length)) {
    throw new Error('Cannot confirm: one or more seats are no longer available.');
  }

  // 5b. Deduct available_quota in ticket_types for each booked seat
  for (const s of currentSeats) {
    if (s.ticketTypeId) {
      try {
        await db
          .update(ticketTypes)
          .set({
            availableQuota: sql`GREATEST(0, ${ticketTypes.availableQuota} - 1)`,
          })
          .where(eq(ticketTypes.id, s.ticketTypeId));
      } catch (quotaErr) {
        console.warn('[Booking] Could not deduct ticket type quota:', quotaErr);
      }
    }
  }

  // 5c. Sync event session status if all seats in session are sold out
  try {
    const [availCheck] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(seatInventory)
      .where(and(eq(seatInventory.sessionId, sessionId), eq(seatInventory.status, 'available')));
    if (availCheck && Number(availCheck.count) === 0) {
      await db
        .update(eventSessions)
        .set({ status: 'sold_out' })
        .where(eq(eventSessions.id, sessionId));
    }
  } catch (sessStatusErr) {
    console.warn('[Booking] Could not update session sold_out status:', sessStatusErr);
  }

  // 5d. Generate ONE Authoritative Group Order QR (for 1 to 5 seats)
  const groupQrPayload = generateSecureGroupOrderQr(order.orderNumber, order.id, eventId, currentSeats.length);
  const groupQrDataUrl = await QRCode.toDataURL(groupQrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  // 6. Generate individual tickets with QR codes & HMAC SHA-256 signatures (Idempotent)
  const generatedTickets: any[] = [];
  const existingOrderTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.orderId, order.id));

  if (existingOrderTickets.length > 0) {
    for (const t of existingOrderTickets) {
      generatedTickets.push({
        ...t,
        qrDataUrl: groupQrDataUrl,
        groupQrPayload,
        groupQrDataUrl,
      });
    }
  } else {
  for (let idx = 0; idx < currentSeats.length; idx++) {
    const s = currentSeats[idx];
      const ticketCode = `MT-TK-${order.id}-${s.seatCode.replace(/[^A-Za-z0-9]/g, '')}-${idx + 1}`;

    // Cryptographic signature: HMAC SHA256 of ticketCode + eventId + sessionId + seatCode
    const rawData = `${ticketCode}|${eventId}|${sessionId}|${s.seatCode}|${userName}`;
    const securityHash = crypto
      .createHmac('sha256', TICKET_SECRET)
      .update(rawData)
      .digest('hex');

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
          qrPayload: groupQrPayload,
        status: 'valid',
      })
      .returning();

    generatedTickets.push({
      ...ticketRecord,
        qrDataUrl: groupQrDataUrl,
        groupQrPayload,
        groupQrDataUrl,
    });
    }
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
      coupon: pricing.appliedCoupon || null,
    }),
  });
  } catch (auditErr) {
    console.warn('[Booking] Audit log notice:', auditErr);
  }

  // 8b. Increment coupon used_count once per successful confirm (idempotent retries skip via early return)
  if (pricing.appliedCoupon) {
    try {
      await db
        .update(coupons)
        .set({
          usedCount: sql`COALESCE(${coupons.usedCount}, 0) + 1`,
        })
        .where(
          and(
            eq(coupons.code, pricing.appliedCoupon),
            eq(coupons.active, 1),
            or(
              isNull(coupons.usageLimit),
              sql`COALESCE(${coupons.usedCount}, 0) < ${coupons.usageLimit}`
            )
          )
        );
    } catch (couponErr) {
      console.warn('[Booking] Coupon used_count update notice:', couponErr);
    }
  }

  // 9. Do NOT auto-email on booking confirm.
  // PDF email is user-triggered only (TicketPassModal / MahaTicketPass / BookingConfirmed "Email PDF").
  // Set BOOKING_AUTO_EMAIL=1 only if ops explicitly want post-payment mail again.
  if (
    process.env.BOOKING_AUTO_EMAIL === '1' &&
    generatedTickets.length > 0 &&
    userEmail
  ) {
    try {
      const emailResult = await Promise.race([
        sendBookingTicketEmail({
          ticketCode: generatedTickets[0].ticketCode,
          recipientEmail: userEmail,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 18000)),
      ]);
      if (!emailResult) {
        console.warn('[Booking] Email dispatch timed out after 18s (PDF may be missing)');
      } else if (!emailResult.attached) {
        console.warn('[Booking] Email sent without PDF attachment:', emailResult.message || emailResult.error);
      } else {
        console.log('[Booking] Email+PDF attached OK:', emailResult.recipient);
      }
    } catch (emailErr) {
      console.warn('[Booking] Email dispatch error:', emailErr);
    }
  }

  // Invalidate Redis/memory seats cache immediately so newly booked seats are reflected
  await cacheDel(sessionSeatsCacheKey(sessionId)).catch(() => null);

  const seatCodesList = currentSeats.map((s) => s.seatCode);

  // Load booked session so ticket pass always has authoritative date/time
  const [sessionRecord] = await db
    .select()
    .from(eventSessions)
    .where(eq(eventSessions.id, sessionId))
    .limit(1);

  return {
    order: {
      ...order,
      groupQrPayload,
      groupQrDataUrl,
      seatCodes: seatCodesList,
      sessionId,
      session: sessionRecord
        ? {
            id: sessionRecord.id,
            sessionStartTime: sessionRecord.sessionStartTime,
            venue: venueRecord,
          }
        : undefined,
    },
    tickets: generatedTickets,
    event: {
      ...eventRecord,
      venue: venueRecord,
    },
    venue: venueRecord,
    session: sessionRecord
      ? {
          ...sessionRecord,
          sessionStartTime: sessionRecord.sessionStartTime,
          venue: venueRecord,
        }
      : {
          id: sessionId,
          venue: venueRecord,
        },
    organizer: organizerRecord,
    pricing,
    groupQrPayload,
    groupQrDataUrl,
    seatCodes: seatCodesList,
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
    let sections = await db
      .select()
      .from(venueSections)
      .where(eq(venueSections.venueId, venueId));

    if (sections.length === 0) {
      // Auto-provision default 3-tier sections for this venue
      const defaultSections = [
        { name: 'Balcony', nameMr: 'बाल्कनी', rowsCount: 2, colsCount: 10, basePrice: 50000, accessible: 0 },
        { name: 'First Class', nameMr: 'प्रथम वर्ग', rowsCount: 2, colsCount: 10, basePrice: 35000, accessible: 0 },
        { name: 'Stall', nameMr: 'स्टॉल', rowsCount: 3, colsCount: 10, basePrice: 20000, accessible: 0 },
      ];
      for (const s of defaultSections) {
        await db.insert(venueSections).values({
          venueId,
          ...s,
        });
      }
      sections = await db.select().from(venueSections).where(eq(venueSections.venueId, venueId));
    }

    let allSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.venueId, venueId));

    if (allSeats.length === 0) {
      // Auto-provision physical seats based on venue sections
      const seatsToInsert: any[] = [];
      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      let rowIndex = 0;
      for (const sec of sections) {
        const tier = sec.basePrice >= 40000 ? 'platinum' : sec.basePrice >= 30000 ? 'gold' : 'silver';
        for (let r = 0; r < sec.rowsCount; r++) {
          const rowLabel = rowLetters[rowIndex % rowLetters.length];
          rowIndex++;
          for (let c = 1; c <= sec.colsCount; c++) {
            seatsToInsert.push({
              venueId,
              sectionId: sec.id,
              rowLabel,
              seatNumber: c,
              seatCode: `${rowLabel}${c < 10 ? '0' + c : c}`,
              tier,
              isAccessible: c === 1 ? 1 : 0,
              isBlocked: 0,
            });
          }
        }
      }
      if (seatsToInsert.length > 0) {
        await db.insert(seats).values(seatsToInsert);
        allSeats = await db.select().from(seats).where(eq(seats.venueId, venueId));
      }
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

