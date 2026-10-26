# EVENT IMPORT GUIDE

## Authorization — hard rules

**Do not scrape BookMyShow** (or any site’s proprietary posters, descriptions, seat layouts, or anti-bot protected feeds).

Allowed sources only:

1. Licensed / official provider API (credentials must exist in env — none configured in repo today)
2. Organizer-supplied CSV/JSON (authorized listings + sell rights)
3. Manual create/edit in **web admin** (`/admin`)

Listing an event ≠ permission to sell. Enable booking only after organizer authorization + venue layout + pricing + inventory.

## Real Maharashtra theatres (names only)

Public theatre **names/addresses** may be curated via existing seed scripts for **staging** only:

- `npm run db:seed-theaters` — Maharashtra venues (review before any prod run)
- `npm run db:seed-layouts` — seat layouts for templates

**Do not run seed scripts against production without explicit approval.** Prefer admin CRUD for live catalog.

## Recommended production workflow

1. Admin adds venue (real theatre name + city)  
2. Admin/organizer adds event + poster upload (`/api/admin/uploads`)  
3. Add sessions + ticket types + generate inventory  
4. Publish → web + Android both read `/api/events`  

## CSV/JSON importer (when approved)

Idempotent dry-run first: external id, venue resolve, session dates, price INR, poster URL allowlist, no invented seats.

## Applied to live DB (2026-10-26)

- Schema gaps migration verified (already present)
- Maharashtra theatre seed: **58 venues** (6 new + 46 existing)
- Seat layouts built for new venues without sections (**6 layouts**)

## Current blocker for “BookMyShow events”

No authorized BMS/partner feed. **Do not scrape.**  
To list sellable shows: use **web admin** → create event → upload poster → sessions → ticket types → publish. Android/web then read `/api/events`.
