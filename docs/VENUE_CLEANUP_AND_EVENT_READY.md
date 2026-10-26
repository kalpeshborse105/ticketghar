# Venue cleanup + event-creation readiness

**Not an audit-only note.** Implements allowlist, API gates, and a dry-run retire script.

## Authoritative new theatres (retained for new events)

Provenance: **insert lineage**, not name match alone. Seed/audit catalogue was IDs **1–58**. Post-approval inserts for new-event allowlist:

IDs: **55, 56, 59, 60, 61, 62, 63, 64, 65, 66**

- **59–61** — NCPA halls inserted by `apply-approved-cleanup-and-venues.ts`
- **62–66, 55, 56** — civic halls inserted by `upsert-real-pune-venues.ts` (not found → INSERT)
- **8, 9** — seed-era rows only *updated* by those scripts → `seedUpdatedManifestIds` (not auto-eligible)

Source of truth file: `data/authoritative_theatres.json`

## Location mapping rules now enforced

1. `venues.city_id` → `cities.id`; `venues.district_id` → `districts.id`
2. Admin venue write rejects city/district mismatch
3. City resolution never first-match on ambiguous normalized names (`scripts/lib/venue-location-repair-core.ts`)
4. Mumbai City vs Suburban never inferred from free-text `"Mumbai"` alone
5. Public `/api/venues` no longer invents hardcoded venues or fake IDs
6. Event create requires authoritative + `verification_status=verified` venue ID

## Obsolete retirement (soft)

- Script: `scripts/retire-obsolete-venues.ts` (default dry-run)
- Action on apply: `venues.verification_status = 'unverified'` for inventory obsolete IDs with zero orders/tickets/scans/reviews
- Soft-unpublish disposable published events on those venues
- **Never** hard-deletes protected history venues (`protectedPreserveIds`)

## Commands

```bash
# 1) Refresh live inventory (read-only)
npx tsx scripts/inventory-venue-provenance.ts

# 2) Offline tests
npx tsx scripts/test-venue-eligibility-and-retire.ts
npx tsx scripts/test-venue-location-repair-logic.ts

# 3) Retire dry-run (read-only plan + docs/VENUE_RETIRE_DRY_RUN.json)
npx tsx scripts/retire-obsolete-venues.ts

# 4) Apply retire — OWNER ONLY after reviewing dry-run (production)
# npx tsx scripts/retire-obsolete-venues.ts --apply --i-confirm-retire --i-confirm-production --baseline=docs/VENUE_PROVENANCE_INVENTORY.json
```

Do **not** run step 4 until the owner approves the exact `retireVenueIds` list in `docs/VENUE_RETIRE_DRY_RUN.json`.
