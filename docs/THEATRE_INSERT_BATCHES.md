# Theatre insert batches (provenance)

There is **no single folder of five city SQL files**. Live inserts for the current catalog came from these **five batch sources** (scripts / SQL):

| # | File | Cities / scope | Tables written | FK behaviour |
|---|------|----------------|----------------|--------------|
| 1 | `scripts/seed-maharashtra-theaters.ts` | Multi-district catalog (Pune, Mumbai City, Mumbai Suburban, Thane, Nagpur, …) | `venues` | Sets `district_id` via `districts.code` (MH-*); **no `city_id`** |
| 2 | `scripts/upsert-real-pune-venues.ts` | Pune + Mumbai civic | `venues` | Insert/update by name+city; city lookup `LIMIT 1` (ambiguous risk); may set `city_id`/`district_id` |
| 3 | `scripts/apply-approved-cleanup-and-venues.ts` | Mumbai NCPA halls | `venues` (+ event status soft updates elsewhere) | NCPA insert; Mumbai city `LIMIT 1` |
| 4 | `clean_database_seed.sql` | Starter venues | `venues` (+ sections/seats) | Legacy seed; IDs 1… |
| 5 | `supabase/seed.sql` | Demo starter | `venues` / events | Demo-only; skip if events exist |

**Authoritative NEW event theatres (IDs 55, 56, 59–66)** come from batches **2** and **3** (inserts on 2026-10-26), not from renaming seed rows 1–58.

City groups inside batch 1 (comment blocks): Pune → Mumbai City → Mumbai Suburban → Thane → Nagpur (+ remaining districts).
