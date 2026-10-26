# DATA CLEANUP PLAN

**Status:** Inventory only — **no deletion executed.**

## Sources of demo / placeholder data

| Source | Classification | Action |
|--------|----------------|--------|
| Mobile hardcoded announcement fallbacks | Confirmed demo | **Removed** — empty list on API failure |
| Mobile Supabase catalog refresh | Unsafe competing source | **Removed** — API + disk cache only |
| Picsum / Unsplash poster fallbacks | Placeholder images | Keep only when DB URL missing; prefer real posters |
| Seed scripts (`db:seed-*`) | Test/demo | Do not run on prod |
| Admin hardcoded sales stats | Fake ops metrics | Replace with DB queries (organizer panel partially done) |

## Must preserve

Users, orders, payments, tickets, ticket scans, audit logs, settlements, financial history.

## Before any DELETE

1. Dry-run SQL with exact IDs  
2. Counts by table  
3. FK impact  
4. Backup plan  
5. Explicit user approval  

No cleanup SQL has been executed in this finalization pass.
