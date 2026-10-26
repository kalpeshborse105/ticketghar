# FINALIZATION BUG AUDIT

**Baseline commit:** `2b5bba1`  
**Working branch:** `fix/finalization-rn-db-sync`  
**Source:** `docs/DB-WEB-ANDROID-MAPPING-AUDIT.md`  
**Tracking:** `docs/FINALIZATION_IMPLEMENTATION_STATUS.md`

| ID | Sev | Issue | Status |
|----|-----|-------|--------|
| B01 | P0 | Mobile role `admin` vs DB roles | **FIXED** |
| B02 | P0 | Dual confirm paths | **FIXED** (canonical verify; legacy mapped) |
| B03 | P0 | Past sessions / stale catalog | **HARDENED** |
| B04 | P0 | Group QR all seats | **VERIFIED** (prior) |
| B05 | P0 | Duplicate payment tickets | **HARDENED** (idempotent verify path) |
| B06 | P0 | Double gate scan | **VERIFIED** |
| B07 | P0 | Scanner wrong event/session | **FIXED** |
| B08 | P0 | Atomic seat holds | **VERIFIED** (engine) — staging concurrency open |
| B09 | P1 | Phantom mobile fields | **FIXED** |
| B10 | P1 | Supabase catalog fallback | **FIXED** (removed) |
| B11 | P1 | Review missing `user_id` | **FIXED** |
| B12 | P1 | `coupons.used_count` | **FIXED** (app); migration pending approval |
| B13 | P1 | `rejection_reason` | **FIXED** |
| B14 | P1 | schema.sql lag | **MIGRATION PREPARED** — not executed |
| B15 | P1 | Dual auth paths | **PARTIAL** (logout unified) |
| B16 | P1 | Logout leaves cookie | **FIXED** |
| B17 | P1 | Web vs Android catalog | **FIXED** (same APIs) |
| B18–B23 | P2 | Add-ons / attendance / notifs / posters / admin URL | OPEN / WONTFIX as noted |
| B24 | P2 | PDF 500 | **FIXED** |
| B25–B27 | P2 | My Tickets / Google nav / back | OPEN |
| B28 | P2 | BMS mini-zoom | **FIXED** |
| B29–B34 | P3 | Env / deploy | OPEN |

## Tests

| Command | Result |
|---------|--------|
| `npm run typecheck` | See latest run in test report |
| Device / staging E2E | BLOCKED without credentials/device |
