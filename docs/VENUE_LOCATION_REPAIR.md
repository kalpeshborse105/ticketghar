# Venue ↔ Location repair (Maharashtra)

## Diagnosis (live DB, 2026-10-26)

| Metric | Value |
|--------|------:|
| Venues | **66** |
| `city_id` NULL | **65** |
| `district_id` NULL | **8** (includes newly upserted NCPA / Pune halls #59–66) |
| Districts / cities / talukas | 36 / 65 / 359 |

### Why “new theatres” looked missing in admin

They **are in the database** (e.g. #62–66 Bharat Natya, Sudarshan, Annabhau Sathe; #59–61 NCPA). Upsert scripts wrote **free-text `city` only** and left `district_id` / `city_id` null. Admin district filters and slow full layout fetches made the catalog feel stuck on the older ~58–66 mix without clear mapping.

### Authoritative fields

| Field | Role |
|-------|------|
| `venues.district_id` → `districts` | Canonical district |
| `venues.city_id` → `cities` | Canonical city/town/village |
| `cities.taluka_id` → `talukas` | Taluka (on city row, not venue) |
| `venues.city` (text) | Display / legacy; must agree with `city_id` |

Hierarchy: **Maharashtra → districts → talukas → cities → venues**.

### Confirmed wrong districts (examples)

| ID | Venue | Was | Expected |
|---:|-------|-----|----------|
| 5 | PVR INOX: The Pavillion Mall | Mumbai City | **Pune** |
| 6 | Cinepolis: Westend Mall | Mumbai City | **Pune** |
| 4 | Dr. Kashinath Ghanekar Natyagruha | Pune | **Thane** |
| 2 / 12 | Dinanath Mangeshkar Natyagruha | Pune / Thane | **Mumbai Suburban** |
| 7 | PVR INOX: R City Mall | Mumbai City | **Mumbai Suburban** (Ghatkopar) |

### Duplicates (do not hard-delete)

| Keep | Soft-flag | Deps |
|-----:|----------:|------|
| #2 Dinanath | #12 | #12 has 0 events |
| #3 Yashwantrao Chavan | #53 | #53 has 0 events; #3 has orders |

### Root cause of bad auto-links

`scripts/import_maharashtra_admin_data.ts` previously used **hardcoded** `district_id = 8` for Pune and `1` for Mumbai — those IDs are **not** Pune/Mumbai in the live catalog (Pune=`26`, Mumbai City=`17`, Ahmednagar=`1`). That script is corrected to join via `cities`.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/audit-venue-location-mapping.ts` | Read-only audit + reconciliation JSON |
| `scripts/repair-venue-locations.ts` | Dry-run by default; `--apply` writes |

### Safe apply

```bash
npx tsx scripts/audit-venue-location-mapping.ts
npx tsx scripts/repair-venue-locations.ts
# review docs/VENUE_LOCATION_REPAIR_DRY_RUN.json
npx tsx scripts/repair-venue-locations.ts --apply   # only after owner approval
```

Hosted `*.pooler.supabase.com` is treated as **production**. Do not `--apply` without explicit approval.

## App changes

- Admin `GET /api/admin/venues` defaults to **lite** list (no nested seats); `?id=` loads full layout for seat designer.
- Venue POST rejects district/city mismatches (except Mumbai City vs Suburban).
- Admin venues UI: Unmapped filter/badge; designer loads full venue by id.

## Rollback

Re-apply previous `district_id` / `city_id` from `docs/VENUE_LOCATION_REPAIR_DRY_RUN.json` (`from` values), or restore from Supabase backup. No DROP/DELETE of venues.
