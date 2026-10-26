# RELEASE CHECKLIST

## Blockers requiring approval

- [ ] Production DB migrations  
- [ ] Demo data deletion  
- [ ] Live Razorpay mode  
- [ ] Production deploy / Play Store upload  

## Pre-release

- [ ] Branch reviewed / merged to `main`  
- [ ] `npm run typecheck`  
- [ ] Web `npm run build`  
- [ ] Android `bundleRelease` with signing  
- [ ] Version name / versionCode bumped  
- [ ] Env vars present on Vercel (no secrets in client)  
- [ ] Scanner: correct event + session selected  
- [ ] PDF download works for confirmed order  
- [ ] Seat hold + payment verify smoke (test mode)  

## Package

- Android applicationId: `com.kalpkrutinfotech.mahaticket` (do not change)
