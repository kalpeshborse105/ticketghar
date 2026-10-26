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

## Executed 2026-10-26 (soft only — prior session)

- Soft-unpublished events with **0 upcoming sessions** and **0 orders** (`status=unpublished`). See live status in `docs/DB_AUDIT_RAW.json`.
- Inventory snapshot: `docs/EVENTS_INVENTORY_2026-10-26.json`.
- **No hard DELETE** of events/orders/tickets.

## Formal audit package (2026-10-26 — mutations NOT run)

See:

- `docs/DB_AUDIT_REPORT.md`
- `docs/DATA_CLEANUP_PREVIEW.sql` (**preview only — await owner approval**)
- `docs/MAHARASHTRA_VENUE_SOURCES.md`
- `data/maharashtra_venues_candidates.json`
- `data/authorized_event_import_template.csv`

BookMyShow scrape: **not done** (unauthorized).
