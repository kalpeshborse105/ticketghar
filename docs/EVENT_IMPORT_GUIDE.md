# EVENT IMPORT GUIDE

## Authorization

**Do not scrape BookMyShow or copy proprietary catalog assets.**

Supported paths:

1. Licensed / official provider API (credentials TBD — not configured in repo)  
2. Organizer-supplied CSV/JSON  
3. Manual admin create/edit in the web admin panel  

If no authorized feed is configured, use admin CRUD or a dry-run CSV importer (to be added when format is approved).

## Import rules

- Idempotent on stable external IDs  
- Validate venues, sessions, pricing, posters  
- Reject expired showtimes  
- Do not invent seat layouts or availability  
- Listing ≠ permission to sell — require organizer authorization + inventory model before booking  

## Current operational path

Create/publish events via **web admin** → shared DB → `/api/events` → website + Android.
