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
| Android `bundleRelease` | **NOT RUN** | Signing/SDK not exercised this pass |
| Live Razorpay / device scanner | **BLOCKED** | Needs staging + device |

## Code-level verification (inspection)

- Android catalog/reviews/logout → Next.js APIs only (Supabase REST client removed)
- Checkout uses `verifyPayment` → `/api/payments/verify`
- Coupon `used_count` increment after successful `confirmBookingOrder`
- Admin reject persists `rejectionReason`
- PDF null/QR hardening remains in place
- Scanner scope + scannable sessions remain in place

## Staging E2E (owner)

See checklist in prior report: publish event → web+Android parity → hold → test pay → verify → PDF → scan / already_used / wrong session.
