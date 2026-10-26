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

## Formal audit package + owner-approved apply (2026-10-26)

See:

- `docs/DB_AUDIT_REPORT.md`
- `docs/DATA_CLEANUP_PREVIEW.sql`
- `docs/MAHARASHTRA_VENUE_SOURCES.md`
- `data/maharashtra_venues_candidates.json`
- `data/authorized_event_import_template.csv`
- `data/pending_public_listings_for_approval.csv` (public listings — **not** auto-imported as sellable)

### Applied after owner approval

- Soft-unpublished remaining zero-dep filler (**#95**)
- Historical published+orders+no-future → **`completed`** (15 events; orders/tickets kept)
- Venue name/city fixes (Dinanath, Yashwantrao, Bal Gandharva capacity 989, Ravindra 911)
- 18 generic Town Hall / Cultural Hall placeholders → `verification_status=unverified`
- Added verified NCPA halls + real Pune/Mumbai civic theatres
- Moved **Ramayan** off Dhule Cultural Hall → Yashwantrao Chavan Natyagruha; **Jailer 2** → PVR INOX Pavilion

BookMyShow inventory scrape/import as sellable tickets: **not done** (policy). Public listing titles saved for owner approval only.
