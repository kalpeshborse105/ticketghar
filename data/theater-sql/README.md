# `data/theater-sql` — what these files are

**Do not run these against production until the test catalogue is cleared and you explicitly approve.**  
This folder was audited against `src/db/schema.ts` and the live DB (read-only). Nothing here was executed in that audit.

---

## How MahaTicket stores theatres (simple map)

```
users / organizers / app_secrets     ← keep for prod
districts → talukas → cities         ← keep location masters
venues  (theatre rows)
  └─ venue_sections → seats
events → event_sessions → ticket_types → seat_inventory
orders → tickets → ticket_scans
settlements, event_reviews
```

There is **no BookMyShow API table** and **no live BMS scrape** in app code.  
“BookMyShow” in React components = **UI style only** (date strip, ticket PDF look).

Commerce tables are **`orders` / `tickets`** (not `bookings` / `payments`).

---

## File groups in this folder

| Group | Files | Safe to run now? | What it does |
|---|---|---|---|
| **A. Verified NCPA starter** | `mahaticket_verified_venue_catalogue.sql` | **NO** until after clear + review | **Real INSERT** into `venues` (4 NCPA halls). Fixed for schema mapping — still ends in `ROLLBACK` until you commit. |
| **B. BMS cinema candidates** | `mahaticket_bms_venue_candidates_*.sql` | Preview only (mostly) | Research lists with BookMyShow **URLs as listing evidence**. **Not** sell authorization. Commented INSERT is **schema-wrong** if enabled as-is. |
| **C. Remaining district candidates** | `mahaticket_venue_candidates_remaining_districts.sql` | Preview only | Read-only `SELECT` |
| **D. Taluka / JustDial research** | `mahaticket_additional_taluka_venues_*.sql` | Preview only | Read-only; directory leads, need dedup |

---

## Bugs / mismatches found (must fix before any bulk import)

1. **`has_seat_layout` / `is_template`**  
   Live schema = **INTEGER** `0/1`. BMS optional INSERT uses **BOOLEAN** `true/false` → would error.

2. **`total_capacity`**  
   Live column is **NOT NULL** (default 600). BMS uses `NULL` → would error on INSERT.

3. **`facilities`**  
   Live column is **TEXT**. BMS casts `::jsonb` → may fail; use text/json string.

4. **`name_mr`**  
   Required NOT NULL on `venues`. Several candidate INSERT sketches omit it.

5. **No `city_id` / `district_id`** in inserts  
   After clear, public filters and admin mapping need FKs. Free-text `city` alone is not enough.

6. **District rename**  
   SQL uses **“Ahilyanagar”**; our master uses **“Ahmednagar”** (`MH-AH`). Name join would miss.

7. **Duplicates / aliases**  
   e.g. `Divya Cinemas` vs `Divya Cinemas: Nashik`; `Gaiety Galaxy` vs `G7 Multiplex`. Do not merge by name alone.

8. **Policy**  
   Project rule: do **not** scrape BMS inventory/showtimes/seat maps into sellable MahaTicket catalogue. These files are **candidate research**, not production seed for ticket sales.

9. **Product focus**  
   Five cities for prod seed: **Pune, Mumbai, Nagpur, Nashik, Thane**. Dumping all-district BMS cinemas after clear will clutter the clean DB.

---

## Recommended order (later — not now)

1. External `pg_dump`  
2. Clear test catalogue (keep `users`, location masters, `app_secrets`, …) — see `docs/THEATER_SQL_AND_PROD_CLEAR_GUIDE.md`  
3. Run **only** reviewed verified inserts (NCPA / owner-approved civic theatres) with `city_id` + `district_id`  
4. Update `data/authoritative_theatres.json` with **new** IDs  
5. Seat layouts + events only after organizer authorization  
6. Keep BMS/taluka SQL as **research**; promote rows one-by-one after evidence review  

---

## Quick verdict

| Question | Answer |
|---|---|
| Is the folder OK to run blindly after DB clear? | **No** |
| Is verified NCPA SQL usable after fixes? | **Yes, with review + location FKs + explicit COMMIT** |
| Are BMS/taluka files OK as research previews? | **Yes (read-only)** |
| Are BMS files OK as full prod theatre import? | **No** — schema bugs + policy + not five-city curated |
