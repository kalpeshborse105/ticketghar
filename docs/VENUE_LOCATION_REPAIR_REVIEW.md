# Venue location repair — review report

**Generated from live dry-run:** see `docs/VENUE_LOCATION_REPAIR_DRY_RUN.json` → `summary.generatedAt`  
**Git tip inspected:** `main` @ `98d42cd0d84d980c4e7be8a91e6bf9ec2a4118fe`  
**`--apply` executed:** **No**

## a. Database host classification

| Field | Value |
|-------|--------|
| Classification | **supabase-pooler — treat as PRODUCTION** unless owner confirms dedicated staging |
| Credentials printed | No |

## b. Actual audit counts

Re-run timestamps live in `VENUE_LOCATION_REPAIR_DRY_RUN.json` / `VENUE_LOCATION_AUDIT.json`.

| Metric | Count |
|--------|------:|
| Venues | 66 |
| `city_id` NULL | 65 |
| `district_id` NULL | 8 |
| Districts / cities / talukas | 36 / 65 / 359 |

## c. Proposed updates by field

Latest dry-run `generatedAt`: **2026-10-26T18:15:24.632Z**

| Field | Proposed |
|-------|----------:|
| `city_id` | **65** |
| `district_id` | **14** |
| Total field updates | **79** |
| `verification_status` | **0** (never auto-changed) |

All proposed rows carry `evidenceLevel: "verified"` (unique city match or address-evidenced district correction). Heuristic-only district guesses are **not** applied.

Full list: `docs/VENUE_LOCATION_REPAIR_DRY_RUN.json` → `proposed[]`.

## d. Unresolved mappings

**0** in the latest dry-run. Mumbai City vs Suburban is only set when address evidence matches (e.g. Ghatkopar / Vile Parle → Suburban; Nariman Point / NCPA → City). Bare `"Mumbai"` without locality evidence would be left unresolved (covered by tests).

## e. Duplicate review

| Pair | Deps summary | Action |
|------|----------------|--------|
| #2 keep / #12 other | #2: events+reviews; #12: zero events/orders/tickets | **manual_review_only** — no unverify/merge |
| #3 keep / #53 other | #3: events+orders+tickets; #53: zero booking deps | **manual_review_only** — no unverify/merge |

## f. Focus venues (verified vs heuristic)

| ID | Fact (address) | Proposed |
|---:|----------------|----------|
| 5 | Pune / Shivajinagar | `city_id→Pune`, `district_id 17→26` |
| 6 | Pune / Aundh | `city_id→Pune`, `district_id 17→26` |
| 4 | Thane West / Ghodbunder | `city_id→Thane`, `district_id 26→33` |
| 7 | Ghatkopar West | `city_id→Mumbai`, `district_id 17→18` Suburban |
| 2, 12 | Vile Parle East | `city_id→Mumbai`, `district_id→18` Suburban |
| 3, 53 | Kothrud Pune | `city_id→Pune` only (district already 26) |

**Note:** Older audit “heuristic” that mapped bare Mumbai→Mumbai City is **not authoritative** and was corrected in the audit script.

## g. Tests run (actual)

```text
npx tsx scripts/test-venue-location-repair-logic.ts
→ test-venue-location-repair-logic: ALL OK
```

Covered: ambiguous city refuse-first-match, Mumbai null-district block, renamed cities, address-evidenced districts, NCPA Nariman Point, stale approval, production flag, backup gate, idempotent baseline.

TypeScript: executed via `tsx` (same path as repair scripts). No production writes.

## Exact next dry-run command

```bash
npx tsx scripts/repair-venue-locations.ts
```

Do **not** run `--apply` until an owner-written `docs/VENUE_LOCATION_REPAIR_APPROVAL.json` exists (see example file) with backup + production confirmations.
