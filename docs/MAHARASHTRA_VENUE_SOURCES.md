# Maharashtra Venue Sources (Master Data Research)

**Purpose:** Document evidence for `data/maharashtra_venues_candidates.json`.  
**Not a booking license.** Listing a venue here does **not** authorize ticket sales.

**Evidence date:** 2026-10-26  
**Policy:** No BookMyShow / protected ticket-inventory scrape. Capacities recorded only when a reliable public source states them; otherwise `capacity_verified: false` / null.

---

## A. Sources used

| ID | Source | Type | Notes |
|----|--------|------|-------|
| S1 | [NCPA Mumbai — Venues](https://www.ncpamumbai.com/venue-landing/) | Official cultural institution | Capacities for Jamshed Bhabha (1109), Tata (960), Experimental (≤267), Godrej Dance (177) |
| S2 | [NCPA Jamshed Bhabha Theatre](https://www.ncpamumbai.com/venue/jamshed-bhabha-theatre/) | Official | Seating capacity 1,109 |
| S3 | [NCPA Experimental Theatre](https://www.ncpamumbai.com/venue/experimental-theatre/) | Official | Max 267 variable |
| S4 | [P.L. Deshpande Maharashtra Kala Academy — Rate chart](https://www.pldeshpandekalaacademy.org/rate_chart.html) | Official academy | Ravindra Natya Mandir listed **911** seats; Mini Theatre **199**. FAQ page also cites 881 / 181 — treat as **needs reconciliation** |
| S5 | Hindustan Times / Sahapedia / MarathiSrushti reporting on Bal Gandharva Rang Mandir, Pune | Civic / cultural reporting | Commonly cited **989** (669 + 320 balcony); PMC-owned landmark |
| S6 | Live MahaTicket `venues` table | Live DB inventory | 58 rows already present; many capacities from seed templates |
| S7 | Repo `scripts/seed-maharashtra-theaters.ts` | Internal curated seed | Landmark **names/addresses** useful; capacities are **approximate / unverified** unless matched to S1–S5 |

---

## B. Verification rules applied in candidates file

| Field | Rule |
|-------|------|
| `capacity` | Integer only if S1–S5 (or equal-quality official) state it; else `null` |
| `capacity_verified` | `true` only with source link + evidence date |
| `seat_map_status` | `verified` \| `approximate_template` \| `unknown` |
| `in_live_db` | Matched by name/city against live export when possible |
| `sell_authorized` | Always `false` in this catalogue |

---

## C. Known conflicts / caveats

1. **Ravindra Natya Mandir capacity:** rate chart 911 vs FAQ 881 — mark verified with note; do not invent a single “truth” without academy confirmation.
2. **Seed vs official Bal Gandharva:** live/seed often stores `1000`; public reporting **989** — prefer 989 when updating master data after approval.
3. **Dinanath Mangeshkar (Vile Parle):** live DB may have two rows (`venues.id` 2 and 12) — human merge review only.
4. **Yashwantrao Chavan Natyagruha (Pune):** possible duplicate rows `#3` / `#53`.
5. Cinema multiplex names in DB (PVR/Cinepolis) are commercial brands — keep separate from civic natya mandirs; seating is screen-specific and **not** verified here.

---

## D. Recommended next steps (owner)

1. Approve venue master upserts for **verified** rows only (name/address/city/district).  
2. Leave `total_capacity` unchanged until capacity is verified.  
3. Do not generate sellable events from this file.  
4. Organizer contracts → use `data/authorized_event_import_template.csv`.
