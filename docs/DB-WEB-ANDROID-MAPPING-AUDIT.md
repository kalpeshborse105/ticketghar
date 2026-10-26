# MahaTicket — DB ↔ Web ↔ Android Mapping Audit

**Date:** 2026-10-26  
**Source of truth:** `src/db/schema.ts` (Drizzle)  
**Compare:** `supabase/schema.sql` (lagging dump)  
**Scope:** tables/columns used vs unused, web vs Android differences, duplicate APIs, responsive vs Android-first gaps, bug list  

---

## 1. Executive summary

| Area | Verdict |
|------|---------|
| Tables in Drizzle | **25** — all have at least some API/lib usage |
| `schema.sql` dump | **22 tables** — missing 3 tables + some columns |
| Critical mismatches | Mobile phantom event fields; role `admin` vs `super_admin`; dual auth/booking paths |
| Unused columns | `users.assigned_events`, `coupons.used_count`, `events.rejection_reason`, `events.cancellation_policy` (mostly) |
| Web vs Android DB | Same Postgres via Next API for booking-critical paths; Android still has Supabase REST **fallbacks** that invent fields |

---

## 2. Schema dump drift (`schema.ts` vs `supabase/schema.sql`)

| Item | `schema.ts` | `schema.sql` | Risk |
|------|-------------|--------------|------|
| `event_reviews` | Yes | Missing (runtime `CREATE TABLE IF NOT EXISTS`) | Deploy without Drizzle migrate can drift |
| `event_images` | Yes | Missing (runtime DDL) | Same |
| `home_sections` | Yes | Missing | Same |
| `users.avatar_url` | Yes | Missing | Profile avatar write may fail on old DB |
| `users.email` UNIQUE | Yes | Not UNIQUE | Duplicate emails possible on old DB |
| `coupons.used_count` | Yes | Missing | Coupon usage never tracked in SQL dump DB |

---

## 3. All tables — USED / link to Web & Android

| # | Table | Used? | Web (primary) | Android (primary) |
|---|-------|-------|---------------|-------------------|
| 1 | `users` | YES | `/api/auth/flow/*`, bookings | Same flow + `/api/auth/profile/upsert` |
| 2 | `organizers` | YES | Admin organizers / event joins | Partner lead only; admin via web URL |
| 3 | `districts` | YES | `/api/locations/districts` | Rarely; cities API |
| 4 | `talukas` | YES | `/api/locations/talukas` | Rarely |
| 5 | `cities` | YES | `/api/cities`, locations | `/api/cities` |
| 6 | `venues` | YES | Public + admin venues | Via events API |
| 7 | `venue_sections` | YES | Seat designer / seats API | Seat selection |
| 8 | `seats` | YES | Seats + designer | Seat selection |
| 9 | `events` | YES | `/api/events`, admin | `/api/events` + **Supabase fallback** |
| 10 | `event_sessions` | YES | Events + lifecycle expire | Same via API |
| 11 | `ticket_types` | YES | Pricing / seats | Same |
| 12 | `seat_inventory` | YES | Hold / release / confirm | Same |
| 13 | `orders` | YES | payments + `/api/orders` | Same |
| 14 | `tickets` | YES | PDF / email / scanner | My tickets + PDF |
| 15 | `ticket_scans` | YES | `/api/scanner/verify` | Native scanner → same API |
| 16 | `settlements` | YES | Admin settlements | Not in-app |
| 17 | `partner_leads` | YES | partner-with-us | Partner form |
| 18 | `audit_logs` | YES | Admin / payments | Indirect |
| 19 | `coupons` | YES | coupons API | Checkout coupon |
| 20 | `announcements` | YES | `/api/announcements` | Prefer **Supabase REST** then fallback |
| 21 | `device_tokens` | YES | notifications/register | Push register |
| 22 | `notification_log` | YES | notifications/send | Send path |
| 23 | `event_reviews` | YES | `/api/events/:id/reviews` | API + **Supabase insert fallback** |
| 24 | `event_images` | YES | Event detail / admin uploads | Via event detail API |
| 25 | `home_sections` | YES | `/api/sections` | `getHomeSections` |

**No fully unused tables** in current app scope.

---

## 4. Columns — unused or weakly used

| Table.column | Status | Notes |
|--------------|--------|-------|
| `users.assigned_events` | UNUSED | Declared; no app read/write |
| `coupons.used_count` | UNUSED | Never incremented; missing in `schema.sql` |
| `events.rejection_reason` | UNUSED | Admin reject does not persist reason |
| `events.cancellation_policy` | WEAK | Default only; refund engine does not read it |
| `districts.division_mr` | WEAK | Stored; districts list barely uses it |
| `organizers` bank/PAN/GST | WEAK | Stored for KYC; payout UI partial |

---

## 5. Phantom / non-DB fields in code (bugs)

| Code field | Where | Schema reality |
|------------|-------|----------------|
| `is_informational` / `isInformational` | `mobile/src/api/index.ts` Supabase map | **Not a column** — API-computed only |
| `interested_count` | Mobile event map | **Not in schema** |
| `rating_count_str` | Mobile | Computed string, not DB |
| `show_date_str` on event row | Mobile Supabase map | API-computed (`showDateStr`), not column |
| `totalBookings` / `bookingCount` on cards | `HomeScreen.tsx` | Not schema columns |
| Role `admin` | Mobile store / Home / TicketScanner | DB roles: `super_admin`, `organizer`, `scanner`, … — **`admin` invalid** |
| Hold client `faceValue` | Mobile checkout | Server returns `faceValueTotal` (alias handled partially) |
| Mobile review insert without `user_id` | Supabase fallback | `event_reviews.user_id` is **NOT NULL** → can fail |

---

## 6. Naming map (DB ↔ API ↔ clients) — OK when consistent

| Concept | DB column | API / Drizzle | Web | Android |
|---------|-----------|---------------|-----|---------|
| Order email | `user_email` | `userEmail` | `userEmail` | `userEmail` |
| Order name/phone | `user_name`, `user_phone` | camelCase | same | same |
| Face total (order) | `ticket_face_value_total` | `ticketFaceValueTotal` | hold `faceValueTotal` | often param `faceValue` |
| Ticket face | `face_value` | `faceValue` | same | same |
| Session time | `session_start_time` | `sessionStartTime` | same | same |
| Poster | `poster_url` | `posterUrl` | same | same |
| Gallery | `gallery_urls` JSON text | `galleryUrls` | admin upload + detail | via detail API |

---

## 7. Web vs Android — feature / API differences

### 7.1 Booking & payments (same DB tables)

| Step | Web | Android | Same DB? |
|------|-----|---------|----------|
| Seats | `GET /api/sessions/:id/seats` | Same | Yes |
| Hold | `POST /api/bookings/hold` | Same | Yes |
| Create Razorpay | `POST /api/payments/create-order` | Same | Yes |
| Verify | `POST /api/payments/verify` | Same | Yes |
| Legacy confirm | `POST /api/bookings/confirm` | Method exists; checkout prefers verify | Dual path |
| My tickets | `GET /api/orders` | Same | Yes |

### 7.2 Auth (same `users` table, different routes)

| Action | Web | Android | Bug risk |
|--------|-----|---------|----------|
| OTP | `/api/auth/flow/send-otp` | Same preferred | OK |
| Legacy OTP | `/api/auth/otp/*` (email/Supabase) | Mobile helper still sends **phone** body | **Mismatch** |
| Profile | `/api/auth/flow/profile` | `/api/auth/profile/upsert` | Duplicate writers |
| Logout | `/api/auth/flow/logout` (cookie) | `/api/auth/logout` (Supabase only) | Cookie may remain |
| Google | `/api/auth/google` | WebView → same | Needs `GOOGLE_CLIENT_*` on Vercel |

### 7.3 Events / announcements

| | Web | Android |
|--|-----|---------|
| Event list | Always Next `/api/events` | Prefer API; **fallback Supabase** with phantom fields |
| Event detail (book) | `/api/events/:id` | API only (good) |
| Announcements | `/api/announcements` | Prefer Supabase REST + hardcoded fallback |
| Past sessions | Filtered via `session-lifecycle` | Same if using API; Supabase fallback may show stale/past |

### 7.4 Scanner / admin

| | Web | Android |
|--|-----|---------|
| Scanner | `AdminScanner` → `/api/scanner/verify` + attendance | Native scanner → verify; attendance not clearly wired |
| Role gate | `super_admin` / organizer / scanner | Checks **`admin`** (wrong) |
| Admin CRUD | Full SuperAdmin + OrganizerConsole | Opens web admin URL only |

---

## 8. Duplicate backend / API functionality

| Business action | Path A | Path B | Issue |
|-----------------|--------|--------|-------|
| Confirm paid booking | `payments/verify` | `bookings/confirm` | Two confirm engines; tests use B; apps prefer A |
| Send OTP | `auth/flow/send-otp` | `auth/otp/send` | DB OTP vs Supabase Auth |
| Logout | `auth/flow/logout` | `auth/logout` | Cookie vs Supabase only |
| Profile update | `auth/flow/profile` | `auth/profile/upsert` | Two upserts |
| Cities list | `/api/cities` | `/api/locations/cities` | Picker vs admin catalog |
| Announcements | Next API | Mobile Supabase REST | Divergent content |
| Event catalog | Next API | Mobile Supabase join cache | Inventory / field honesty |
| Reviews | Next API | Mobile Supabase insert | Missing `user_id` on B |

---

## 9. Responsive web vs Android-first differences

| Area | Responsive web | Android | Impact |
|------|----------------|---------|--------|
| Checkout UI | Modal `CheckoutDrawer` | Full-screen + native Razorpay | UX + reconciliation only on Android |
| Add-ons | Component exists; seat flow skips (`addons: []`) | Store has addons; also empty in seat flow | Dead feature both sides |
| Scanner | Browser camera in admin panels | Native camera; role bug | Gate staff on phone may be blocked |
| Admin | Full in-app admin | External browser to `/admin` | Organizers must use web |
| Tickets PDF | Same-origin fetch | Absolute `WEB_ORIGIN` download | PDF failures if origin wrong |
| Offline | Live fetch | Cache / fake fallbacks | Android can show wrong events |
| Nav | `GlobalMobileNav` | RN tabs | Different IA |
| Mitra chat | Floating bot → `/events?mitraCheckout` | Modal → Checkout / SeatSelection | Must stay in sync |

---

## 10. Master bug list (prioritized)

### P0 — correctness / money / gate

1. **Past shows still bookable if client bypasses filtered API** — mitigated by `session-lifecycle` + hold check; ensure Android never books from Supabase-only cache without session filter.  
2. **Mobile role `admin` ≠ DB `super_admin`** — scanner/admin entry broken for real super admins.  
3. **Dual booking confirm** (`payments/verify` vs `bookings/confirm`) — risk of divergent signature/idempotency rules.  
4. **Dual logout** — Android may not clear web HMAC session cookie.  
5. **Group QR vs single ticket** — group/order path marks all seats (fixed recently); individual MTSEC marks one — organizers must use group/order QR for party of 5.

### P1 — data honesty / mapping

6. **`schema.sql` missing tables/columns** vs live Drizzle — migrations incomplete.  
7. **Phantom mobile event fields** (`is_informational`, `interested_count`, etc.).  
8. **`coupons.used_count` never updated** — limits unenforced.  
9. **`events.rejection_reason` unused** — reject has no stored reason.  
10. **Mobile announcements/reviews via Supabase** diverge from Next API.  
11. **Mobile review without `user_id`** can violate NOT NULL.

### P2 — product / UX

12. **Add-ons skipped** on web and Android seat→checkout.  
13. **Android attendance API** not wired like web scanner.  
14. **`GET /api/notifications` list** — mobile may expect list route that does not exist (only register/send).  
15. **Demo organizer stats** (partially removed) — ensure no remaining hardcoded gate %.  
16. **Image URL-only legacy** — upload path added; old events may still use Unsplash placeholders.

### P3 — ops / env

17. Vercel **Needs Attention** on `DATABASE_URL` / `SQL_PASSWORD` / `SQL_ADMIN_PASSWORD`.  
18. Missing Vercel: `ADMIN_SESSION_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.  
19. Changing `TICKET_SECRET` invalidates existing QR codes.

---

## 11. Recommended fix order

1. Align mobile roles to `super_admin` / `scanner` / `organizer`.  
2. Remove or quarantine Android Supabase catalog/announcement/review fallbacks for booking-critical data — **API only**.  
3. Deprecate `bookings/confirm` for clients; keep one confirm path.  
4. Unify logout + profile to `auth/flow/*`.  
5. Sync `supabase/schema.sql` (or migrate) with `schema.ts` including `event_*` + `home_sections` + `used_count` + `avatar_url`.  
6. Increment `coupons.used_count` on successful capture.  
7. Wire Android scanner attendance to `/api/scanner/attendance`.  
8. Persist `rejection_reason` on admin reject.

---

## 12. File index (evidence)

| Concern | Files |
|---------|-------|
| Schema SoT | `src/db/schema.ts` |
| Lagging SQL | `supabase/schema.sql` |
| Session expire / past hide | `src/lib/session-lifecycle.ts`, `app/api/events/route.ts`, `app/api/events/[id]/route.ts` |
| Hold / confirm | `src/lib/inventory-engine.ts`, `app/api/bookings/*`, `app/api/payments/*` |
| Scanner | `app/api/scanner/verify/route.ts`, `src/components/AdminScanner.tsx`, `mobile/src/screens/TicketScannerScreen.tsx` |
| Mobile API dual paths | `mobile/src/api/index.ts` |
| Auth dual paths | `app/api/auth/flow/*`, `app/api/auth/otp/*`, `app/api/auth/logout/route.ts` |
| Admin | `src/components/admin/SuperAdminPanel.tsx`, `OrganizerConsole.tsx` |

---

*Generated for MahaTicket ops. Update this file after each migration or when removing duplicate routes.*
