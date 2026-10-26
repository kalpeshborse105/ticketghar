# DATABASE MIGRATION PLAN

**Status:** Plan only — **do not run against production without explicit approval.**

## References

- Intended app schema: `src/db/schema.ts`
- Bootstrap SQL (may lag): `supabase/schema.sql`
- Existing migrations: inspect `supabase/migrations/` / project migration folder before adding files

## Reported gaps (verify before migrating)

| Item | Risk | Action |
|------|------|--------|
| `event_reviews` | Medium | Add table only if queries require it and table missing |
| `event_images` | Medium | Align with admin upload `event-media` |
| `home_sections` | Low | Admin homepage |
| `users.avatar_url` | Low | Profile |
| `coupons.used_count` | High (billing) | Counter + unique usage constraints |

## Rules

1. Forward-only migrations  
2. No `TRUNCATE` / broad `DELETE` / `DROP` without approval  
3. Preserve orders, payments, tickets, scans, settlements  
4. Test on staging first  
5. Backup + recovery notes required in PR description  

## Prepared migration

File: `supabase/migrations/20261026_finalization_schema_gaps.sql`

- `coupons.used_count`
- `events.rejection_reason`
- `users.avatar_url`
- `event_reviews` table IF NOT EXISTS

**Status (2026-10-26):** Verified against live DB via `npx tsx scripts/run-finalization-migration.ts`.  
All four objects **already present** — migration is a safe no-op. Catalog counts at check: venues 52, events 35, sessions 109, seats 6232, reviews 115.

## Next step (blocked on approval)

1. Compare live DB columns to `schema.ts`
2. Dry-run migration on staging
3. Explicit approval for production
