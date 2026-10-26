# MahaTicket — Database Audit Report

**Generated:** 2026-10-26 (IST)  
**Mode:** Read-only inspection + repository review + public venue research  
**Mutations in this task:** **NONE** (STOP before any write SQL)

---

## 1. Connection classification

| Field | Value |
|--------|--------|
| Configured | Yes (`DATABASE_URL` present in local `.env`) |
| Host family | Supabase pooler (`*.pooler.supabase.com`, region `ap-south-1`) |
| Database name | `postgres` |
| Port | `6543` (transaction pooler) |
| Secrets printed | **No** |
| Classification | **Hosted Supabase — treat as PRODUCTION unless the owner confirms a dedicated staging project** |

**Evidence source:** live connection metadata only (hostname/database/port). Full URL/password not recorded.

---

## 2. Evidence sources

| Finding type | Source |
|--------------|--------|
| Table counts, event statuses, dependencies, capacity mismatches, venue fuzzy pairs | **Live DB** via `scripts/db-audit-readonly.ts` → `docs/DB_AUDIT_RAW.json`, `docs/DB_AUDIT_VENUES_RAW.json` |
| Column names / status enums | **Repo** `src/db/schema.ts` + live `information_schema.columns` |
| Seed / demo origins | **Repo** `supabase/seed.sql`, `scripts/seed-*.ts`, `docs/DATA_CLEANUP_PLAN.md` |
| Prior soft-unpublish note | **Repo** `docs/DATA_CLEANUP_PLAN.md` (18 IDs) — verified against live status |
| Venue public capacities (NCPA, Bal Gandharva, Ravindra) | **Public research** (official venue pages / PMC reporting / academy rate chart) |
| BookMyShow / third-party ticket inventory | **Not scraped** (policy) |

---

## 3. Live counts (public schema)

| Entity | Count |
|--------|------:|
| venues | 58 |
| venue_sections | 174 |
| seats | 6,916 |
| events | 35 |
| event_sessions | 109 |
| ticket_types | 491 |
| seat_inventory | 30,220 |
| orders | 73 |
| tickets | 160 |
| ticket_scans | 0 |
| users | 16 |
| event_reviews | 115 |
| settlements | 73 |
| audit_logs | 86 |
| organizers | 4 |
| coupons | 4 |

### Event status distribution

| status | n |
|--------|--:|
| published | 18 |
| unpublished | 17 |

### Session status distribution (live)

See `DB_AUDIT_RAW.json` → `sessionStatuses` (values include `active` / `completed` / `cancelled` per schema comment).

### Order payment statuses

See `DB_AUDIT_RAW.json` → `orderPaymentStatuses` (schema: `pending` \| `captured` \| `failed` \| `refunded`).

---

## 4. Suspicious naming / demo markers

**Live query** for `[SEED]`, `demo`, `test`, `placeholder`, `fake`, `sample`, `dummy`, `lorem ipsum` in titles/slugs/descriptions:

| Result |
|--------|
| **0 rows** |

Repo still contains **demo seed scripts** (`supabase/seed.sql` labeled DEMO, `scripts/seed-demo-events.ts`, etc.). Those scripts are **not** proof that every live event is demo — many live titles look like real Marathi/cinema names but may be catalog fillers without organizer authorization.

---

## 5. Events with no future sessions (by status)

Live aggregation (`noFutureSessionsByStatus`): published + unpublished events whose latest bookable window has passed dominate the catalog.

| Pattern | Finding |
|---------|---------|
| Published + no future sessions | **16** events (see §7) |
| Unpublished + no future sessions | Most of the 17 unpublished set |
| Future sessions + inventory | **Only 2** events |

---

## 6. Events with future sessions + inventory (sellable window)

| ID | Title | Status | Future sessions | Inventory rows | Available |
|---:|-------|--------|----------------:|---------------:|----------:|
| 93 | Jailer 2 | published | 1 | 550 | 548 |
| 94 | Ramayan | published | 1 | 48 | 48 |

**Note:** Presence of inventory ≠ organizer authorization to sell. Treat as technical readiness only.

---

## 7. Published events with no upcoming bookable sessions

| ID | Title | Orders | Proposed action |
|---:|-------|-------:|-----------------|
| 9 | Punha Sahi Re Sahi | 2 | **PROTECT** — keep; optional lifecycle → `completed` after owner approval |
| 10 | Ghashiram Kotwal | 8 | **PROTECT** |
| 11 | Sur Nava Dhyas Nava | 1 | **PROTECT** |
| 20 | Pune Standup Night | 1 | **PROTECT** |
| 21 | Balgandharva Music Evening | 1 | **PROTECT** |
| 29 | Eka Lagnachi Pudhchi Gosht | 1 | **PROTECT** |
| 30 | Sur Nava Dhyas Nava | 7 | **PROTECT** (possible duplicate title of #11 — do not merge without review) |
| 33 | Folk Lok | 1 | **PROTECT** |
| 34 | Dandiya Nights 2026 | 7 | **PROTECT** |
| 49 | Vasantotsav 2026 Live | 4 | **PROTECT** |
| 84 | Pushpa 2: The Rule | 2 | **PROTECT** |
| 85 | Juna Furniture | 11 | **PROTECT** |
| 87 | Baipan Bhaari Deva 2 | 11 | **PROTECT** |
| 90 | Jar Tar Chi Goshta | 7 | **PROTECT** |
| 92 | Shree Tashi Sau | 7 | **PROTECT** |
| 95 | Punha Sahi Re Sahi | 0 | Soft-unpublish **candidate** (see §9) |

---

## 8. Events with financial / ticket / review dependencies

**30 events** have at least one of: orders, tickets, or reviews (`withDependencies` in raw JSON).

**Hard rule:** never delete these. Do not soft-unpublish solely for “old date” if orders/tickets/payments/scans/settlements exist.

| Preserve always | Rationale |
|-----------------|-----------|
| orders, tickets, ticket_scans | Customer access + gate history |
| settlements, audit_logs | Financial / compliance |
| event_reviews | User-generated content tied to `event_id` |

**Prior soft-unpublish caveat (already executed outside this task):** IDs `12,13,14,15,16,18,19,26,27,28,31,32,47,48,86,88,91` (and previously listed `95`) were set to `unpublished` with zero orders, but **many still have reviews**. This task does **not** reverse or extend that change. Reviews remain; events are just off the public catalog.

---

## 9. Soft-unpublish candidates (this audit only)

Strict criteria for **new** mutation proposals:

- `status = 'published'`
- **0** orders, tickets, scans, reviews
- no future sessions **or** obvious demo naming

| ID | Title | Orders | Tickets | Reviews | Future | Proposed |
|---:|-------|-------:|--------:|--------:|-------:|----------|
| 95 | Punha Sahi Re Sahi | 0 | 0 | 0 | 0 | Soft → `unpublished` **if approved** |

All other published-no-future rows have orders → **excluded**.

Preview SQL: `docs/DATA_CLEANUP_PREVIEW.sql` (not executed).

---

## 10. Venue duplicates

### Exact `(normalized name, city)` duplicates

**0** (live).

### Fuzzy / human-review pairs (live heuristic)

| Pair | Assessment |
|------|------------|
| `#2` Dinanath Mangeshkar Natyagruha (Mumbai) vs `#12` … Natya Griha (Vile Parle) | **Likely same landmark** — different city string; **do not auto-merge** |
| `#3` Yashwantrao Chavan Natyagruha (Pune) vs `#53` … Natya Gruha (Pune) | **Likely seed duplicate** — capacities 700 vs 114; review before any action |
| Kalidas Nashik vs Kalidas Thane | Different cities — **not duplicates** |
| Bal Gandharva Pune vs Sangli | Different cities — **not duplicates** |
| Tilak Smarak Mandir vs Bal Gandharva | Different Pune venues — **not duplicates** |

---

## 11. Capacity integrity

### Venue `total_capacity` vs physical `seats` count

**52** venues mismatch when both capacity and seats > 0. Pattern: seed `total_capacity` often 400–2000 while generated seat layouts are ~48–140 (admin templates).

**Interpretation:** `total_capacity` is **not** authoritative inventory. Seat maps are **approximate templates** (`is_template` commonly 1). Do not “fix” capacity by inventing seats.

### Section `rows_count * cols_count` vs generated seats

**7** sections mismatch (configured ≠ seat rows). Notable: sections with `seat_count = 0` but configured grid > 0 (layout not generated).

---

## 12. Schema notes (verified)

From `src/db/schema.ts` + live columns:

- Event statuses include: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `published`, `unpublish`, `unpublished`, `cancelled`, `completed`
- **No** `deleted_at`, `is_demo`, or `archived` column exists
- Lifecycle recommendation: use existing `completed` / `unpublished` / `cancelled` — do not invent columns without a separate migration plan
- Prices / fees are **paise** integers
- `venue_sections` has **no** `capacity` column — use `rows_count * cols_count`

---

## 13. Lifecycle proposal (recommendation only)

| Situation | Recommended status | Public catalog | History |
|-----------|--------------------|----------------|---------|
| Future bookable + approved | `published` | Yes | — |
| Past shows + has orders/tickets | `completed` (preferred) or keep `published` until ops migrates | Hide from booking lists via session filter | Preserve |
| Confirmed demo / unauthorized filler, zero deps | `unpublished` | No | Reversible |
| Organizer cancelled | `cancelled` | No | Preserve |

App already filters bookable sessions with `session_start_time > now()` on public `/api/events` unless `includeEnded=1`.

---

## 14. Prior cleanup vs this task

| Item | Status |
|------|--------|
| Soft-unpublish of 18 zero-order events (2026-10-26 earlier session) | Already applied on this DB — **out of scope for new execution** |
| This Phase B SQL | Preview only; targets remaining candidate **#95** (+ optional `completed` suggestions for historical sold-out shows) |
| Hard DELETE / TRUNCATE / DROP | **Forbidden** |

---

## 15. Deliverables index

| File | Purpose |
|------|---------|
| `docs/DB_AUDIT_REPORT.md` | This report |
| `docs/DB_AUDIT_RAW.json` | Full live query payload |
| `docs/DB_AUDIT_VENUES_RAW.json` | Venue dump + fuzzy pairs |
| `docs/DATA_CLEANUP_PREVIEW.sql` | Preview + proposed mutations (**do not run until approved**) |
| `docs/MAHARASHTRA_VENUE_SOURCES.md` | Source notes for venue catalogue |
| `data/maharashtra_venues_candidates.json` | Candidate venue master data |
| `data/authorized_event_import_template.csv` | Organizer-authorized import template |

---

## 16. Stop gate

**No mutation SQL from this task has been executed.**  
Owner must review `DATA_CLEANUP_PREVIEW.sql` and explicitly approve before any `BEGIN` transaction is run against this Supabase project.
