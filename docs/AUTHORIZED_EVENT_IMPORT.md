# Authorized Event Import Template

**File:** `data/authorized_event_import_template.csv`  
**Purpose:** Collect organizer-authorized shows for human review before any DB insert.  
**Do not invent showtimes or prices to populate the site.**

## Required fields

| Column | Rule |
|--------|------|
| `approval_id` | Stable ID grouping all ticket types for one show session |
| `organizer_*` | Must match an existing / to-be-verified `organizers` row |
| `venue_name` + `venue_city` | Must resolve to exactly one `venues` row (use `venue_id_if_known` when known) |
| `session_*` + `timezone` | Use `Asia/Kolkata`; start < end; future-facing when `approved_for_sale` |
| `price_inr` / `price_paise` | Must satisfy `price_paise = price_inr * 100` (app stores **paise**) |
| `quota` | ≤ available seated inventory for that section when `is_seated=yes` |
| `booking_status` | `draft_not_for_sale` until explicit ops approval → `approved_for_sale` |
| `poster_rights_confirmed` | `yes` only with documented rights |

## Validation checklist (before import tooling)

1. Event belongs to the named venue **and** organizer (no orphan venue).  
2. Session datetimes valid; no accidental duplicate `(venue_id, start, end)` overlaps for same hall.  
3. Section/ticket names map to `venue_sections` or intentional GA ticket types.  
4. Quotas agree with seat inventory generation plan.  
5. No scrape-sourced BMS listings.  
6. Status remains non-public until approval.

## Out of scope

- Auto-publishing from this CSV  
- Capacity invention  
- Seat-map invention beyond approved templates  

Import runner (when built) must dry-run first and refuse rows failing the checklist.
