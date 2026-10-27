# MahaTicket — Production readiness report

**Date:** 2026-10-27  
**Scope:** P0 payment/inventory/scanner/auth fixes implemented and verified with typecheck + build.  
**Recommendation:** **READY FOR STAGING** (not yet CANDIDATE FOR PRODUCTION).

---

## A. Architecture discovered

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 App Router, React 19, Tailwind |
| Backend | Next.js Route Handlers (`app/api/**`) |
| Database | PostgreSQL (Supabase pooler) via Drizzle + `pg` |
| Payments | Razorpay (`create-order` → Checkout → `verify` + `webhook`) |
| Auth | Customer session + admin signed cookie (`admin-auth.ts`); Firebase also present for mobile/auth flows |
| Scanner | Web + Android via `/api/scanner/verify` (AES QR + CAS redeem) |
| Deploy | Next production build; Supabase Postgres |

Commerce model: `venues` → `events` → `event_sessions` → `seat_inventory` / `ticket_types` → `orders` → `tickets` → `ticket_scans`.

---

## B. Actual problems found (prioritized)

### P0 (fixed in this pass)

1. **Webhook confirmed payment without minting tickets / booking seats** → charged “success” with empty tickets.  
2. **`confirmBookingOrder` seat CAS** used `ne(status,'booked')` → could steal another customer’s hold.  
3. **Order marked confirmed before seats booked** → money without inventory.  
4. **Hold release left stale `orderId`** → late verify could rebind wrong seats.  
5. **Scanner verify/attendance unauthenticated**; `requireScope` client-optional → anyone could redeem.  
6. **`requireAdmin` had no role gate**; `/api/admin/users` reachable by any admin cookie role; **sections** had no auth.  
7. **Hardcoded signing secret fallbacks** usable if env unset in production runtime.

### P1 (partially addressed / remaining)

1. **Multi-city / multi-venue single event listing** — schema is still **one `events.venue_id` per event**. Grouped UX (city→venue→date→time) needs a product migration (occurrence model or parent event). **Not implemented** this pass; catalogue currently has **0 events** after clear.  
2. Amount mismatch handling added on webhook; **verify route does not yet fetch Razorpay payment amount** via API.  
3. Coupon concurrency / unique payment id index — SQL prepared, **not applied** to prod.  
4. Organizer panel metrics / mobile polish — not audited end-to-end this pass.

### P2/P3

- UI responsiveness, bundle size, N+1 listing queries — deferred.

---

## C. Files changed (important)

| File | Purpose |
|---|---|
| `src/lib/inventory-engine.ts` | Clear `orderId` on release; safe seat CAS; confirm only after seats booked; late reclaim of unbound available seats; runtime secret assert |
| `app/api/payments/webhook/route.ts` | Call `confirmBookingOrder`; amount check; never confirm without tickets |
| `app/api/payments/verify/route.ts` | If “confirmed” but 0 tickets → re-run confirm; secret assert |
| `app/api/payments/create-order/route.ts` | Secret assert |
| `app/api/scanner/verify/route.ts` | Auth + mandatory event/session scope; scanner user from session |
| `app/api/scanner/attendance/route.ts` | Auth required |
| `src/lib/admin-auth.ts` | `requireRoles`, runtime secret assert |
| `src/lib/ticket-crypto.ts` | Runtime secret assert helper |
| `app/api/admin/sections/route.ts` | Auth |
| `app/api/admin/users/route.ts` | `super_admin` only |
| `supabase/migrations/20261027_payment_inventory_integrity.sql` | Unique payment id + indexes (**review / COMMIT separately**) |

---

## D. Database changes

| Change | Executed? |
|---|---|
| Catalogue clear + theatre import (prior session) | Yes (earlier) |
| Organizer restore from backup | Yes (earlier) |
| `20261027_payment_inventory_integrity.sql` | **No** — ends in `ROLLBACK`; apply on staging after review |
| Event/occurrence multi-venue migration | **Not written** — needs product design |

---

## E. Booking and payment safety (after fixes)

1. **Hold:** transactional conditional update; checkout extends hold and binds `orderId`.  
2. **Release/expiry:** clears `heldBy`, expiry, and **`orderId`**.  
3. **Confirm:** books only rows with `orderId = this order` (or late reclaim of `available` + `orderId IS NULL`); then sets `orderStatus=confirmed`.  
4. **Webhook:** verifies signature (prod); on capture runs same confirm path; amount mismatch → reconciliation audit, no fake tickets.  
5. **Verify:** signature required; idempotent return only if tickets exist; else confirms.  
6. **Duplicate webhook:** already captured + tickets → no-op.

---

## F. Event experience

**Current:** one event row → one venue. Listing filters `status=published` only.  
**Desired multi-city grouping:** not yet in schema/UI. Use `data/event-sql` draft imports (`status=draft`) until occurrence model is designed. Do not invent showtimes.

---

## G. Scanner verification

| Result | Behavior |
|---|---|
| Valid first scan | CAS `valid`→`used` + audit (unchanged, still solid) |
| Already used | Reject with prior scan info |
| Invalid / bad signature | Reject |
| Wrong event/session | Reject when scope set (**scope now mandatory**) |
| Unauthorized | **401** without admin/scanner session |
| Offline | Client must not show success (server never reached) |

---

## H. Test results

| Command | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npx tsx scripts/test-scanner-payload-and-redeem.ts` | **PASS** |
| `npx tsx scripts/test-phase4-hold-token.ts` | **PASS** |
| `npx tsx scripts/test-phase4-hold-atomicity.ts` (helpers) | **PASS** (DB concurrency not run) |
| `npm run build` | **PASS** (after secret-assert deferral) |
| Live Razorpay sandbox E2E | **NOT VERIFIED** |
| Concurrent oversell DB test | **NOT VERIFIED** (needs test DB) |
| Android scanner E2E | **NOT VERIFIED** |
| Multi-city event UX | **NOT VERIFIED** / not built |

---

## I. Remaining launch blockers

1. Set production env: `TICKET_SECRET`, `ADMIN_SESSION_SECRET`, `PAYMENT_WEBHOOK_SECRET` / `RAZORPAY_WEBHOOK_SECRET`, Razorpay keys (test then live).  
2. Apply integrity SQL on staging (`orders_razorpay_payment_id_uidx`).  
3. Staging E2E: hold → pay (test) → webhook → tickets → scan.  
4. Confirm Android scanner sends admin cookie/session + event/session scope (auth change may break clients that called verify anonymously).  
5. Multi-venue event architecture before marketing “one event, many cities”.  
6. No published sellable events until organizer deals + seats + `published`.

---

## J. Release recommendation

**READY FOR STAGING**

Critical payment/inventory/scanner auth defects found in code were fixed and the web app typechecks/builds.  
Do **not** go live until staging payment+webhook+scan E2E passes and secrets are configured without defaults.
