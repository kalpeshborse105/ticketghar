# Theatre SQL folder + prod clear — plain guide

**Status:** Reviewed. **Nothing cleared. Nothing from `data/theater-sql` executed.**

---

## 1. Does our app connect to BookMyShow?

| Layer | Fact |
|---|---|
| Live DB tables | **No** BMS tables. No scrape jobs writing showtimes/seats from BMS. |
| App APIs | Venues/events/orders come from **our** Postgres (`venues`, `events`, `orders`, `tickets`, …). |
| UI comments | Many “BookMyShow-style” labels = **look & feel only** (date strip, PDF layout). |
| Seed leftovers | Older files like `seed_real_events_movies_plays.sql` mention BMS/TicketKhidkee in comments — **not** a live integration. |
| `data/theater-sql` BMS files | Human research SQL with BMS **URLs as listing evidence**. Not an API feed. |

**Policy:** Do not import BMS ticket inventory, posters, seat maps, or anti-bot feeds as sellable MahaTicket stock.

---

## 2. How the database works (readable)

```
KEEP for clean prod:
  users                 ← admins + customers (you asked to keep)
  organizers            ← needed to create real events later
  districts / talukas / cities   ← Maharashtra map (needed for theatre city_id)
  app_secrets           ← Razorpay / auth keys (real payments)
  app_runtime_config
  home_sections

CLEAR (test catalogue + money trail from testing):
  ticket_scans → tickets → seat_inventory → settlements → orders
  → event_reviews → event_images → ticket_types → event_sessions → events
  → seats → venue_sections → venues
```

Optional clear later: `coupons`, `announcements`, `notification_log`, `audit_logs`.

**Do not drop columns or tables** to “make reset easier”. Empty the **rows**, keep the **schema**.

---

## 3. `data/theater-sql` verdict (after clear — not now)

| File type | Run after clear? | Why |
|---|---|---|
| `mahaticket_verified_venue_catalogue.sql` | **Yes, after review** | Fixed to set `city_id`/`district_id`, integer flags, NCPA names; ends in **ROLLBACK** until you COMMIT |
| All `mahaticket_bms_venue_candidates_*.sql` | **No bulk import** | Preview/research; commented INSERT has wrong types (boolean/NULL capacity/jsonb); Ahilyanagar≠Ahmednagar; not five-city curated |
| `mahaticket_additional_taluka_venues_*.sql` | **No** | Read-only JustDial/Cybo research |
| `mahaticket_venue_candidates_remaining_districts.sql` | **No** | Read-only |

Full folder notes: `data/theater-sql/README.md`.

---

## 4. Clear vs “only users”

You asked: keep schema + users; clear other data.

**Also keep** (or location mapping + payments break):

- `districts`, `talukas`, `cities`
- `app_secrets`, `app_runtime_config`
- `organizers` (events need `organizer_id`)

If those masters are wiped, even the fixed NCPA SQL will abort on purpose.

Scripts already prepared (still default dry-run):

- `scripts/production-database-preflight.ts`
- `scripts/production-database-reset.ts`
- `scripts/production-database-postflight.ts`
- `docs/PRODUCTION_DATABASE_RESET_PLAN.md`

---

## 5. Exact later commands (staging first)

```bash
# A) External backup FIRST
# B) Preflight (read-only)
npx tsx scripts/production-database-preflight.ts

# C) Dry-run reset (no writes)
npx tsx scripts/production-database-reset.ts

# D) Staging apply only when you say so
npx tsx scripts/production-database-reset.ts --apply --confirm=I_CLEAR_TEST_CATALOGUE --i-confirm-staging
npx tsx scripts/production-database-postflight.ts

# E) Then run verified theatre SQL in SQL editor — review SELECT — COMMIT only if OK
# F) Rebuild data/authoritative_theatres.json with NEW venue IDs
```

**Not run in this pass.**

---

## 6. Risks if we ignore the review

- Enabling BMS INSERT as written → **SQL errors** or bad rows  
- Importing all-district BMS cinemas → noisy “prod” catalogue, no seat maps, no sell rights  
- Clearing `cities`/`districts` → theatre SQL cannot map  
- Clearing `app_secrets` → real payment breaks  
- Leaving old `authoritative_theatres.json` IDs after clear → admin/public allowlist empty/wrong  
