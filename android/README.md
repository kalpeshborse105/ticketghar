# MahaTicket Native Android App

**महाटिकिट** - Native Android application for booking theater shows, concerts, and cultural events across Maharashtra.

## Features

✅ **Native Android** - Kotlin + Jetpack Compose + Material 3  
✅ **Offline Support** - Room database caching for events and tickets  
✅ **Real-time Booking** - Live seat selection with hold/release  
✅ **Push Notifications** - Firebase Cloud Messaging for booking updates  
✅ **Light Theme** - Premium indigo/violet accent design  
✅ **Edge-to-Edge** - Modern Android 12+ splash screen & window insets  
✅ **Network Aware** - Graceful offline mode with visual indicators  

## Quick Start

### Prerequisites
- Android Studio Hedgehog 2023.1.1 or later
- JDK 17+
- Android SDK with API 26-35

### Build & Run

1. **Open in Android Studio**
   ```
   File > Open > d:\ticketghar\android
   ```

2. **Create local.properties** (if not auto-generated)
   ```properties
   sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
   ```

3. **Sync Gradle & Build**
   ```bash
   # Via Android Studio: Build > Make Project
   # OR command line:
   ./gradlew :app:assembleDebug
   ```

4. **Run on Emulator or Device**
   - Select device in Android Studio
   - Click Run (▶️)

## Architecture

```
app/
├── data/
│   ├── api/          # Retrofit API service & DTOs
│   ├── db/           # Room database & DAOs
│   └── repository/   # Data layer with online/offline logic
├── model/            # Domain models
├── ui/
│   ├── screens/      # Compose UI screens
│   ├── viewmodel/    # ViewModels with UiState
│   └── theme/        # Material3 theme & colors
├── fcm/              # Firebase Cloud Messaging service
└── util/             # Network monitor, helpers
```

### Tech Stack
- **UI:** Jetpack Compose, Material 3, Navigation Compose
- **Networking:** Retrofit, OkHttp, Gson
- **Database:** Room (offline cache)
- **Async:** Kotlin Coroutines, Flow
- **Image:** Coil
- **Push:** Firebase Cloud Messaging

## Backend Integration

**Production API:** `https://ticketghar.kalpkrutinfotech.com`

Override for local testing in `local.properties`:
```properties
api.base.url=http://10.0.2.2:3000
```

### Endpoints Used
- `GET /api/events` - Event listings
- `GET /api/cities` - Cities dropdown
- `GET /api/sessions/{id}/seats` - Seat map
- `POST /api/bookings/hold` - Hold seats (5 min)
- `POST /api/bookings/confirm` - Confirm with Razorpay payment
- `GET /api/orders` - User's tickets
- `POST /api/notifications/register-token` - FCM token registration

## Screens

1. **Home** - Featured events, category filters, search
2. **Explore** - Browse all events by city/category
3. **Tickets** - My bookings with QR codes (offline viewable)
4. **Offers** - Coupons and discounts
5. **Profile** - Account settings

_(Event Details, Seat Selection, Checkout screens to be implemented in booking flow)_

## Firebase Setup (Optional for Debug)

Current `google-services.json` is a placeholder. Debug builds work without real Firebase.

**For production FCM:**
1. Create project at https://console.firebase.google.com
2. Add Android app: `in.ticketghar.mahaticket`
3. Download `google-services.json` and replace placeholder
4. Uncomment in `app/build.gradle.kts`:
   ```kotlin
   alias(libs.plugins.google.services) // Remove 'apply false'
   ```

## Release Build

See [RELEASE.md](./RELEASE.md) for detailed instructions on:
- Creating keystore
- Signing release APK/AAB
- Play Store submission
- CI/CD setup

Quick release build:
```bash
./gradlew :app:bundleRelease
```
Output: `app/build/outputs/bundle/release/app-release.aab`

## Offline Mode

- Events, cities, and tickets cached in Room database
- Works without internet after initial data fetch
- Booking confirmation requires online connectivity
- Visual offline indicator in app header

## Deep Links

```
mahaticket://app/booking/{orderNumber}
mahaticket://app/ticket/{ticketCode}
mahaticket://app/event/{eventId}
```

Handled by `MainActivity` for FCM notification taps.

## Development Status

### ✅ Completed
- Project structure & Gradle setup
- Material3 light theme with indigo accent
- Navigation with bottom bar
- API layer (Retrofit + OkHttp)
- Room database for offline caching
- Event listing with ViewModel + UiState
- Network monitoring & offline banner
- Firebase Cloud Messaging service
- Splash screen (Android 12+)
- Resources (strings, colors, drawables)

### 🚧 To Be Implemented
- EventDetails screen with session picker
- SeatSelection screen with grid layout
- Checkout screen with Razorpay integration
- BookingSuccess screen with QR code
- TicketDetails screen with full QR display
- Search functionality (API wired, UI needs refinement)
- User authentication & profile management
- Notifications settings screen
- Help & FAQ screen

## Troubleshooting

**Gradle sync fails:**
- Ensure Android SDK installed via Android Studio SDK Manager
- Check `local.properties` has correct `sdk.dir` path

**Build error: `google-services.json`:**
- Keep plugin disabled for debug: `apply false` in build.gradle.kts
- Or replace placeholder with real Firebase config

**Room migration errors:**
- Increment database version in `MahaDatabase.kt`
- Or use `.fallbackToDestructiveMigration()` in dev

**Network requests fail:**
- Check API base URL in BuildConfig
- Test with emulator: use `10.0.2.2` for localhost

## License

Proprietary - Kalpkrut Infotech

---

**Package:** `in.ticketghar.mahaticket`  
**Min SDK:** 26 (Android 8.0)  
**Target SDK:** 35 (Android 15)

For full release documentation, see [RELEASE.md](./RELEASE.md)
