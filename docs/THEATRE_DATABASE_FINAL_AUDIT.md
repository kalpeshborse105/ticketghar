# Theatre Database Final Audit — MahaTicket / TicketGhar

**Status:** READ-ONLY audit complete. **No production writes. SQL not executed.**  
**Live evidence:** `docs/THEATRE_DATABASE_FINAL_AUDIT_DATA.json`  
**Generated:** 2026-10-26T20:12:22Z (UTC) via `scripts/theatre-final-audit-readonly.ts`  
**Host:** `aws-0-ap-south-1.pooler.supabase.com` (**treat as PRODUCTION**)  
**Repo tip at audit:** `2d6f43f` (`main`)  
**Legend:** **FACT** = verified against live DB or checked-in schema. **ASSUMPTION** = inference pending owner confirmation.

---

## 0. Verdict (start here)

1. **FACT:** Live public schema has **27 tables**. Commerce path is **`orders` → `tickets` → `ticket_scans`**. Tables `bookings`, `booking_items`, `payments`, `villages` **do not exist**.
2. **FACT:** `DATABASE_SCHEMA_AUDIT.md` is **stale** (names nonexistent tables/columns). Prefer `src/db/schema.ts` + `supabase/schema.sql` + this live dump.
3. **FACT:** **66 venues**. Exact name duplicates: **#2/#12** (Dinanath, Mumbai) and **#3/#53** (Yashwantrao, Pune).
4. **FACT:** Protected transaction history on venues **#1, #3, #5, #6, #29** (orders/tickets). Scans only on **#5**. Settlements also on **#7**. Reviews on **#1,#2,#5,#11,#17,#21,#23,#29**.
5. **FACT:** **63/66 venues lack `city_id`**. Only **#29, #65, #66** have both `city_id` + `district_id`. **6** lack `district_id` (#59–64).
6. **FACT:** Several `district_id` values **contradict** free-text `city` (e.g. Dinanath Mumbai → Pune district; PVR/Cinepolis Pune → Mumbai City).
7. **FACT:** `cities.taluka_id` column exists; **no live FK** to `talukas`. Several other FKs declared in `supabase/schema.sql` / Drizzle are **missing live** (see §2).
8. **ASSUMPTION pending owner:** Soft-archive zero-dep duplicate **#12** and **#53**; never hard-delete **#2** (reviews) or **#3** (orders/tickets/settlements).
9. **Do not run** `supabase/migrations/20261027_theatre_catalogue_cleanup.sql` until owner review + staging dry-run.

---

## 1. Live table inventory (row counts)

| Table | Rows (FACT) | Theatre-relevant |
|---|---:|---|
| districts | 36 | Yes |
| talukas | 359 | Yes |
| cities | 65 | Yes |
| venues | 66 | Yes |
| venue_sections | 186 | Yes |
| seats | 7606 | Yes |
| events | 70 | Yes |
| event_sessions | 169 | Yes |
| ticket_types | 660 | Yes |
| seat_inventory | 38096 | Yes |
| orders | 73 | Yes |
| tickets | 160 | Yes |
| ticket_scans | 10 | Yes |
| settlements | 73 | Yes |
| event_reviews | 115 | Yes |
| event_images | 0 | Yes |
| organizers | 4 | Indirect |
| users | 16 | Indirect |
| audit_logs | 91 | Ops |
| announcements | 4 | city text filter |
| coupons | 4 | optional event_id |
| partner_leads | 3 | venue_preference text |
| home_sections | 9 | CMS |
| device_tokens | 0 | No |
| notification_log | 1 | No |
| app_runtime_config | 2 | Ops |
| app_secrets | 2 | **Secrets — never export** |

**Missing vs stale docs (FACT):** `bookings`, `booking_items`, `payments`, `villages`.

---

## 2. Columns — venue & geography (live)

### 2.1 `districts`
`id`, `code` (UNIQUE), `name`, `name_mr`, `division`, `division_mr`, `state`, `is_active`, `created_at`

### 2.2 `talukas`
`id`, `district_id` → `districts.id` (**FK live**), `name`, `name_mr`, `is_active`, `created_at`  
Unique index: `(district_id, name)`.

### 2.3 `cities`
`id`, `name` (UNIQUE), `name_mr`, `state`, `is_active`, `sort_order`, `created_at`, `district_id` → `districts.id` (**FK live**), `taluka_id` (**NO FK live**), `is_popular`  
**FACT:** 64/65 cities have `district_id` + `taluka_id`. City `id=131` name=`All` has neither.  
**FACT:** 0 city/taluka district mismatches where both set.

### 2.4 `venues`
`id`, `district_id` → `districts.id`, `city_id` → `cities.id`, `name`, `name_mr`, `address`, `city` (free text), `state`, `pincode`, `latitude`, `longitude`, `facilities`, `total_capacity`, `has_seat_layout`, `verification_status`, `is_template`, `ownership_type`, `layout_config`, `created_at`  
**No** `taluka_id` / `village_id` on venues (FACT).

### 2.5 Seating & commerce columns (abbreviated)

| Table | Columns (live) |
|---|---|
| venue_sections | id, venue_id, name, name_mr, rows_count, cols_count, base_price, accessible |
| seats | id, venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked |
| events | id, organizer_id, venue_id, title, title_mr, slug, category…, status, … |
| event_sessions | id, event_id, session_start_time, session_end_time, status, created_at |
| ticket_types | id, event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated |
| seat_inventory | id, session_id, seat_id, ticket_type_id, status, held_by_user_id, hold_expires_at, order_id |
| orders | id, order_number, user_*, event_id, session_id, money fields (paise), payment_status, order_status, razorpay_*, … |
| tickets | id, ticket_code, order_id, session_id, ticket_type_id, seat_id, seat_code, …, status |
| ticket_scans | id, ticket_id, ticket_code, scanned_by_user_id, scanner_device, scan_result, gate_name, scanned_at |
| settlements | id, settlement_reference, organizer_id, event_id, money fields, status, payout_utr, … |
| event_reviews | id, event_id, user_id, user_email, user_name, city, rating, comment, verified_attendance, … |

Full column dump: `THEATRE_DATABASE_FINAL_AUDIT_DATA.json` → `columnsByTable`.

---

## 3. Foreign keys & delete rules (live `pg_constraint`)

**FACT: only 24 FKs exist in production.** Default delete rule is **NO ACTION** except where noted.

### 3.1 Present (venue/commerce path)

| From | To | ON DELETE |
|---|---|---|
| venues.district_id | districts.id | NO ACTION |
| venues.city_id | cities.id | NO ACTION |
| cities.district_id | districts.id | NO ACTION |
| talukas.district_id | districts.id | NO ACTION |
| seats.venue_id | venues.id | NO ACTION |
| seats.section_id | venue_sections.id | NO ACTION |
| events.venue_id | venues.id | NO ACTION |
| events.organizer_id | organizers.id | NO ACTION |
| ticket_types.session_id | event_sessions.id | NO ACTION |
| ticket_types.section_id | venue_sections.id | NO ACTION |
| seat_inventory.session_id | event_sessions.id | NO ACTION |
| seat_inventory.ticket_type_id | ticket_types.id | NO ACTION |
| seat_inventory.order_id | orders.id | NO ACTION |
| orders.user_id | users.id | NO ACTION |
| orders.session_id | event_sessions.id | NO ACTION |
| tickets.order_id | orders.id | NO ACTION |
| tickets.session_id | event_sessions.id | NO ACTION |
| tickets.ticket_type_id | ticket_types.id | NO ACTION |
| ticket_scans.ticket_id | tickets.id | NO ACTION |
| ticket_scans.scanned_by_user_id | users.id | NO ACTION |
| settlements.organizer_id | organizers.id | NO ACTION |
| event_reviews.user_id | users.id | **CASCADE** |
| users.organizer_id | organizers.id | SET NULL |

### 3.2 Declared in repo schema / Drizzle but **MISSING live** (FACT)

| Expected FK | Risk if cleanup assumes cascade/integrity |
|---|---|
| venue_sections.venue_id → venues | Orphan sections possible if venue deleted |
| event_sessions.event_id → events | Orphan sessions possible |
| ticket_types.event_id → events | Orphan types possible |
| orders.event_id → events | Orphan orders possible (app still joins) |
| settlements.event_id → events | Orphan settlements possible |
| event_reviews.event_id → events | Orphan reviews possible |
| tickets.seat_id → seats | Seat delete can leave dangling ticket.seat_id |
| cities.taluka_id → talukas | Invalid taluka_id possible |
| coupons.event_id → events | Soft ref only |
| event_images.event_id → events | Table empty |

**Implication:** Hard-delete of venues/events is **unsafe** even with zero app-visible deps — prefer soft unpublish / `verification_status='unverified'` / archive flags. Adding missing FKs is a **separate migration** after orphan scans.

---

## 4. Order → ticket → payment relationships (actual)

```
venues
  └─ events.venue_id
       ├─ event_sessions.event_id          (NO live FK)
       │    ├─ ticket_types.session_id
       │    ├─ seat_inventory.session_id
       │    ├─ orders.session_id
       │    └─ tickets.session_id
       ├─ ticket_types.event_id            (NO live FK)
       ├─ orders.event_id                  (NO live FK)
       ├─ settlements.event_id             (NO live FK)
       └─ event_reviews.event_id           (NO live FK)

orders
  ├─ payment fields ON the order row (razorpay_order_id, razorpay_payment_id, payment_status)
  └─ tickets.order_id
       └─ ticket_scans.ticket_id

seat_inventory.order_id → orders (when booked)
tickets.seat_id → seats (optional; NO live FK)
```

**FACT:** There is **no** separate `payments` table. Gateway IDs live on `orders`.

---

## 5. Full venue catalogue (live dependency matrix)

Columns: `ID | Name | City text | Dist FK | City FK | Verif | Sec | Seats | Evt | Ord | Tkt | Scan | Setl | Rev`

| ID | Name | City | Dist | CityId | Ver | Sec | Seats | Evt | Ord | Tkt | Scn | Set | Rev |
|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Bal Gandharva Rang Mandir | Pune | 26 | — | verified | 4 | 550 | 24 | **38** | **90** | 0 | **42** | **84** |
| 2 | Dinanath Mangeshkar Natyagruha | Mumbai | **26⚠** | — | verified | 3 | 114 | 1 | 0 | 0 | 0 | 0 | **5** |
| 3 | Yashwantrao Chavan Natyagruha | Pune | 26 | — | verified | 3 | 114 | 3 | **7** | **14** | 0 | **5** | 0 |
| 4 | Dr. Kashinath Ghanekar Natyagruha | Thane | **26⚠** | — | verified | 3 | 114 | 1 | 0 | 0 | 0 | 0 | 0 |
| 5 | PVR INOX: The Pavillion Mall | Pune | **17⚠** | — | verified | 2 | 48 | 11 | **16** | **23** | **10** | **11** | **5** |
| 6 | Cinepolis: Westend Mall | Pune | **17⚠** | — | verified | 3 | 114 | 9 | **11** | **29** | 0 | **11** | 0 |
| 7 | PVR INOX: R City Mall | Mumbai | 17 | — | verified | 3 | 114 | 10 | 0 | 0 | 0 | **2** | 0 |
| 8–28 | (seed / district fillers — see JSON) | … | … | — | mix | … | … | mostly 0 | 0 | 0 | 0 | 0 | some reviews |
| 29 | Dhule Cultural Hall | Dhule | 9 | **30** | verified | 3 | 48 | 1 | **1** | **4** | 0 | **1** | **4** |
| 30–52 | district town halls / cultural centres | … | set | — | many unverified | 3 | 114 | 0* | 0 | 0 | 0 | 0 | 0 |
| 53 | Yashwantrao Chavan Natyagruha (**dup of 3**) | Pune | 26 | — | verified | 3 | 114 | 0 | 0 | 0 | 0 | 0 | 0 |
| 54 | Balgandharva Tilak Smarak Mandir | Pune | 26 | — | verified | 3 | 114 | 0 | 0 | 0 | 0 | 0 | 0 |
| 55 | Nehru Memorial Hall (**auth**) | Pune | 26 | — | verified | 3 | 114 | 0 | 0 | 0 | 0 | 0 | 0 |
| 56 | Shivaji Mandir (**auth**) | Mumbai | 17 | — | verified | 3 | 114 | 1 | 0 | 0 | 0 | 0 | 0 |
| 57 | Ravindra Natya Mandir | Mumbai | 17 | — | verified | 3 | 114 | 1 | 0 | 0 | 0 | 0 | 0 |
| 58 | Chhabildas Hall | Mumbai | 17 | — | verified | 3 | 114 | 0 | 0 | 0 | 0 | 0 | 0 |
| 59 | Jamshed Bhabha Theatre (NCPA) (**auth**) | Mumbai | — | — | verified | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 60 | Tata Theatre (NCPA) (**auth**) | Mumbai | — | — | verified | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 61 | Godrej Dance Theatre (NCPA) (**auth**) | Mumbai | — | — | verified | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 62 | Bharat Natya Rang Mandir (**auth**) | Pune | — | — | verified | 3 | 70 | 1 | 0 | 0 | 0 | 0 | 0 |
| 63 | Ram Krishna More Auditorium (**auth**) | Pune | — | — | verified | 3 | 70 | 1 | 0 | 0 | 0 | 0 | 0 |
| 64 | Vithal Tupe Sabhagruh (**auth**) | Pune | — | — | verified | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 65 | Sudarshan Rangmanch (**auth**) | Pune | 26 | **2** | verified | 3 | 150 | 0 | 0 | 0 | 0 | 0 | 0 |
| 66 | Lokshahir Annabhau Sathe Natyagruha (**auth**) | Pune | 26 | **2** | verified | 3 | 400 | 0 | 0 | 0 | 0 | 0 | 0 |

\*Except venues with events listed in §0. Full per-row dump in JSON.

**Authoritative allowlist (repo FACT):** `data/authoritative_theatres.json` → IDs **55,56,59–66**. Seed-updated (not auto-eligible): **8,9**. Pending owner: **53,54,57,58**.

---

## 6. Duplicate venue comparison

### 6.1 Dinanath Mangeshkar Natyagruha — **#2 vs #12**

| Field | #2 (keep candidate) | #12 (archive candidate) |
|---|---|---|
| Address | Vile Parle East, Mumbai | same |
| district_id | **26 Pune (WRONG for Mumbai)** | **33 Thane (WRONG for Vile Parle)** |
| city_id | null | null |
| capacity | 900 | 950 |
| sections/seats | 3 / 114 | 3 / 114 |
| events | 1 (`Natsamrat`, unpublished, 6 sessions, 0 orders) | **0** |
| orders/tickets/scans/settlements | 0 | 0 |
| reviews | **5** (via event) | 0 |
| created_at | 2026-10-17 | 2026-10-17 (+1s) |

**FACT:** Neither row has orders/tickets. **#2** has event + reviews → **must retain**.  
**Proposed (ASSUMPTION until owner approves):** Soft-retire **#12** (`verification_status='unverified'`, do not delete sections/seats). Fix **#2** district only with address evidence (Mumbai Suburban vs City — **do not guess**; needs owner/address pin).

### 6.2 Yashwantrao Chavan Natyagruha — **#3 vs #53**

| Field | #3 (KEEP — protected) | #53 (archive candidate) |
|---|---|---|
| Address | Kothrud, Pune | same |
| district_id | 26 Pune | 26 Pune |
| capacity | 700 | 114 |
| events | **3** (incl. completed + published) | **0** |
| orders / tickets | **7 / 14** | 0 |
| settlements | **5** | 0 |
| created_at | 2026-10-17 | 2026-10-26 |

**FACT:** **#3 is protected history.** Never merge/delete #3.  
**Proposed:** Soft-retire **#53** only after confirming no future admin intent; do not move financial history.

**Never merge by name alone** — confirmed by differing capacities, district errors, and asymmetric deps.

---

## 7. Classification buckets (cleanup rules)

| Bucket | Rule | Examples (FACT / ASSUMPTION) |
|---|---|---|
| **A Confirmed duplicates** | Soft-archive loser; keep winner; no DELETE if any event/order/review | A: #12 vs #2; #53 vs #3 |
| **B Demo / filler, zero protected deps** | Soft-unpublish / unverified; **no hard delete** without owner list | Many #20,#27,#30–52 unverified town halls — **ASSUMPTION** they are fillers until owner confirms |
| **C Genuine remain** | Keep; complete location FKs | Allowlist 55,56,59–66; historic #1, #3 |
| **D Protected history** | Retain forever; fix location only | #1,#3,#5,#6,#29 (+ #7 settlements; #2 reviews) |
| **E Uncertain** | Manual review | #54,#57,#58; cinema chain rows #5–7; Mumbai City vs Suburban |

**Hard deletes of venues/events/orders/tickets/scans/settlements/reviews/users: FORBIDDEN.**

---

## 8. Maharashtra location hierarchy assessment

### 8.1 Current (live)

```
State (text default 'Maharashtra' on districts/cities/venues)
  └─ districts (36, MH-* codes)
       ├─ talukas (359)
       └─ cities (65) ── optional taluka_id (NO FK)
            └─ venues.city_id (mostly NULL) + venues.district_id (often wrong)
```

**No villages table (FACT).** Urban theatres do not require village assignment.

### 8.2 Target (recommended, backward compatible)

```
State (Maharashtra)
  └─ District (LGD district code)
       └─ Taluka / Sub-district (LGD)
            ├─ City / Town / Locality (catalog; unique name today)
            └─ Village (optional; only where applicable)
                 └─ Venue (theatre)
```

### 8.3 Schema changes required (plan only — not applied)

| Change | Compatibility |
|---|---|
| ADD FK `cities.taluka_id → talukas.id` after orphan check | App already reads column |
| Optional `venues.taluka_id` / `venues.village_id` nullable | Keep `venues.city` text for display |
| Staging table `lgd_import_*` for official codes | Do **not** embed full MH village master in migration |
| Natural key on venues e.g. `(normalized_name, city_id, address_hash)` UNIQUE | Prevents re-import dupes |

**Official sources (reference only; do not invent codes):**  
https://lgdirectory.gov.in/ · data.gov.in LGD catalog · https://mahavillages.mahabhumi.gov.in/

### 8.4 Known mapping defects (FACT)

| Venue | Free-text city | Live district | Issue |
|---:|---|---|---|
| 2 | Mumbai | Pune (26) | Wrong |
| 4 | Thane | Pune (26) | Wrong |
| 5 | Pune | Mumbai City (17) | Wrong |
| 6 | Pune | Mumbai City (17) | Wrong |
| 12 | Mumbai | Thane (33) | Wrong / duplicate |
| 59–64 | Mumbai/Pune | NULL | Missing FKs |

Prepared (not applied) allowlist repairs: `docs/AUTHORITATIVE_LOCATION_REPAIR.sql` for IDs 55,56,59–66.

---

## 9. Backup strategy (before any cleanup)

1. Create schema `theatre_backup_20261027`.
2. `CREATE TABLE … AS TABLE … INCLUDING ALL` is **insufficient alone** for PK/FK/index/trigger fidelity — also:
   - Snapshot row copies with `source_id` + `backed_up_at`
   - Dump `pg_dump --schema-only` for constraint defs separately
   - Record `pg_constraint` / `pg_indexes` definitions into a metadata table
3. Tables to copy (full or venue-scoped):  
   `venues`, `venue_sections`, `seats`, `events`, `event_sessions`, `ticket_types`, `seat_inventory`, plus **order/ticket/scan/settlement/review rows** that join through those venues (keep PII minimization; **never** copy `app_secrets`).
4. Validate: row counts match; spot-check PK sets; restore drill on staging.
5. Restore: re-insert from backup tables inside a transaction; remapping IDs only if sequences advanced — prefer soft-archive so restore = flip status.

---

## 10. Application files that must keep working

### APIs
- `app/api/venues/route.ts`, `app/api/venues/[id]/route.ts`
- `app/api/admin/venues/route.ts`, `app/api/admin/venues/import/route.ts`, `app/api/admin/sections/route.ts`
- `app/api/locations/{districts,cities,talukas}/route.ts`, `app/api/cities/route.ts`, `app/api/geo/route.ts`
- `app/api/events/**`, `app/api/sessions/[sessionId]/seats/route.ts`
- `app/api/orders/**`, `app/api/bookings/{hold,confirm,release}/route.ts`
- `app/api/payments/**`, `app/api/scanner/**`, `app/api/admin/settlements/route.ts`

### UI / lib
- `src/components/admin/SuperAdminPanel.tsx`, `TheatreSeatDesigner.tsx`, `OrganizerConsole.tsx`
- `src/db/schema.ts`, `src/lib/inventory-engine.ts`
- Public event listing / city filters (home + event detail pages)

### Android
- Shares same `/api/*` — any venue_id / city filter change must preserve response shapes.

**Likely code changes after cleanup (if any):** admin venue scope/filter already uses authoritative allowlist; no mandatory app change if cleanup is soft-status only. Adding `taluka_id` on venues would need API + admin form updates.

---

## 11. Proposed real theatres (verification-gated)

**Already in DB with insert provenance (FACT — allowlist):** see `data/authoritative_theatres.json` (55,56,59–66). Capacities/coords only where previously sourced; NCPA 59–61 have **0 seats** (layout pending — correct).

**Do not invent** capacities, seat maps, or chain-location proofs. Future inserts must ship with: official name, Marathi if verified, address, city, district, taluka if verified, village only if applicable, PIN/lat/lng if verified, `verification_status`, source URL + verification date.

Village master: import LGD into staging → validate → map; **do not** embed incomplete lists silently.

---

## 12. Pre-execution checklist

- [ ] Owner reviewed this audit + JSON dump
- [ ] Confirm host is intended target (prod vs staging)
- [ ] `pg_dump` / backup schema created and row counts verified
- [ ] Approval artifact lists exact venue IDs for soft-archive and FK updates
- [ ] Duplicate losers (#12, #53) confirmed zero new deps since audit timestamp
- [ ] Mumbai City vs Suburban decisions for NCPA / Vile Parle documented with address evidence
- [ ] SQL dry-run on staging clone first
- [ ] `app_secrets` excluded from any export
- [ ] Rollback procedure rehearsed

## 13. Post-execution validation checklist

- [ ] Venue count ≥ pre-count (no unexpected deletes)
- [ ] Orders/tickets/scans/settlements/reviews counts unchanged
- [ ] Duplicate losers `verification_status='unverified'` (or agreed archive)
- [ ] Allowlist venues have correct `city_id`/`district_id`
- [ ] No orphan `seat_inventory` / tickets for active sessions
- [ ] Public `/api/venues` and admin authoritative scope still return expected IDs
- [ ] Scanner verify still works for venues with history (#5)
- [ ] Backup row counts match pre-change snapshots

## 14. Rollback / restore

1. If only soft-status changes: `UPDATE venues SET verification_status='verified' WHERE id IN (…)`.
2. If FK updates: restore `district_id`/`city_id` from `theatre_backup_*.venues`.
3. If accidental deletes (must not happen): restore from backup tables in reverse FK order (scans→tickets→orders→inventory→types→sessions→events→seats→sections→venues).
4. Keep migration transaction short; abort on assert failure.

---

## 15. Deliverables index

| # | Artifact |
|---|---|
| 1 | This file — `docs/THEATRE_DATABASE_FINAL_AUDIT.md` |
| 2 | Live dump — `docs/THEATRE_DATABASE_FINAL_AUDIT_DATA.json` (§2–6 FK/deps/dupes) |
| 3 | Hierarchy — §8 above |
| 4 | SQL (review only) — `supabase/migrations/20261027_theatre_catalogue_cleanup.sql` |
| 5 | Theatre list — §11 + `data/authoritative_theatres.json` |
| 6–9 | Checklists §12–14 |
| 10 | App files §10 |

**Next step after your review:** approve ID lists for soft-archive + location FK updates; then staging dry-run of the SQL. No production apply until you say so.
