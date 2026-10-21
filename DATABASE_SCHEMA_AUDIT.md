# MahaTicket (महाटिकिट) Database Architecture & Schema Audit
**Document Version:** 2.0 (Post-Cleanup Audit)  
**Date:** October 2026  
**Environment:** Production PostgreSQL (Supabase `hnseawulngdxbvltmthe`)  

---

## 1. Executive Summary & Action Taken

### 1.1 Legacy Duplicate Tables Removed
In the previous database state, 6 legacy tables with the suffix `_uuid2` existed due to an older schema migration experiment:
- `legacy_bookings_uuid2` (DROPPED)
- `legacy_events_uuid2` (DROPPED)
- `legacy_profiles_uuid2` (DROPPED)
- `legacy_seats_uuid2` (DROPPED)
- `legacy_showtimes_uuid2` (DROPPED)
- `legacy_venues_uuid2` (DROPPED)

**Action Taken:** All 6 tables have been permanently dropped via SQL migration. The database now exclusively uses the clean integer primary key tables (`events`, `venues`, `seats`, `users`, `bookings`, `event_sessions`).

### 1.2 User Duplication & Identity Cleanup
- **Issue:** `public.users` allowed duplicate rows for the same email address because `email` was missing a `UNIQUE` constraint, and API upsert previously matched by arbitrary client-generated `uid` strings (e.g. `user-registered-1792421192190-324` vs `1792504387552` for `kalpeshborse105@gmail.com`).
- **Action Taken:**
  1. Profile data from duplicate user id 15 was merged into user id 12 (`kalpeshborse105@gmail.com`), and redundant row 15 was removed.
  2. Applied Postgres constraint: `ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);`.
  3. Normalized user `uid` values (`user-12`, `user-13`, `user-14`, etc.).
  4. Updated `/api/auth/profile/upsert` to query by clean email first, guaranteeing single source of truth across mobile and web.

---

## 2. Active Production Tables (25 Tables)

### 2.1 Identity & Access Control
| Table Name | Primary Key | Key Columns | Purpose |
| :--- | :--- | :--- | :--- |
| **`users`** | `id` (SERIAL) | `uid`, `email` (UNIQUE), `phone`, `full_name`, `role`, `avatar_url`, `city` | Central user accounts for customers, organizers, and scanner staff |
| **`organizers`** | `id` (SERIAL) | `user_id`, `company_name`, `pan_number`, `gst_number`, `status` | Registered theatre and event production houses |

### 2.2 Venues & Seating Topology
| Table Name | Primary Key | Key Columns | Purpose |
| :--- | :--- | :--- | :--- |
| **`venues`** | `id` (SERIAL) | `name`, `name_mr`, `city`, `address`, `total_capacity`, `facilities`, `layout_config` | Iconic theatres (Bal Gandharva, Tilak Smarak, Yashwantrao Chavan, etc.) |
| **`venue_sections`** | `id` (SERIAL) | `venue_id`, `name`, `name_mr`, `base_price`, `capacity`, `entry_gate` | Auditorium tiers (Balcony / बाल्कनी, Stall / स्टॉल, Box / बॉक्स) |
| **`seats`** | `id` (SERIAL) | `venue_id`, `section_id`, `row_label`, `seat_number`, `tier`, `x_pos`, `y_pos` | Physical auditorium armchairs for interactive visual seat mapping |

### 2.3 Events, Shows & Ticketing
| Table Name | Primary Key | Key Columns | Purpose |
| :--- | :--- | :--- | :--- |
| **`events`** | `id` (SERIAL) | `title`, `title_mr`, `category`, `category_mr`, `venue_id`, `organizer_id`, `poster_url`, `banner_url`, `duration_minutes`, `featured`, `status` | Theatrical plays, garba nights, concerts, and cultural programs |
| **`event_sessions`** | `id` (SERIAL) | `event_id`, `session_start_time`, `session_end_time`, `status`, `total_seats`, `available_seats` | Scheduled showtimes for events (e.g. 19 Oct 6:30 PM, 20 Oct 9:30 PM) |
| **`ticket_types`** | `id` (SERIAL) | `session_id`, `section_id`, `name`, `price`, `total_quota`, `available_quota` | Pricing tiers per session (in paise, e.g. ₹300 = 30000) |
| **`seat_inventory`** | `id` (SERIAL) | `session_id`, `seat_id`, `status` (`available`, `held`, `booked`), `hold_expires_at`, `held_by_user_id` | Real-time seat concurrency lock preventing double bookings |

### 2.4 Bookings, Payments & M-Tickets
| Table Name | Primary Key | Key Columns | Purpose |
| :--- | :--- | :--- | :--- |
| **`bookings`** | `id` (SERIAL) | `booking_reference`, `user_id`, `session_id`, `status`, `total_amount`, `convenience_fee`, `gst_amount`, `qr_code_hash` | Customer ticket orders |
| **`booking_items`**| `id` (SERIAL) | `booking_id`, `seat_id`, `ticket_type_id`, `price` | Individual seats attached to a booking |
| **`tickets`** | `id` (SERIAL) | `ticket_code`, `booking_id`, `seat_id`, `status`, `qr_data` | Digital M-Ticket passes issued to attendees |
| **`ticket_scans`** | `id` (SERIAL) | `ticket_id`, `scanner_user_id`, `gate`, `scanned_at`, `status` | Gate scanner audit trail for entry validation |
| **`payments`** | `id` (SERIAL) | `booking_id`, `gateway_name` (Razorpay/Cashfree), `gateway_order_id`, `gateway_payment_id`, `amount`, `status` | Payment gateway transaction records |
| **`orders`** | `id` (SERIAL) | `order_number`, `user_id`, `amount`, `status` | Master checkout orders |
| **`settlements`** | `id` (SERIAL) | `organizer_id`, `event_id`, `net_payout`, `platform_commission`, `status` | Financial payouts to event organizers |

### 2.5 Discovery, Reviews & Marketing
| Table Name | Primary Key | Key Columns | Purpose |
| :--- | :--- | :--- | :--- |
| **`event_reviews`** | `id` (SERIAL) | `event_id`, `user_id`, `user_email`, `author_name`, `rating`, `comment`, `verified` | Star ratings and audience reviews (guarded against duplicate reviews) |
| **`event_images`** | `id` (SERIAL) | `event_id`, `image_url`, `display_order`, `caption` | Multi-photo production gallery |
| **`home_sections`** | `id` (SERIAL) | `section_key`, `title_en`, `title_mr`, `subtitle_en`, `subtitle_mr`, `is_visible`, `display_order` | Dynamic CMS sections on home screen |
| **`districts`** | `id` (SERIAL) | `name`, `name_mr`, `state` | Maharashtra administrative districts |
| **`talukas`** | `id` (SERIAL) | `district_id`, `name`, `name_mr` | Sub-district geographical mapping |
| **`partner_leads`**| `id` (SERIAL) | `contact_name`, `phone`, `email`, `organization`, `status` | Inquiries from theatre organizers |
| **`notification_log`** | `id` (SERIAL) | `user_id`, `title`, `message`, `channel` (WhatsApp/Email/Push), `status` | WhatsApp & Email delivery records |

---

## 3. Web vs Native Mobile Architecture Parity

Both the Web application (`Next.js 14 App Router`) and Android application (`React Native`) share the exact same backend API endpoints and data model:

```
[Web Browser]                     [Android Mobile App]
  (Next.js App Router)               (React Native Native Views)
         │                                   │
         ▼                                   ▼
  /api/sessions/[id]/seats           /api/sessions/[id]/seats
  /api/bookings/hold                 /api/bookings/hold
  /api/events/[id]/reviews           /api/events/[id]/reviews
         │                                   │
         └───────────────┬───────────────────┘
                         │
                         ▼
             [Next.js Server Endpoints]
                         │
                         ▼
             [Supabase PostgreSQL DB]
            (Single Clean Schema - 25 Tables)
```

### Key Functional Highlights:
1. **Zero WebViews for Seat Map**:
   - The Android app implements a 100% native interactive seat map in `SeatSelectionScreen.tsx` with pinch-to-zoom, realistic armchair grid, stage projection arc, and live seat lock polling.
2. **Direct Checkout Flow**:
   - Matches web behavior with no unwanted snack/concession screens, moving directly from held seats to checkout.
3. **Scheduled vs Informative Event States**:
   - **Scheduled Events** (sessions exist): Date/time pills, starting price, and "Select Seats →" / "आसन निवडा →" are visible.
   - **Informative Events** (0 sessions): Date/time selectors and prices are cleanly hidden. An informative notice and "🔔 मला आठवण करा" / "🔔 Notify Me" reminder button are rendered.
