# API CONTRACT (canonical)

**Branch:** `fix/finalization-rn-db-sync`  
**Authority:** Next.js Route Handlers → PostgreSQL (Drizzle). Android and web must not invent booking-critical data via Supabase REST.

## Catalog (read)

| Method | Route | Auth | Mutates | Callers |
|--------|-------|------|---------|---------|
| GET | `/api/events` | Public | No | Web home, Android `api.getEvents` |
| GET | `/api/events/:id` | Public | No | Web detail, Android `api.getEvent` |
| GET | `/api/venues` | Public | No | Web, Android |
| GET | `/api/announcements` | Public | No | Web, Android `api.getAnnouncements` |
| GET | `/api/sessions/:id/seats` | Public | No | Seat maps (web + Android) |

## Booking / payment (write)

| Method | Route | Auth | Mutates | Notes |
|--------|-------|------|---------|-------|
| POST | `/api/inventory/hold` (or project hold route) | Session / hold token | Yes | Atomic seat hold |
| POST | `/api/payments/create-order` | Customer | Yes | Razorpay order |
| POST | **`/api/payments/verify`** | Customer | Yes | **Canonical** confirm + ticket issue (idempotent) |
| POST | `/api/bookings/confirm` | Customer | Yes | **Legacy / e2e** — prefer verify; do not dual-confirm from clients |

Clients must call **only** `/api/payments/verify` after Razorpay success. Do not call both.

## Tickets / PDF

| Method | Route | Auth | Mutates |
|--------|-------|------|---------|
| GET | `/api/tickets/:ticketCode/pdf` | Owner / staff | No |
| GET | `/api/orders/:id/pdf` | Owner / staff | No |

## Scanner

| Method | Route | Auth | Mutates | Notes |
|--------|-------|------|---------|-------|
| POST | `/api/scanner/verify` | Organizer / scanner / admin | Yes | `requireScope` + `targetEventId` + `targetSessionId` |

Scan results: `valid`, `ALREADY_USED`, `WRONG_EVENT`, `WRONG_SESSION`, `WRONG_ORGANIZER`, invalid.

## Auth

| Method | Route | Notes |
|--------|-------|-------|
| POST | `/api/auth/*` | OTP / Google / session |
| POST | `/api/auth/logout` | Invalidate server session + clear client tokens |
| GET | `/api/profile` | Profile sync for Android |

## Roles (DB)

`customer` | `organizer` | `super_admin` | `scanner` | `manager` | `operations` | `finance`  
Mobile also accepts legacy `admin` as alias of `super_admin` for UI gates.
