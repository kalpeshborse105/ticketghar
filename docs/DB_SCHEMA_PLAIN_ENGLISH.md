# Database in plain English (keep this design)

**Verdict: market-standard for ticket booking. Keep it. Do not redesign.**

Same shape used by serious ticketing products (venue → show → seat hold → pay → ticket → scan).

## Where things live

| What you mean | Table | Notes |
|---|---|---|
| Theatre / cinema / natya mandir | `venues` | Name, address, city, optional `city_id`/`district_id` |
| Gold / Balcony / Stall blocks | `venue_sections` | Per theatre |
| Physical chairs | `seats` | Linked to section + venue |
| A play/movie listing | `events` | Points at one venue + organizer |
| Show date/time | `event_sessions` | **No rows = nobody can book** |
| Price tiers for a show | `ticket_types` | Paise |
| Live availability | `seat_inventory` | available / held / booked per show |
| Customer checkout | `orders` | Money + Razorpay fields on this row (no separate payments table) |
| M-ticket | `tickets` | QR / code |
| Gate scan log | `ticket_scans` | |
| Organizer payout | `settlements` | |
| Login / admin | `users` | **Kept** |
| MH map | `districts` → `talukas` → `cities` | **Kept** |
| Payment keys | `app_secrets` | **Kept** (test mode OK) |

## Why this is correct (not “too bad”)

- Clear parent→child chain; admin + Android share same `/api/*`.
- Seat holds live in `seat_inventory` (concurrency-safe pattern).
- Prices in **paise** (integer) — standard for INR.
- Soft verification on venues (`verified` / `unverified`) so research cinemas can exist without going on sale.

## What we did **not** change

No column drops, no new booking tables, no schema rewrite. Faster UX later = indexes/query polish if needed — not a new model.

## Current prod posture (after clear + import)

- Catalogue theatres loaded (mostly `unverified` research + 4 verified NCPA).
- **Zero** events/sessions → public cannot book showtimes.
- Razorpay stays test keys until you go live.
- Organizer publishes event + session only when permitted → then listing can sell.
