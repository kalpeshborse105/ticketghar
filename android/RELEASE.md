# MahaTicket Android App - Release Guide

## Project Overview
Native Android app for MahaTicket (महाटिकिट) - Maharashtra's premier ticket booking platform built with Kotlin, Jetpack Compose, and Material 3.

**Package:** `in.ticketghar.mahaticket`  
**Min SDK:** 26 (Android 8.0)  
**Target SDK:** 35 (Android 15)

---

## Development Setup

### Prerequisites
1. **Android Studio:** Latest Canary or Stable (Hedgehog 2023.1.1+)
2. **Java:** JDK 17 or higher
3. **Gradle:** Auto-managed via wrapper

### Initial Setup

1. **Clone & Open Project**
   ```bash
   cd d:\ticketghar\android
   ```
   Open in Android Studio

2. **Configure local.properties**
   Create `local.properties` (see `local.properties.example`):
   ```properties
   sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
   
   # Optional: Override API base URL for local testing
   # api.base.url=http://10.0.2.2:3000
   ```

3. **Firebase Setup (Optional for Debug)**
   - Current placeholder `google-services.json` allows debug builds without Firebase
   - For production FCM push notifications:
     1. Create Firebase project at https://console.firebase.google.com
     2. Add Android app with package `in.ticketghar.mahaticket`
     3. Download real `google-services.json` and replace placeholder
     4. Uncomment `apply plugin: 'com.google.gms.google-services'` in `app/build.gradle.kts`

---

## Building the App

### Debug Build (Development)

```bash
# Using Android Studio: Build > Make Project
# OR via Gradle:
./gradlew :app:assembleDebug
```

**Output:** `app/build/outputs/apk/debug/app-debug.apk`

### Release Build (Production)

#### 1. Create Keystore (First Time Only)

```bash
keytool -genkey -v -keystore mahaticket-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias mahaticket-key
```

**IMPORTANT:** Store keystore password securely! Never commit keystore or passwords to git.

#### 2. Configure Signing in `app/build.gradle.kts`

Add inside `android { ... }` block:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../mahaticket-release-key.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias = "mahaticket-key"
        keyPassword = System.getenv("KEY_PASSWORD") ?: ""
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        isMinifyEnabled = true
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
    }
}
```

#### 3. Build Release APK

```bash
# Set passwords as environment variables
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_PASSWORD="your_key_password"

./gradlew :app:assembleRelease
```

**Output:** `app/build/outputs/apk/release/app-release.apk`

#### 4. Build Release AAB (for Play Store)

```bash
./gradlew :app:bundleRelease
```

**Output:** `app/build/outputs/bundle/release/app-release.aab`

---

## Play Console Deployment

### 1. Create Play Console Listing

1. Go to https://play.google.com/console
2. Create new app: **MahaTicket (महाटिकिट)**
3. Fill store listing:
   - **App Name:** MahaTicket
   - **Short Description:** महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ
   - **Full Description:** Book theater shows, concerts, comedy events across Maharashtra
   - **Category:** Entertainment
   - **Content Rating:** Everyone

### 2. Upload App Bundle

1. Navigate to **Production > Create new release**
2. Upload `app-release.aab`
3. Generate Play App Signing key (recommended)
4. Set version name: `1.0.0` (matches `versionCode = 1`)

### 3. Configure App Signing

- Use **Google Play App Signing** for automatic key management
- Or upload your own signing key (keep backup secure!)

### 4. Internal Testing Track

Before production:
1. Create **Internal Testing** track
2. Add test users by email
3. Roll out gradually: 10% → 50% → 100%

---

## CI/CD Integration (Optional)

### GitHub Actions Example

```yaml
name: Android Build

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Build Debug APK
        run: ./gradlew assembleDebug
        working-directory: ./android
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Backend API Configuration

### Production Endpoint
Default: `https://ticketghar.kalpkrutinfotech.com`

### Override for Local Development
In `local.properties`:
```properties
api.base.url=http://10.0.2.2:3000
```
(10.0.2.2 = localhost from Android Emulator)

### Available Endpoints
- `GET /api/events` - List events
- `GET /api/cities` - List cities
- `GET /api/sessions/{id}/seats` - Seat availability
- `POST /api/bookings/hold` - Hold seats
- `POST /api/bookings/confirm` - Confirm booking
- `GET /api/orders` - User's orders
- `POST /api/notifications/register-token` - FCM token registration

---

## Firebase Cloud Messaging (FCM)

### Setup Instructions

1. **Create Firebase Project**
   - Console: https://console.firebase.google.com
   - Add Android app: `in.ticketghar.mahaticket`

2. **Download google-services.json**
   - Replace placeholder file at `app/google-services.json`

3. **Enable FCM in build.gradle.kts**
   ```kotlin
   plugins {
       // ...
       alias(libs.plugins.google.services) // Remove 'apply false'
   }
   ```

4. **Test Notifications**
   - Firebase Console > Cloud Messaging > Send test message
   - Target: FCM token from app logs

### Deep Link Format
```
mahaticket://app/booking/{orderNumber}
mahaticket://app/ticket/{ticketCode}
mahaticket://app/event/{eventId}
```

---

## Troubleshooting

### Build Errors

**Issue:** `SDK location not found`  
**Fix:** Create `local.properties` with correct `sdk.dir` path

**Issue:** `Execution failed for task ':app:processDebugGoogleServices'`  
**Fix:** Ensure `google-services.json` is valid or keep plugin disabled for debug

**Issue:** Room database schema errors  
**Fix:** Increment `Database.version` and add migration or allow destructive migration

### Runtime Issues

**Issue:** Network requests fail with SSL errors  
**Fix:** Check API base URL uses HTTPS in production

**Issue:** Offline mode not caching data  
**Fix:** Verify Room database is properly initialized in `MahaTicketApp`

**Issue:** FCM notifications not received  
**Fix:** 
1. Confirm `google-services.json` is valid
2. Check token registration in backend logs
3. Verify POST_NOTIFICATIONS permission granted on Android 13+

---

## Release Checklist

- [ ] Updated `versionCode` and `versionName` in `build.gradle.kts`
- [ ] Replaced placeholder `google-services.json` with real Firebase config
- [ ] Tested on physical device (Android 8.0+)
- [ ] Verified API calls work with production backend
- [ ] Tested offline mode with cached data
- [ ] Confirmed seat selection and booking flow
- [ ] Checked notification delivery and deep links
- [ ] ProGuard rules verified (no crashes after minification)
- [ ] Generated signed AAB with release keystore
- [ ] Uploaded to Play Console Internal Testing
- [ ] Submitted for Production review

---

## App Architecture

### Tech Stack
- **Language:** Kotlin
- **UI:** Jetpack Compose + Material 3
- **Navigation:** Navigation Compose
- **Networking:** Retrofit + OkHttp
- **Local Storage:** Room Database
- **Image Loading:** Coil
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Architecture:** MVVM (ViewModel + Repository + UiState)

### Offline Support
- Events, cities, and purchased tickets cached in Room
- Graceful degradation when offline
- Network status monitoring with visual indicator
- Booking confirmation requires online connectivity

### Security
- HTTPS-only API communication
- Ticket QR codes signed with HMAC-SHA256 (server-side)
- Razorpay payment signature verification
- No sensitive data stored in SharedPreferences

---

## Support & Contact

**Developer:** Kalpkrut Infotech  
**Website:** https://ticketghar.kalpkrutinfotech.com  
**Package:** in.ticketghar.mahaticket

For backend API issues, check main project README at repository root.
