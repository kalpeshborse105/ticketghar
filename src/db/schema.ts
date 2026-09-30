import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users & Roles
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or Auth token
  email: text('email').notNull(),
  fullName: text('full_name').notNull().default('Guest User'),
  phoneNumber: text('phone_number'),
  role: text('role').notNull().default('customer'), // 'customer' | 'super_admin' | 'operations' | 'finance' | 'scanner'
  preferredLanguage: text('preferred_language').notNull().default('mr'), // 'mr' | 'en'
  city: text('city').notNull().default('Pune'),
  passwordHash: text('password_hash'),
  otpCode: text('otp_code'),
  otpExpiresAt: timestamp('otp_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Organizers (MVP - manually verified by company)
export const organizers = pgTable('organizers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  companyName: text('company_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull().default('Pune'),
  verificationStatus: text('verification_status').notNull().default('verified'), // 'pending' | 'verified' | 'rejected'
  commissionType: text('commission_type').notNull().default('percentage'), // 'percentage' | 'flat'
  commissionRate: integer('commission_rate').notNull().default(600), // in basis points: 600 = 6.00%
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'),
  bankIfsc: text('bank_ifsc'),
  panNumber: text('pan_number'),
  gstin: text('gstin'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Venues
export const venues = pgTable('venues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  nameMr: text('name_mr').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull().default('Maharashtra'),
  pincode: text('pincode'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  facilities: text('facilities'), // JSON string array of facilities
  totalCapacity: integer('total_capacity').notNull().default(600),
  hasSeatLayout: integer('has_seat_layout').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Venue Sections (e.g. Balcony, VIP, General)
export const venueSections = pgTable('venue_sections', {
  id: serial('id').primaryKey(),
  venueId: integer('venue_id').references(() => venues.id).notNull(),
  name: text('name').notNull(),
  nameMr: text('name_mr').notNull(),
  rowsCount: integer('rows_count').notNull().default(4),
  colsCount: integer('cols_count').notNull().default(8),
  basePrice: integer('base_price').notNull(), // in paise (e.g. 40000 = ₹400.00)
  accessible: integer('accessible').notNull().default(0),
});

// 5. Seats (Physical seats in a venue section)
export const seats = pgTable('seats', {
  id: serial('id').primaryKey(),
  venueId: integer('venue_id').references(() => venues.id).notNull(),
  sectionId: integer('section_id').references(() => venueSections.id).notNull(),
  rowLabel: text('row_label').notNull(), // "A", "B", "C"
  seatNumber: integer('seat_number').notNull(), // 1, 2, 3
  seatCode: text('seat_code').notNull(), // "BAL-A-01"
  tier: text('tier').notNull().default('standard'), // 'platinum' | 'gold' | 'silver'
  isAccessible: integer('is_accessible').notNull().default(0),
  isBlocked: integer('is_blocked').notNull().default(0),
});

// Cities catalog
export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  nameMr: text('name_mr').notNull(),
  state: text('state').notNull().default('Maharashtra'),
  isActive: integer('is_active').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Events
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  organizerId: integer('organizer_id').references(() => organizers.id).notNull(),
  venueId: integer('venue_id').references(() => venues.id).notNull(),
  title: text('title').notNull(),
  titleMr: text('title_mr').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(), // 'plays' | 'movies' | 'music' | 'comedy' | 'cultural' | 'workshops' | 'sports'
  categoryMr: text('category_mr').notNull(),
  language: text('language').notNull().default('Marathi'),
  ageGuidance: text('age_guidance').notNull().default('U'),
  durationMinutes: integer('duration_minutes').notNull().default(150),
  description: text('description').notNull(),
  descriptionMr: text('description_mr').notNull(),
  posterUrl: text('poster_url').notNull(),
  bannerUrl: text('banner_url'),
  status: text('status').notNull().default('published'), // 'draft' | 'published' | 'unpublish' | 'cancelled'
  featured: integer('featured').notNull().default(0),
  castCrew: text('cast_crew'),
  convenienceFeeType: text('convenience_fee_type').notNull().default('flat'),
  convenienceFeeValue: integer('convenience_fee_value').notNull().default(3000), // in paise (3000 = ₹30)
  gstPercent: integer('gst_percent').notNull().default(18), // 18% on convenience fee
  cancellationPolicy: text('cancellation_policy').notNull().default('cancellable_up_to_4hr'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Event Sessions (Showtimes / dates)
export const eventSessions = pgTable('event_sessions', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  sessionStartTime: timestamp('session_start_time').notNull(),
  sessionEndTime: timestamp('session_end_time').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'cancelled' | 'completed' | 'sold_out'
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Ticket Types (Pricing categories for a session)
export const ticketTypes = pgTable('ticket_types', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  sessionId: integer('session_id').references(() => eventSessions.id).notNull(),
  sectionId: integer('section_id').references(() => venueSections.id),
  name: text('name').notNull(),
  nameMr: text('name_mr').notNull(),
  price: integer('price').notNull(), // face value in paise (e.g. 50000 = ₹500)
  totalQuota: integer('total_quota').notNull(),
  availableQuota: integer('available_quota').notNull(),
  isSeated: integer('is_seated').notNull().default(1),
});

// 9. Seat Inventory (Per-session authoritative availability)
export const seatInventory = pgTable('seat_inventory', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => eventSessions.id).notNull(),
  seatId: integer('seat_id').references(() => seats.id).notNull(),
  ticketTypeId: integer('ticket_type_id').references(() => ticketTypes.id).notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'held' | 'booked' | 'blocked'
  heldByUserId: text('held_by_user_id'),
  holdExpiresAt: timestamp('hold_expires_at'),
  orderId: integer('order_id'),
});

// 10. Orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(), // e.g. "TG-2026-94812"
  userId: integer('user_id').references(() => users.id).notNull(),
  userEmail: text('user_email').notNull(),
  userPhone: text('user_phone').notNull(),
  userName: text('user_name').notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  sessionId: integer('session_id').references(() => eventSessions.id).notNull(),
  ticketCount: integer('ticket_count').notNull(),
  ticketFaceValueTotal: integer('ticket_face_value_total').notNull(), // in paise
  platformFeeTotal: integer('platform_fee_total').notNull(), // in paise
  taxTotal: integer('tax_total').notNull(), // in paise (GST on platform fee)
  gatewayCostEstimate: integer('gateway_cost_estimate').notNull(), // in paise
  discountTotal: integer('discount_total').notNull().default(0),
  grandTotal: integer('grand_total').notNull(), // in paise
  currency: text('currency').notNull().default('INR'),
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'captured' | 'failed' | 'refunded'
  orderStatus: text('order_status').notNull().default('pending'), // 'pending' | 'confirmed' | 'cancelled' | 'expired'
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  idempotencyKey: text('idempotency_key').unique(),
  holdExpiresAt: timestamp('hold_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. Tickets
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketCode: text('ticket_code').notNull().unique(), // e.g. "TG-TK-84920"
  orderId: integer('order_id').references(() => orders.id).notNull(),
  sessionId: integer('session_id').references(() => eventSessions.id).notNull(),
  ticketTypeId: integer('ticket_type_id').references(() => ticketTypes.id).notNull(),
  seatId: integer('seat_id').references(() => seats.id),
  seatCode: text('seat_code').notNull().default('General Admission'),
  attendeeName: text('attendee_name').notNull(),
  faceValue: integer('face_value').notNull(),
  securityHash: text('security_hash').notNull(), // server signature
  qrPayload: text('qr_payload').notNull(), // compact verifier string
  status: text('status').notNull().default('valid'), // 'valid' | 'used' | 'cancelled' | 'refunded'
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. Ticket Scans (Server-side validation log)
export const ticketScans = pgTable('ticket_scans', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => tickets.id).notNull(),
  ticketCode: text('ticket_code').notNull(),
  scannedByUserId: integer('scanned_by_user_id').references(() => users.id),
  scannerDevice: text('scanner_device'),
  scanResult: text('scan_result').notNull(), // 'SUCCESS' | 'ALREADY_USED' | 'INVALID_SESSION' | 'TICKET_CANCELLED'
  gateName: text('gate_name').notNull().default('Main Entry Gate 1'),
  scannedAt: timestamp('scanned_at').defaultNow(),
});

// 13. Settlement Ledger (Separating ticket value, platform fee, gateway cost, taxes, organizer net)
export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  settlementReference: text('settlement_reference').notNull().unique(), // "SETTLE-2026-001"
  organizerId: integer('organizer_id').references(() => organizers.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  totalGrossTicketSales: integer('total_gross_ticket_sales').notNull(), // in paise
  totalPlatformFeesCollected: integer('total_platform_fees_collected').notNull(), // in paise
  totalPaymentGatewayCost: integer('total_payment_gateway_cost').notNull(), // in paise
  totalTaxCollected: integer('total_tax_collected').notNull(), // in paise
  platformCommissionEarned: integer('platform_commission_earned').notNull(), // in paise
  totalRefundDeductions: integer('total_refund_deductions').notNull().default(0), // in paise
  netPayableToOrganizer: integer('net_payable_to_organizer').notNull(), // in paise
  status: text('status').notNull().default('pending'), // 'pending' | 'in_process' | 'settled' | 'disputed'
  payoutUtr: text('payout_utr'),
  settledAt: timestamp('settled_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Partner With Us (Organizer MVP lead funnel)
export const partnerLeads = pgTable('partner_leads', {
  id: serial('id').primaryKey(),
  organizerName: text('organizer_name').notNull(),
  companyName: text('company_name').notNull(),
  mobile: text('mobile').notNull(),
  email: text('email').notNull(),
  eventName: text('event_name').notNull(),
  category: text('category').notNull(),
  city: text('city').notNull(),
  venuePreference: text('venue_preference'),
  proposedDate: text('proposed_date'),
  expectedCapacity: integer('expected_capacity'),
  ticketPriceRange: text('ticket_price_range'),
  websiteOrSocial: text('website_or_social'),
  message: text('message'),
  status: text('status').notNull().default('new'), // 'new' | 'contacted' | 'verified' | 'declined'
  createdAt: timestamp('created_at').defaultNow(),
});

// 15. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. Coupons / Offers
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull().default('percentage'),
  discountValue: integer('discount_value').notNull(), // 1500 = 15% or ₹5000 = ₹50
  minOrderValue: integer('min_order_value').notNull().default(0),
  maxDiscount: integer('max_discount').notNull().default(10000), // in paise
  usageLimit: integer('usage_limit'),
  perUserLimit: integer('per_user_limit').default(1),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  eventId: integer('event_id'),
  city: text('city'),
  usedCount: integer('used_count').default(0),
  active: integer('active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 17. Announcements
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  imageUrl: text('image_url'),
  ctaLabel: text('cta_label'),
  ctaUrl: text('cta_url'),
  city: text('city'),
  category: text('category'),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  active: integer('active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 18. Device tokens (FCM)
export const deviceTokens = pgTable('device_tokens', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid'),
  token: text('token').notNull().unique(),
  platform: text('platform').notNull().default('android'),
  appVersion: text('app_version'),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 19. Notification log (dedupe)
export const notificationLog = pgTable('notification_log', {
  id: serial('id').primaryKey(),
  deviceTokenId: integer('device_token_id'),
  userUid: text('user_uid'),
  notificationType: text('notification_type').notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  dataJson: text('data_json'),
  status: text('status').notNull().default('sent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relational mappings
export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(organizers, {
    fields: [events.organizerId],
    references: [organizers.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  sessions: many(eventSessions),
  ticketTypes: many(ticketTypes),
}));

export const eventSessionsRelations = relations(eventSessions, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSessions.eventId],
    references: [events.id],
  }),
  ticketTypes: many(ticketTypes),
  seatInventory: many(seatInventory),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  sections: many(venueSections),
  seats: many(seats),
  events: many(events),
}));

export const venueSectionsRelations = relations(venueSections, ({ one, many }) => ({
  venue: one(venues, {
    fields: [venueSections.venueId],
    references: [venues.id],
  }),
  seats: many(seats),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [orders.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [orders.sessionId],
    references: [eventSessions.id],
  }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
  session: one(eventSessions, {
    fields: [tickets.sessionId],
    references: [eventSessions.id],
  }),
  seat: one(seats, {
    fields: [tickets.seatId],
    references: [seats.id],
  }),
  scans: many(ticketScans),
}));
