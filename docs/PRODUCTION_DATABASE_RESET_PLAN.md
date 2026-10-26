# Production database reset plan — MahaTicket / TicketGhar

**Status:** REVIEW ONLY — do not execute against production until owner approval.  
**Basis:** Live audit `docs/THEATRE_DATABASE_FINAL_AUDIT.md` + `THEATRE_DATABASE_FINAL_AUDIT_DATA.json` (2026-10-26).  
**Owner intent:** Existing venues/events/orders/tickets/reviews/settlements are **development test data**. Clear that catalogue, **keep users/admins**, location masters, and payment/app config; then import real theatres for the five product cities.

---

## 1. Five cities (from codebase — not guessed)

Product city fallback / primary filter set:

| # | City | Evidence |
|---|---|---|
| 1 | **Pune** | `app/api/cities/route.ts` fallback; Marathi map `पुणे` |
| 2 | **Mumbai** | same (`मुंबई`) |
| 3 | **Nagpur** | same (`नागपूर`) |
| 4 | **Nashik** | same (`नाशिक`) |
| 5 | **Thane** | same (`ठाणे`) |

Seed batch comment groups also emphasize Pune → Mumbai City/Suburban → Thane → Nagpur (`docs/THEATRE_INSERT_BATCHES.md`). Product “five cities” = the list above (Mumbai City vs Suburban are **districts**, not separate product cities).

---

## 2. Table-by-table plan

Row counts = **FACT** from live audit JSON (re-run preflight before apply).

### 2.1 CLEAR — confirmed test catalogue & transactional data

| Table | Live rows | Why clear | Delete order step |
|---|---:|---|---:|
| `ticket_scans` | 10 | Test gate scans | 1 |
| `tickets` | 160 | Test M-tickets | 2 |
| `seat_inventory` | 38096 | Test holds/bookings | 3 |
| `settlements` | 73 | Test payouts tied to test events | 4 |
| `orders` | 73 | Test checkouts (Razorpay IDs on these rows are **test orders**, not a separate payments table) | 5 |
| `event_reviews` | 115 | Test reviews | 6 |
| `event_images` | 0 | Empty; clear for completeness | 7 |
| `ticket_types` | 660 | Test pricing | 8 |
| `event_sessions` | 169 | Test showtimes | 9 |
| `events` | 70 | Test shows | 10 |
| `seats` | 7606 | Template/test layouts | 11 |
| `venue_sections` | 186 | Template sections | 12 |
| `venues` | 66 | Entire current theatre catalogue treated as non-production seed/test (owner direction) | 13 |

**Payment note:** There is **no** `payments` table. Gateway fields live on `orders`. Clearing test `orders` removes those test Razorpay IDs. It does **not** delete Razorpay dashboard history or `app_secrets` keys. Do **not** call payment-provider void/refund APIs as part of reset.

### 2.2 PRESERVE — masters, auth, config

| Table | Live rows | Why preserve |
|---|---:|---|
| `users` | 16 | Admin + customer accounts (**explicit: keep**) |
| `organizers` | 4 | Needed for future real events (`events.organizer_id` NOT NULL). Keep unless owner names specific test org rows to remove later |
| `districts` | 36 | MH location master |
| `talukas` | 359 | MH location master |
| `cities` | 65 | City catalog (including five cities) |
| `app_secrets` | 2 | Payment/auth secrets — **never delete, never export to git** |
| `app_runtime_config` | 2 | Runtime flags |
| `home_sections` | 9 | CMS section keys for home |

### 2.3 OPTIONAL CLEAR — confirm before include

| Table | Live rows | Recommendation |
|---|---:|---|
| `coupons` | 4 | Clear if test-only (may reference cleared `event_id`) |
| `announcements` | 4 | Clear if marketing test copy |
| `partner_leads` | 3 | Preserve unless confirmed spam/test |
| `audit_logs` | 91 | Prefer **archive backup then clear** for clean prod ops trail, or preserve |
| `device_tokens` | 0 | Safe to leave |
| `notification_log` | 1 | Optional clear |
| `cities` row `id=131` name=`All` | 1 | Preserve (filter sentinel) unless product drops it |

### 2.4 MUST NOT

- `TRUNCATE … CASCADE` across the database  
- `SET session_replication_role = replica` / disable FK checks  
- Drop or alter schema only to make deletes easier  
- Delete `users` / `app_secrets`  
- Hard-delete “real” external payment records (none stored as separate table; keys stay in secrets)  
- Invent theatres while resetting  

### 2.5 Live FK gap (safety)

Several schema.sql FKs are **missing live** (`venue_sections.venue_id`, `orders.event_id`, etc.). Deletion **must** still follow child→parent order above. Preflight aborts if unexpected row counts appear after a step.

---

## 3. Correct deletion order (SQL)

```
ticket_scans
→ tickets
→ seat_inventory
→ settlements
→ orders
→ event_reviews
→ event_images
→ ticket_types
→ event_sessions
→ events
→ seats
→ venue_sections
→ venues
→ [optional] coupons, announcements, notification_log, audit_logs
```

Use `DELETE FROM …` (or `TRUNCATE` **single table** only when that table has no incoming FKs and is empty of protected data). Prefer `DELETE` for clarity and counting.

After venue wipe, **reset sequences** optionally (`venues_id_seq`, etc.) so new imports start clean — document in apply runbook; not required for correctness.

---

## 4. Non-test record check (required before clear)

Owner has classified the current catalogue as test. Preflight still prints:

- Any `orders.payment_status = 'captured'` with recent `created_at` after a cutover date the owner sets  
- Any venue with `verification_status` + organizer-owned real contract markers (none encoded in schema today)  
- Counts of `users` with `role IN ('super_admin','manager',…)`

If owner later finds a subset to **keep**, remove those venue IDs from the clear set before apply. Default plan (this doc): **clear all venues and all dependent catalogue/commerce rows**.

---

## 5. Application compatibility after reset

| Surface | Expected behaviour when venues=0 / events=0 |
|---|---|
| Public `/api/venues` | Empty list (filters `verification_status=verified` + authoritative allowlist) |
| City filters | Still work off `cities` master |
| Admin SuperAdminPanel | Empty authoritative list until import + `data/authoritative_theatres.json` updated with **new IDs** |
| Event creation | Blocked until allowlisted verified venues exist |
| Seat designer / inventory | No layouts until configured post-import |
| Orders / payments / scanner | No rows; code paths intact; Razorpay keys in `app_secrets` unchanged |
| Android | Same APIs — empty catalogue until seed |

**Critical post-import:** rewrite `data/authoritative_theatres.json` IDs (old 55–66 will be gone). Unverified theatres must stay `verification_status='unverified'` so they do not pass public listing.

---

## 6. Scripts & SQL

| Artifact | Role |
|---|---|
| `scripts/production-database-preflight.ts` | Dry-run counts + preserve checks (default) |
| `scripts/production-database-reset.ts` | Gated apply of deletes (env + confirm); default dry-run |
| `supabase/migrations/20261027_production_test_catalogue_reset.sql` | Reviewed SQL; ends `ROLLBACK` unless operator commits |
| `scripts/production-database-postflight.ts` | Assert cleared vs preserved |
| `docs/PRODUCTION_DATABASE_BACKUP_AND_RESTORE.md` | External backup (outside TX) |
| `docs/PRODUCTION_THEATRE_IMPORT_PLAN.md` | Five-city import readiness |

---

## 7. Staging dry-run commands

```bash
# 1) External backup FIRST (see BACKUP doc) — not inside SQL transaction
# 2) Point DATABASE_URL at STAGING clone only
npx tsx scripts/production-database-preflight.ts
npx tsx scripts/production-database-reset.ts
# review printed DELETE counts — still dry-run

# 3) Explicit apply on staging only:
npx tsx scripts/production-database-reset.ts --apply \
  --confirm=I_CLEAR_TEST_CATALOGUE \
  --i-confirm-staging

npx tsx scripts/production-database-postflight.ts
```

Production apply requires additional `--i-confirm-production` and matching env host checks (script-enforced).

---

## 8. Unresolved risks

1. **Organizers:** Preserving all 4 may leave test company names; clearing them requires nulling `users.organizer_id` first (FK SET NULL exists). Confirm with owner.  
2. **Authoritative JSON** becomes stale the moment venues are deleted.  
3. **Nagpur / Nashik / Thane** lack independently verified capacity sources in-repo — import names/addresses only after owner confirms evidence (see import plan).  
4. Missing live FKs mean orphans possible if a custom delete order is used — stick to this plan.  
5. Test Razorpay order IDs in DB ≠ need to purge Razorpay merchant dashboard.
