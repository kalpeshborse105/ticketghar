# Venue ↔ Location repair (Maharashtra)

**Repo tip inspected:** `main` @ `98d42cd` (`db fixed`).  
**Rule:** Report JSON files are snapshots — always re-run a live dry-run before any apply.  
**This workflow never runs `--apply` unless a human supplies a reviewed approval artifact.**

## Schema (authoritative)

| Table | Role |
|-------|------|
| `districts` | 36 Maharashtra districts |
| `talukas` | FK → `districts` |
| `cities` | Unique `name`; optional `district_id`, `taluka_id` |
| `venues.district_id` | Canonical district FK |
| `venues.city_id` | Canonical city FK |
| `venues.city` | Free-text display / legacy |

Hierarchy: **State (Maharashtra) → District → Taluka (on city) → City → Venue**.

`audit_logs` columns used on apply: `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `details`.

## Safety rules

1. Dry-run is the **default** (no writes).
2. Never infer **Mumbai City vs Mumbai Suburban** from city text `"Mumbai"` alone.
3. Never resolve an ambiguous city name by picking the first row.
4. District corrections require **venue id + address evidence** regex match.
5. **No venue merge/delete.** Suspected duplicates are **manual review only** — script does **not** change `verification_status`.
6. Apply requires:
   - `--apply`
   - `--approval=docs/VENUE_LOCATION_REPAIR_APPROVAL.json` (exact `venueId`/`field`/`from`/`to`)
   - `backupConfirmed: true`
   - For production-like hosts: `productionConfirm: "I_CONFIRM_PRODUCTION_WRITE"` **and** CLI `--i-confirm-production`
7. Apply refuses if live `from` values drifted (stale baseline) or approved rows are not in the current plan.
8. Transaction + rollback on failure; idempotent if already at target.
9. Never touches events, orders, tickets, scans, seat layouts, inventory, or reviews.

## Prerequisites

```bash
git rev-parse HEAD
git status -sb
# Confirm DATABASE_URL host family without printing secrets
```

Classify host:

| Hostname pattern | Classification |
|------------------|----------------|
| `*.pooler.supabase.com` / `*.supabase.co` | **PRODUCTION** unless owner confirms dedicated staging |
| `localhost` / `127.0.0.1` | Local |

## Commands

### 1) Read-only audit

```bash
npx tsx scripts/audit-venue-location-mapping.ts
```

Outputs: `docs/VENUE_LOCATION_AUDIT.json`, `docs/VENUE_LOCATION_RECONCILIATION.json`

### 2) Fresh dry-run (required before approval)

```bash
npx tsx scripts/repair-venue-locations.ts
```

Outputs: `docs/VENUE_LOCATION_REPAIR_DRY_RUN.json` with full `proposed[]`, `unresolved[]`, `focusReview`, `duplicateReviews`.

### 3) Offline tests (no DB writes)

```bash
npx tsx scripts/test-venue-location-repair-logic.ts
```

### 4) Apply (owner-only — not run in this task)

1. Take a Supabase/DB backup.
2. Copy `docs/VENUE_LOCATION_REPAIR_APPROVAL.example.json` → `docs/VENUE_LOCATION_REPAIR_APPROVAL.json`.
3. Set `baselineGeneratedAt` to the dry-run `generatedAt`.
4. Copy **only reviewed** rows from `proposed[]` into `changes[]` (exact `from`/`to`).
5. Set `backupConfirmed: true` and production confirm string if needed.
6. Run:

```bash
npx tsx scripts/repair-venue-locations.ts --apply --approval=docs/VENUE_LOCATION_REPAIR_APPROVAL.json --i-confirm-production
```

## Rollback

1. Prefer restore from the backup taken before apply.
2. Or reverse each applied row using dry-run/apply log (`old` → write back to `from` values) inside a transaction.
3. Never DROP tables or re-run destructive seeds to “undo”.

## Focus venues (review checklist)

| ID | Expected district (verified via address) | Notes |
|---:|------------------------------------------|-------|
| 5 | Pune | Pavilion / Senapati Bapat / Shivajinagar |
| 6 | Pune | Westend / Aundh |
| 4 | Thane | Ghodbunder / Thane West |
| 7 | Mumbai Suburban | Ghatkopar (R City) |
| 2, 12 | Mumbai Suburban | Vile Parle East — **duplicate pair, manual review** |
| 3, 53 | Pune (already) | Kothrud — **duplicate pair, manual review** |

## Code map

| Path | Role |
|------|------|
| `scripts/lib/venue-location-repair-core.ts` | Pure resolution + plan + approval validation |
| `scripts/repair-venue-locations.ts` | Live dry-run / gated apply |
| `scripts/audit-venue-location-mapping.ts` | Broader read-only audit |
| `scripts/test-venue-location-repair-logic.ts` | Offline tests |
