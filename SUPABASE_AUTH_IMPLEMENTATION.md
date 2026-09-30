# Supabase Auth Implementation for MahaTicket

## Overview
This document lists all files created/modified to implement real Supabase authentication for MahaTicket customers.

## Environment Variables (Already Configured)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key

## Files Created

### 1. Supabase Client Libraries

#### `src/lib/supabase/client.ts`
Browser-side Supabase client using `createBrowserClient` from `@supabase/ssr`. Uses only the anonymous key (no service role exposed to client).

#### `src/lib/supabase/server.ts`
Server-side Supabase client using `createServerClient` from `@supabase/ssr`. Handles cookie management for session persistence in Next.js server components.

### 2. Phone OTP Provider Interface

#### `src/lib/auth/phone-otp-provider.ts`
- Defines `PhoneOtpProvider` interface for future SMS integration
- Includes `StubPhoneOtpProvider` that returns `{ configured: false }`
- Allows graceful degradation when SMS provider is not configured

### 3. Auth API Routes

#### `app/api/auth/otp/send/route.ts` (POST)
- Accepts `{ email }` in request body
- Calls `supabase.auth.signInWithOtp({ email })`
- Returns real OTP sent to email (no fake OTP)
- Returns `{ success: true, message }` on success

#### `app/api/auth/otp/verify/route.ts` (POST)
- Accepts `{ email, token }` in request body
- Calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- Returns `{ success: true, user }` on successful verification

#### `app/api/auth/session/route.ts` (GET)
- Returns current authenticated user from Supabase session
- Returns `{ user: { id, email, user_metadata } }` or `{ user: null }`

#### `app/api/auth/logout/route.ts` (POST)
- Calls `supabase.auth.signOut()`
- Clears session and cookies
- Returns `{ success: true, message }`

#### `app/api/auth/google/route.ts` (GET)
- Initiates Google OAuth flow
- Calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Returns `{ url }` for client-side redirect
- **Note**: Requires Google OAuth provider to be configured in Supabase dashboard

#### `app/api/auth/profile/upsert/route.ts` (POST)
- Accepts `{ uid, email, fullName }`
- Upserts user into `users` table
- Uses Supabase user ID as `uid` (replacing Firebase-like IDs)
- Called after successful authentication to sync user profile

### 4. Auth Callback Page

#### `app/auth/callback/page.tsx`
- Handles OAuth callback from Google (and future providers)
- Exchanges authorization code for session using `exchangeCodeForSession`
- Calls profile upsert API to sync user to database
- Extracts full name from `user_metadata` (name or full_name)
- Redirects to home page on success
- Shows loading/success/error states with appropriate UI

### 5. Auth UI Components

#### `src/components/AuthModal.tsx`
Full-featured authentication modal with:
- **Choose Method Screen**: Email OTP, Google OAuth, Phone (disabled)
- **Email Input**: Collects email and sends OTP
- **Email Verify**: 6-digit OTP input with auto-formatting
- **Phone Disabled**: Shows message about SMS provider configuration requirement
- Error and success message display
- Loading states with spinners
- Google sign-in button with Google logo SVG
- Resend OTP functionality
- Terms of service notice

#### `src/components/Header.tsx` (Modified)
Added authentication features:
- Imports `AuthModal` and Supabase client
- Added state for `authModalOpen`, `user`, and `userMenuOpen`
- `useEffect` to check auth status on mount
- **Login Button**: Shows when user is not authenticated
- **User Menu**: Shows when authenticated with:
  - User email display (truncated)
  - Profile link to `/profile`
  - Logout button
- `handleLogout` function to sign out
- Integrated `AuthModal` component at bottom of header

### 6. Profile Page

#### `app/profile/page.tsx`
User profile page showing:
- User avatar placeholder
- Email address
- Display name (from metadata or email)
- User ID (Supabase UID)
- Member since date
- Logout button
- Back to home button
- Loading state
- Requires authentication (redirects to home if not logged in)

## Files Modified

### `app/api/orders/route.ts` (Enhanced Security)
Major changes to secure order listing:

#### Previous Behavior
- `GET /api/orders` - Returned all orders (insecure)
- `GET /api/orders?orderNumber=XXX` - Public order lookup

#### New Behavior
- **Guest Lookup** (Public Access):
  - `GET /api/orders?orderNumber=XXX` - Look up by order number
  - `GET /api/orders?ticketCode=XXX` - Look up by ticket code
  - Returns single order with tickets and QR codes

- **User Orders List** (Requires Auth):
  - `GET /api/orders` - Returns 401 if not authenticated
  - Fetches Supabase user session
  - Looks up user in database by `uid` (Supabase user ID)
  - Returns only orders belonging to authenticated user
  - Limits to 50 most recent orders

#### Security Improvements
- No longer dumps all orders publicly
- Filters orders by authenticated user
- Maintains backward compatibility for guest ticket lookup
- Returns empty array if user authenticated but not in database

## Database Schema Notes

### `users` Table
The existing `users.uid` field now stores Supabase user IDs instead of Firebase UIDs:
- Type: `text`, unique, not null
- Stores: Supabase `user.id` (UUID format)
- Migration: New signups will use Supabase UIDs automatically
- Existing Firebase UIDs remain unchanged (users will need to re-register)

## Authentication Flow

### Email OTP Flow
1. User clicks "Login" in header
2. Opens `AuthModal`, selects "Continue with Email OTP"
3. Enters email, clicks "Send OTP"
4. `/api/auth/otp/send` sends real OTP via Supabase
5. User receives email with 6-digit code
6. Enters OTP, clicks "Verify & Sign In"
7. `/api/auth/otp/verify` validates OTP
8. `/api/auth/profile/upsert` syncs user to database
9. Session stored in cookies via Supabase
10. Page refreshes, header shows user menu

### Google OAuth Flow
1. User clicks "Continue with Google"
2. `/api/auth/google` returns OAuth URL
3. Browser redirects to Google consent screen
4. User authorizes, Google redirects to `/auth/callback?code=XXX`
5. Callback page exchanges code for session
6. Profile upserted with name from Google metadata
7. Redirects to home page
8. Header shows authenticated user

### Phone OTP Flow (Disabled)
- Shows message: "Phone OTP requires SMS provider configuration"
- Returns to choose method screen
- Will be enabled when SMS provider (Twilio/etc.) is configured

## Session Management
- Sessions stored in HTTP-only cookies by Supabase
- No sensitive data in localStorage or sessionStorage
- Server-side validation via `createClient().auth.getUser()`
- Client-side state updated via Supabase client

## Security Considerations

### No Service Role Key Exposed
- Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` used on client
- Server uses same anon key with cookies for session auth
- Service role key (if exists) never exposed to client

### Row Level Security (RLS)
**Important**: Supabase RLS should be configured:
- `users` table: Users can read/update their own row
- `orders` table: Users can read their own orders
- `tickets` table: Users can read tickets for their orders

### OAuth Provider Configuration
- Google OAuth requires setup in Supabase dashboard:
  1. Enable Google provider in Authentication > Providers
  2. Add Google Client ID and Secret
  3. Configure redirect URL: `https://yourdomain.com/auth/callback`
- If not configured, OAuth will fail with clear error message

## Testing Checklist

### Email OTP
- [ ] Send OTP to valid email
- [ ] Receive OTP email from Supabase
- [ ] Verify correct OTP succeeds
- [ ] Verify incorrect OTP fails
- [ ] Verify expired OTP fails
- [ ] Resend OTP works

### Google OAuth
- [ ] Click "Continue with Google"
- [ ] Redirects to Google consent
- [ ] Authorize and redirect back
- [ ] Profile created/updated in database
- [ ] Session persists after refresh

### Session & Profile
- [ ] Header shows login button when logged out
- [ ] Header shows user email when logged in
- [ ] User menu dropdown works
- [ ] Profile page loads correctly
- [ ] Profile shows correct user data
- [ ] Logout clears session

### Orders API
- [ ] `/api/orders` returns 401 when not authenticated
- [ ] `/api/orders` returns user's orders when authenticated
- [ ] `/api/orders?orderNumber=XXX` works without auth (guest)
- [ ] `/api/orders?ticketCode=XXX` works without auth (guest)
- [ ] Orders filtered correctly by user

## Future Enhancements

### Phone OTP
1. Integrate SMS provider (Twilio, AWS SNS, etc.)
2. Implement `PhoneOtpProvider`:
   - `sendOtp(phoneNumber): Promise<{ success, message }>`
   - `verifyOtp(phoneNumber, otp): Promise<{ success, uid, message }>`
3. Create API routes:
   - `POST /api/auth/phone/otp/send`
   - `POST /api/auth/phone/otp/verify`
4. Update `AuthModal` to enable phone option
5. Update Supabase to support phone auth if needed

### Additional Features
- Email verification badge
- Profile editing (name, city, language preference)
- Order history pagination
- Password-based auth (optional)
- Social login (Facebook, Apple)

## Deployment Notes

### Environment Variables
Ensure production environment has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Supabase Configuration
1. Email templates customized for brand
2. OAuth providers configured and tested
3. RLS policies enabled and tested
4. Rate limiting configured for auth endpoints

### Database Migration
If migrating from Firebase:
- Existing `users.uid` values are Firebase UIDs
- New signups will have Supabase UIDs
- Consider migration script to update existing users
- Or let users re-register with Supabase

## Files Summary

### Created (12 files)
1. `src/lib/supabase/client.ts`
2. `src/lib/supabase/server.ts`
3. `src/lib/auth/phone-otp-provider.ts`
4. `app/api/auth/otp/send/route.ts`
5. `app/api/auth/otp/verify/route.ts`
6. `app/api/auth/session/route.ts`
7. `app/api/auth/logout/route.ts`
8. `app/api/auth/google/route.ts`
9. `app/api/auth/profile/upsert/route.ts`
10. `app/auth/callback/page.tsx`
11. `src/components/AuthModal.tsx`
12. `app/profile/page.tsx`

### Modified (2 files)
1. `src/components/Header.tsx` - Added auth UI and logic
2. `app/api/orders/route.ts` - Added auth requirement and user filtering

## Dependencies Used
- `@supabase/supabase-js` (already installed)
- `@supabase/ssr` (already installed)
- Next.js 15 App Router features (cookies, server components)

## Contact
For questions or issues with this implementation, contact the development team.
