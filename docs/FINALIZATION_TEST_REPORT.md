# FINALIZATION TEST REPORT

**Branch:** `fix/finalization-rn-db-sync`  
**Starting commit:** `2b5bba1`  
**Date:** 2026-10-26

## Automated (actually run)

| Check | Result | Notes |
|-------|--------|-------|
| `npm run typecheck` | **PASSED** | `tsc --noEmit` |
| `npm run build` | **PASSED** | Next.js 15.5.27 production build |
| `npm --prefix mobile test` | **FAILED** | Pre-existing Jest ESM parse error on `@react-navigation/native` — suite did not execute tests |
| `assembleRelease` + `adb install` | **PASSED** | Device `d67ea9dc` (25057RN09I); APK `releases/MahaTicket-1.0.21-release.apk` |
| App launch log | **PASSED** | `ReactNativeJS: Running "MahaTicket"` — no FATAL |
| Live prod `/api/health` + `/api/events` | **PASSED** | HTTP 200, DB connected |
| Live reviews fake count | **FIXED locally** | Mobile default 108 removed; API invented ratings removed in code — **needs Vercel deploy** for prod API |

## Code-level verification (inspection)

- Android catalog/reviews/logout → Next.js APIs only (Supabase REST client removed)
- Checkout uses `verifyPayment` → `/api/payments/verify`
- Coupon `used_count` increment after successful `confirmBookingOrder`
- Admin reject persists `rejectionReason`
- PDF null/QR hardening remains in place
- Scanner scope + scannable sessions remain in place

## Staging E2E (owner)

See checklist in prior report: publish event → web+Android parity → hold → test pay → verify → PDF → scan / already_used / wrong session.
