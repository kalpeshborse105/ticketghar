# `data/event-sql` — informational event SQL (REVIEW ONLY)

Same idea as `data/theater-sql`: **SQL files for human review first**.  
**Do not run until you approve.** Nothing in this folder was executed against production in the setup that created it.

---

## Live DB check (after theatre clear + import)

| Item | Count | Meaning |
|---|---:|---|
| `venues` | **409** | Real catalogue rows (4 verified NCPA + 405 research/unverified) |
| `events` / `event_sessions` / `orders` / `tickets` / `seats` | **0** | Clean — no sellable shows yet |
| `users` | 16 | Kept |
| `organizers` | 4 | Restored from backup (were empty after clear — fixed) |

---

## Your product rule (encoded in SQL)

1. Import events as **`status = 'draft'`** (or `'unpublished'`).  
2. Public `/api/events` only returns **`published`** → draft = **not selling**, information/admin only.  
3. **Do not** insert `ticket_types` / `seat_inventory` / seats in info batches.  
4. Optional `event_sessions` may store planned date/time for display in admin — still not bookable while event is draft.  
5. When you have a deal: set seats → ticket types → inventory → flip event to **`published`**. That starts selling.

```
INFO (default)          →  event.status = draft
                           + optional sessions (info)
                           + NO ticket_types / inventory

ENABLE SALE (later)     →  seat layout on venue
                           + ticket_types + seat_inventory
                           + UPDATE events SET status='published'
```

---

## BookMyShow / legal

- **Do not scrape** BookMyShow showtimes, seat maps, prices, or posters into these files.  
- These SQL files are a **format** for *your* authorized or owner-approved catalogue copy (synopsis, language, category, planned dates).  
- Listing “coming soon / info only” is OK with draft status; **sellable** inventory requires organizer/theatre permission.

---

## File map

| File | Purpose |
|---|---|
| `00_platform_info_organizer.sql` | Ensure a dedicated “info catalogue” organizer exists |
| `01_info_event_preview.sql` | Read-only preview join: candidate ↔ venue match |
| `02_info_event_insert_template.sql` | **Template INSERT** — draft events only; ends in `ROLLBACK` |
| `03_enable_sale_checklist.sql` | Comments + example UPDATEs when you go live on one show (do not run blindly) |

Fill VALUES in `02_…` after review (or add city-batch files like theater-sql). Keep the same safety header pattern.

---

## Schema fields used (events)

Required: `organizer_id`, `venue_id`, `title`, `title_mr`, `slug`, `category`, `category_mr`, `description`, `description_mr`, `poster_url`, `status`  
Defaults OK: language, age_guidance, duration, fees  

Sessions (optional info): `event_id`, `session_start_time`, `session_end_time`, `status`  

Match venue by **exact** `lower(trim(name))` + `lower(trim(city))` or by known `venue_id` (476–479 for NCPA).
