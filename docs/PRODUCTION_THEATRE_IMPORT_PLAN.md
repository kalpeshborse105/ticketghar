# Production theatre import plan (five cities)

**Do not invent addresses, capacities, or seat maps.**  
Sources: `docs/MAHARASHTRA_VENUE_SOURCES.md`, `data/maharashtra_venues_candidates.json`, `data/authoritative_theatres.json`, product city list.

---

## 1. Five cities

| City | Typical district mapping (verify live IDs before apply) |
|---|---|
| Pune | `districts` name Pune (live audit: id **26**) |
| Mumbai | Prefer address evidence → Mumbai City (**17**) or Mumbai Suburban (**18**) — **never guess from city text alone** |
| Nagpur | Nagpur (live: **19**) |
| Nashik | Nashik (live: **22**) |
| Thane | Thane (live: **33**) |

City catalog (unique `cities.name`): resolve `city_id` by **exact unique name** only (`Pune`, `Mumbai`, `Nagpur`, `Nashik`, `Thane`). Abort if 0 or >1 rows.

Taluka: set via `cities.taluka_id` already on catalog where present; venues have **no** `taluka_id` column — do not invent village rows for urban halls.

---

## 2. Readiness by city (honest)

| City | Verified-enough for **name + official/civic address + source** | Capacity verified in-repo | Seat layout ready |
|---|---|---|---|
| **Mumbai** | **Yes** — NCPA halls (S1–S3), Ravindra Natya Mandir (S4, capacity conflict 911 vs 881) | NCPA yes; Ravindra needs reconcile note | **No** — configure after import |
| **Pune** | **Partial** — Bal Gandharva address + capacity 989 (S5). Other Pune halls in candidates are S6 (DB-only), not independent capacity proof | Bal Gandharva only | **No** |
| **Nagpur** | **Names/addresses in candidates only (S6)** — **missing independent source URLs** for production claim | No | No |
| **Nashik** | **S6 only** — missing independent sources | No | No |
| **Thane** | **S6 only** — missing independent sources; Kalidas address notes “Mulund West / Thane belt” (ambiguous) | No | No |

**Import rule:** Only rows in `data/production_theatre_import_template.csv` with `import_ready=yes` may be loaded. Others stay `import_ready=no` until owner adds source URL + verification date.

---

## 3. Idempotent import key

Without a schema migration, match on:

```text
lower(trim(name)) + '|' + lower(trim(city)) + '|' + lower(trim(address))
```

Importer must `SELECT` first; `INSERT` only if no row; `UPDATE` only when `import_source_id` matches and owner passes `--allow-update`.

**Do not** merge on fuzzy name similarity (Dinanath / Yashwantrao lessons).

Optional later (separate migration, not required for reset):  
`UNIQUE (lower(name), city_id, lower(address))` or `import_source_id TEXT UNIQUE`.

---

## 4. After import

1. Set `verification_status='verified'` only for rows with sources.  
2. Leave `has_seat_layout=0`, empty sections/seats until TheatreSeatDesigner / verified layout.  
3. Rebuild `data/authoritative_theatres.json` with **new** venue IDs.  
4. Public `/api/venues` shows allowlisted verified only (default).  
5. Events/showtimes: separate authorized CSV (`data/authorized_event_import_template.csv`) — do not invent sellable shows.

---

## 5. Template file

`data/production_theatre_import_template.csv` — columns documented in header.  
Fill Nagpur/Nashik/Thane source URLs before flipping `import_ready` to `yes`.

---

## 6. Missing evidence (report — no guessing)

| Gap | Detail |
|---|---|
| Nagpur theatres | No S1–S5-quality URL in `MAHARASHTRA_VENUE_SOURCES.md` |
| Nashik theatres | Same |
| Thane theatres | Same; one address ambiguous (Mulund vs Thane) |
| Pune non–Bal Gandharva | Nehru Memorial, Bharat Natya, R.K. More, etc. need owner-approved source links before claiming “verified” |
| Full village master | Not embedded; not required for urban theatres |
| Seat maps | None verified for sellable inventory |

Authoritative DB IDs 55–66 are **pre-reset** provenance only; after catalogue clear they will not exist.
