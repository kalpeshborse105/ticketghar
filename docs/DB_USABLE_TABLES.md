# TicketGhar Database Schema Audit
**Generated:** October 20, 2026  
**Source:** Code analysis of web APIs (`app/api/**`) + mobile API (`mobile/src/api/index.ts`)  
**Schema:** `src/db/schema.ts` + migration files

---

## Keep (Actively Used Tables)

### Core Booking Flow
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **users** | `id`, `uid`, `email`, `full_name`, `phone_number`, `role`, `city`, `preferred_language`, `password_hash`, `otp_code`, `otp_expires_at`, `status`, `assigned_events`, `organizer_id` | **Web:** `/api/auth/flow/*` (session, profile, login, otp), `/api/admin/users`, `/api/admin/me`, `/api/bookings/confirm`, `/api/payments/verify`, `/api/scanner/verify`<br>**Mobile:** Auth flow, profile management |
| **organizers** | `id`, `name`, `company_name`, `email`, `phone`, `city`, `verification_status`, `status`, `commission_type`, `commission_rate`, `bank_name`, `bank_account_number`, `bank_ifsc` | **Web:** `/api/events/*` (join), `/api/admin/organizers`, `/api/admin/settlements`<br>**Mobile:** Event metadata (organizer info) |
| **events** | `id`, `organizer_id`, `venue_id`, `title`, `title_mr`, `slug`, `category`, `category_mr`, `language`, `age_guidance`, `duration_minutes`, `description`, `description_mr`, `poster_url`, `banner_url`, `status`, `featured`, `tag`, `cast_crew`, `convenience_fee_type`, `convenience_fee_value`, `gst_percent`, `cancellation_policy` | **Web:** `/api/events`, `/api/events/[id]`, `/api/admin/events`, `/api/orders`, `/api/tickets/[ticketCode]/*`, `/api/admin/dashboard`, `/api/admin/settlements`, `/api/admin/refunds`<br>**Mobile:** Home screen, event details, search, booking flow |
| **venues** | `id`, `district_id`, `city_id`, `name`, `name_mr`, `address`, `city`, `state`, `pincode`, `latitude`, `longitude`, `facilities`, `total_capacity`, `has_seat_layout`, `verification_status`, `is_template`, `ownership_type`, `layout_config` | **Web:** `/api/venues`, `/api/venues/[id]`, `/api/admin/venues`, `/api/events/*` (join), `/api/tickets/[ticketCode]/*`<br>**Mobile:** Venue listing, event details |
| **venue_sections** | `id`, `venue_id`, `name`, `name_mr`, `rows_count`, `cols_count`, `base_price`, `accessible` | **Web:** `/api/sessions/[sessionId]/seats`, `/api/admin/venues`, inventory engine<br>**Mobile:** Seat map rendering |
| **seats** | `id`, `venue_id`, `section_id`, `row_label`, `seat_number`, `seat_code`, `tier`, `is_accessible`, `is_blocked` | **Web:** `/api/sessions/[sessionId]/seats`, `/api/admin/venues`, inventory engine<br>**Mobile:** Seat selection UI |
| **event_sessions** | `id`, `event_id`, `session_start_time`, `session_end_time`, `status`, `created_at` | **Web:** `/api/events/*`, `/api/sessions/[sessionId]/seats`, `/api/admin/refunds`, `/api/bookings/*`, `/api/orders/*`<br>**Mobile:** Show timings, session picker |
| **ticket_types** | `id`, `event_id`, `session_id`, `section_id`, `name`, `name_mr`, `price`, `total_quota`, `available_quota`, `is_seated` | **Web:** `/api/events/*`, `/api/sessions/[sessionId]/seats`, `/api/payments/create-order`, inventory engine<br>**Mobile:** Pricing display, quota checks |
| **seat_inventory** | `id`, `session_id`, `seat_id`, `ticket_type_id`, `status`, `held_by_user_id`, `hold_expires_at`, `order_id` | **Web:** `/api/sessions/[sessionId]/seats`, `/api/payments/create-order`, `/api/bookings/hold`, `/api/bookings/release`, `/api/payments/webhook`, inventory engine<br>**Mobile:** Real-time seat availability, hold management |
| **orders** | `id`, `order_number`, `user_id`, `user_email`, `user_phone`, `user_name`, `event_id`, `session_id`, `ticket_count`, `ticket_face_value_total`, `platform_fee_total`, `tax_total`, `gateway_cost_estimate`, `discount_total`, `grand_total`, `currency`, `payment_status`, `order_status`, `razorpay_order_id`, `razorpay_payment_id`, `idempotency_key`, `hold_expires_at`, `created_at`, `updated_at` | **Web:** `/api/orders`, `/api/admin/orders`, `/api/admin/dashboard`, `/api/payments/webhook`, `/api/orders/[id]/refund`, `/api/admin/refunds`, `/api/events/[id]/reviews` (join)<br>**Mobile:** My Orders, order history, payment verification |
| **tickets** | `id`, `ticket_code`, `order_id`, `session_id`, `ticket_type_id`, `seat_id`, `seat_code`, `attendee_name`, `face_value`, `security_hash`, `qr_payload`, `status`, `created_at` | **Web:** `/api/tickets/[ticketCode]/*`, `/api/admin/tickets`, `/api/scanner/verify`, `/api/orders/*`, `/api/admin/refunds`, inventory engine<br>**Mobile:** My Tickets, QR display, scanner verification |
| **ticket_scans** | `id`, `ticket_id`, `ticket_code`, `scanned_by_user_id`, `scanner_device`, `scan_result`, `gate_name`, `scanned_at` | **Web:** `/api/scanner/verify`, `/api/admin/tickets`, `/api/admin/dashboard`<br>**Mobile:** Scanner app (gate entry tracking) |

### Location Master (Maharashtra Districts/Cities)
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **districts** | `id`, `code`, `name`, `name_mr`, `division`, `division_mr`, `state`, `is_active` | **Web:** `/api/locations/districts`, `/api/admin/venues` (join)<br>**Mobile:** Location pickers |
| **talukas** | `id`, `district_id`, `name`, `name_mr`, `is_active` | **Web:** `/api/locations/talukas`<br>**Mobile:** Location filters |
| **cities** | `id`, `district_id`, `taluka_id`, `name`, `name_mr`, `state`, `is_popular`, `is_active`, `sort_order` | **Web:** `/api/cities`, `/api/locations/cities`, `/api/admin/venues` (join)<br>**Mobile:** City selector, event filtering |

### Financial & Settlement
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **settlements** | `id`, `settlement_reference`, `organizer_id`, `event_id`, `total_gross_ticket_sales`, `total_platform_fees_collected`, `total_payment_gateway_cost`, `total_tax_collected`, `platform_commission_earned`, `total_refund_deductions`, `net_payable_to_organizer`, `status`, `payout_utr`, `settled_at` | **Web:** `/api/admin/settlements`, `/api/admin/dashboard`, refund engine, inventory engine<br>**Mobile:** (Admin only – not exposed) |

### Admin & Operations
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **audit_logs** | `id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at` | **Web:** `/api/admin/audit-logs`, ALL admin mutation endpoints (users, events, venues, organizers, coupons, announcements, settlements, refunds, partner leads)<br>**Mobile:** (Not exposed) |
| **coupons** | `id`, `code`, `discount_type`, `discount_value`, `min_order_value`, `max_discount`, `usage_limit`, `per_user_limit`, `starts_at`, `ends_at`, `event_id`, `city`, `used_count`, `active` | **Web:** `/api/coupons`, `/api/admin/coupons`, inventory engine (coupon validation)<br>**Mobile:** Coupon code entry, discount display |
| **announcements** | `id`, `title`, `message`, `image_url`, `cta_label`, `cta_url`, `city`, `category`, `starts_at`, `ends_at`, `active` | **Web:** `/api/announcements`, `/api/admin/announcements`<br>**Mobile:** Home screen banners |
| **partner_leads** | `id`, `organizer_name`, `company_name`, `mobile`, `email`, `event_name`, `category`, `city`, `venue_preference`, `proposed_date`, `expected_capacity`, `ticket_price_range`, `website_or_social`, `message`, `status` | **Web:** `/api/partner-with-us`, `/api/admin/partner-leads`<br>**Mobile:** (Web form only) |

### Push Notifications
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **device_tokens** | `id`, `user_uid`, `token`, `platform`, `app_version`, `last_seen_at` | **Web:** `/api/notifications/register-token`, `/api/notifications/send`<br>**Mobile:** FCM token registration |
| **notification_log** | `id`, `device_token_id`, `user_uid`, `notification_type`, `dedupe_key`, `title`, `body`, `data_json`, `status` | **Web:** `/api/notifications/send`<br>**Mobile:** (Background – deduplication tracking) |

### User-Generated Content
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **event_reviews** | `id`, `event_id`, `user_id`, `user_email`, `user_name`, `city`, `rating`, `comment`, `verified_attendance` | **Web:** `/api/events/[id]/reviews`<br>**Mobile:** Event detail reviews section |
| **event_images** | `id`, `event_id`, `image_url`, `caption`, `caption_mr`, `sort_order`, `is_cover` | **Web:** `/api/events/[id]/images`<br>**Mobile:** Event gallery |

### UI Customization
| Table | Columns Used | Used By |
|-------|-------------|---------|
| **home_sections** | `id`, `section_key`, `title_en`, `title_mr`, `subtitle_en`, `subtitle_mr`, `badge_en`, `badge_mr`, `sort_order`, `is_visible` | **Web:** `/api/sections`, `/api/admin/sections`<br>**Mobile:** Home screen section labels (bilingual) |

---

## Candidates to Drop / Archive

**None identified.** All 25 tables in the schema are actively used by either:
- Web booking flow
- Mobile app API calls
- Admin panel operations
- Background settlement/refund engines

### Notes on Unused Columns (not tables):
- Some optional fields like `rejection_reason`, `trailer_url`, `gallery_urls` in `events` may be sparsely populated but are reserved for future admin workflows.
- `organizer_id` in `users` table is used for organizer-linked admin accounts.
- `assigned_events` in `users` is for manager role event scoping (Phase 2 feature).

---

## Shared Web+Android Contract

### Minimal Event/Session/Seat/Order/Ticket Schema
Both web and mobile clients **must** support these fields for seamless booking:

#### **Event (Browsing & Details)**
```typescript
{
  id: number;
  title: string;
  titleMr: string;           // Marathi title
  slug: string;
  category: string;
  categoryMr: string;
  language: string;
  posterUrl: string;         // Absolute HTTP URL
  bannerUrl?: string;
  status: 'published' | 'cancelled' | 'completed';
  featured: 0 | 1;
  tag?: string;              // "हाऊसफुल्ल" | "सुपरहिट" etc.
  durationMinutes: number;
  venue: {
    id: number;
    name: string;
    nameMr: string;
    address: string;
    city: string;
    totalCapacity: number;
    hasSeatLayout: 0 | 1;
  };
}
```

#### **Session (Show Times)**
```typescript
{
  id: number;
  eventId: number;
  sessionStartTime: string;  // ISO 8601
  sessionEndTime: string;
  status: 'active' | 'cancelled' | 'sold_out';
  ticketTypes: TicketType[];
}
```

#### **Ticket Type (Pricing)**
```typescript
{
  id: number;
  name: string;              // "Balcony", "Stall", "VIP"
  nameMr: string;
  price: number;             // in PAISE (50000 = ₹500)
  totalQuota: number;
  availableQuota: number;
  isSeated: 0 | 1;           // 1 = seat selection required
}
```

#### **Seat (Real-time Availability)**
```typescript
{
  seatId: number;            // DB seat.id
  sectionId: number;
  rowLabel: string;          // "A", "B", "C"
  seatNumber: number;        // 1, 2, 3
  seatCode: string;          // "BAL-A-01"
  price: number;             // in PAISE
  status: 'available' | 'held' | 'booked' | 'blocked';
  tier?: string;             // "platinum" | "gold" | "silver"
}
```

#### **Order (Booking Confirmation)**
```typescript
{
  id: number;
  orderNumber: string;       // "TG-2026-94812"
  eventId: number;
  sessionId: number;
  ticketCount: number;
  ticketFaceValueTotal: number;      // paise
  platformFeeTotal: number;          // paise (₹30 per ticket)
  taxTotal: number;                  // paise (18% GST on platform fee)
  discountTotal: number;             // paise
  grandTotal: number;                // paise
  paymentStatus: 'pending' | 'captured' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'cancelled';
  razorpayOrderId?: string;
  createdAt: string;                 // ISO 8601
}
```

#### **Ticket (QR Code & Entry)**
```typescript
{
  id: number;
  ticketCode: string;        // "TG-TK-84920"
  orderId: number;
  sessionId: number;
  seatCode: string;          // "BAL-A-04" or "General Admission"
  attendeeName: string;
  faceValue: number;         // paise
  qrPayload: string;         // JSON string for scanner verification
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  createdAt: string;
}
```

#### **Pricing Calculation (Apply Coupon)**
```typescript
{
  ticketCount: number;
  ticketFaceValueTotal: number;      // paise
  platformFeeTotal: number;          // paise (convenienceFeeValue from event)
  taxTotal: number;                  // paise (gstPercent from event)
  gatewayCostEstimate: number;       // paise
  discountTotal: number;             // paise (from coupon)
  grandTotal: number;                // paise
  appliedCoupon?: string;
}
```

#### **Razorpay Order Creation**
```typescript
{
  razorpayOrderId: string;   // "order_XYZ123"
  amount: number;            // paise (grandTotal)
  currency: "INR";
  keyId: string;             // RAZORPAY_KEY_ID
  orderDbId: number;         // orders.id
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}
```

---

## Platform Fee / Tax Settings

### Current Implementation (No Separate Table)
**Platform fees and GST are configured per-event** in the `events` table:

```sql
SELECT 
  convenience_fee_type,    -- 'flat' | 'percentage'
  convenience_fee_value,   -- in paise (e.g., 3000 = ₹30 flat or 500 = 5%)
  gst_percent              -- 18 (for 18% GST on platform fee)
FROM events
WHERE id = ?;
```

### Fee Calculation Logic
Location: `src/lib/inventory-engine.ts` → `calculatePricing()`

```typescript
const platformFeeTotal = ticketCount * event.convenienceFeeValue; // paise
const taxTotal = Math.round((platformFeeTotal * event.gstPercent) / 100);
const grandTotal = faceValueTotal + platformFeeTotal + taxTotal - discountTotal + gatewayCost;
```

### Admin Toggle Support
**Current:** Fees are managed per-event via `/api/admin/events` (edit event).

**No global settings table exists.** If you want a **platform-wide default** for new events, consider:

```sql
-- Option 1: Add to schema (future enhancement)
CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, setting_value) VALUES
  ('default_convenience_fee_type', 'flat'),
  ('default_convenience_fee_value', '3000'),  -- ₹30
  ('default_gst_percent', '18');
```

**Recommendation:** Keep current per-event model (more flexible for organizer negotiations). If admin needs global toggle, build UI to bulk-update events or use event template defaults.

---

## Migration Safety Notes

1. **Do NOT drop any tables** – all are in active use by production APIs.
2. **Schema stability:** Current schema supports both web and Android apps with zero breaking changes.
3. **Drizzle ORM:** Schema is defined in `src/db/schema.ts` – any changes must be synced via `drizzle-kit push` or migrations.
4. **Supabase compatibility:** Mobile app uses direct Supabase PostgREST calls (`supabase.from('events')`) – table renames would break mobile clients.
5. **Foreign key integrity:** All joins are actively used (e.g., `events.venue_id → venues.id`).

---

## Audit Summary

| Category | Count | Status |
|----------|-------|--------|
| **Total Tables** | 25 | ✅ All Active |
| **Core Booking** | 11 | ✅ Critical Path |
| **Location Master** | 3 | ✅ Used by Filters |
| **Financial** | 1 | ✅ Admin Settlements |
| **Admin/Ops** | 4 | ✅ Audit + Marketing |
| **Notifications** | 2 | ✅ FCM Push |
| **UGC** | 2 | ✅ Reviews + Gallery |
| **UI Config** | 1 | ✅ Home Sections |
| **Legacy/Unused** | 0 | ✅ None Found |

**Conclusion:** Database schema is lean, actively used, and well-structured. No cleanup needed. All tables serve production features across web and mobile platforms.
