# FINALIZATION BASELINE

**Created:** 2026-10-26  
**Branch:** `fix/finalization-rn-db-sync`  
**Starting commit:** `2b5bba1` (`ticket QR admin panel fix`) — matches `origin/main` at branch creation  
**Remote:** `https://github.com/kalpeshborse105/ticketghar.git`

## Architecture

| Layer | Stack | Entry |
|-------|--------|--------|
| Website + Admin | Next.js 15 + React 19 | `app/`, `src/components/` |
| Android app | React Native 0.77.3 (not Expo) | `mobile/`, package `com.kalpkrutinfotech.mahaticket` |
| API | Next.js Route Handlers | `app/api/**` |
| DB | PostgreSQL (Supabase) via Drizzle | `src/db/schema.ts`, `DATABASE_URL` / `SQL_*` |
| Payments | Razorpay (server verify) | `app/api/payments/*` |

## Build commands

| Target | Command |
|--------|---------|
| Web dev | `npm run dev` |
| Web build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Mobile start | `npm run mobile:start` / `npm --prefix mobile start` |
| Android run | `npm run mobile:android` |
| Android release | `cd mobile/android && ./gradlew.bat bundleRelease` |

## Existing tests / scripts

- `mobile`: `npm test` (Jest)  
- Root: `db:audit`, seed scripts, various `scripts/test-*.ts` / e2e — not a unified CI suite  
- Do not invent pass results without running commands  

## Known issues (from audit + user reports)

See `docs/DB-WEB-ANDROID-MAPPING-AUDIT.md` and `docs/FINALIZATION_BUG_AUDIT.md`.

High-priority user reports:
- Organizer QR not verifying against selected event/session correctly  
- PDF generation returning 500  
- Seat map needs BMS-style mini zoom overview  
- Web/Android must share same authoritative DB via APIs  

## Demo / placeholder sources (do not treat as live catalog)

- Empty `STATIC_MAHATICKET_EVENTS` in mobile API  
- Picsum / Unsplash poster fallbacks when URL missing  
- Mobile Supabase REST catalog refresh (unsafe vs API)  
- Seed scripts: `db:seed-events`, `db:seed-pune`, etc. — **do not run against prod without approval**  

## Must not do without approval

- Production DB delete / truncate / destructive migrate  
- Live Razorpay mode switch  
- Production deploy / Play publish  
- Force-push / hard reset  

## Working branch

All finalization code lands on `fix/finalization-rn-db-sync` until reviewed for merge to `main`.
