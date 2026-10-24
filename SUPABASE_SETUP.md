# MahaTicket — Supabase Setup

Bootstrap the application database on a **new empty** Supabase Postgres project.

## 1. Create Supabase project

1. Create a project in the Supabase dashboard (region: preferably `ap-south-1`).
2. Open **Project Settings → Database** and copy:
   - Host (pooler recommended, port `6543`)
   - Database name (`postgres`)
   - User (`postgres.<project-ref>` for pooler)
   - Password

## 2. Configure environment variables

Copy `.env.example` to `.env` and set at minimum:

```env
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MahaTicket
NEXT_PUBLIC_DEFAULT_CITY=Pune

SQL_HOST=aws-0-ap-south-1.pooler.supabase.com
SQL_PORT=6543
SQL_SSL=true
SQL_DB_NAME=postgres
SQL_USER=postgres.YOUR_PROJECT_REF
SQL_PASSWORD=YOUR_DB_PASSWORD
SQL_ADMIN_USER=postgres.YOUR_PROJECT_REF
SQL_ADMIN_PASSWORD=YOUR_DB_PASSWORD

DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

TICKET_SECRET=long_random_hmac_secret
ADMIN_PASSWORD=choose_a_strong_admin_password
```

**Never** put `SUPABASE_SERVICE_ROLE_KEY`, DB password, or Firebase private keys in client/Android code.

## 3. Run schema

From the repo root:

```bash
npx tsx scripts/apply-supabase.ts
```

Or manually in Supabase SQL Editor:

1. Paste and run `supabase/schema.sql`
2. Paste and run `supabase/seed.sql`

`schema.sql` uses `IF NOT EXISTS` — it does **not** drop existing tables.

`seed.sql` skips automatically if any `events` rows already exist.

## 4. Verify health

```bash
npm run dev
# then
curl http://localhost:3000/api/health
```

Expected:

```json
{ "ok": true, "database": "connected", "supabase": "configured" }
```

## 5. Verify events

```bash
curl http://localhost:3000/api/events
```

You should see seeded Maharashtra demo events (titles prefixed `[SEED]`).

## 6. Verify seats & booking

1. Open homepage → pick a city → open a seated event (natak or movie).
2. Select seats → hold → checkout → confirm.
3. Attempt the same seats from another browser session — must fail (no double book).

## 7. Admin

1. Set `ADMIN_PASSWORD` in `.env`.
2. Open `/admin` and sign in with that password.
3. Seed includes `admin@mahaticket.in` as `super_admin` for audit identity.

## 8. Production environment

Set `APP_URL` / `NEXT_PUBLIC_APP_URL` to the **only** public domain:

`https://mahaticket.kalpkrutinfotech.com`

Do **not** use bare `mahaticket.com` (that domain is not ours).

### Supabase Dashboard (Auth → URL Configuration)

1. **Site URL:** `https://mahaticket.kalpkrutinfotech.com`
2. **Redirect URLs** (allow list), include at least:
   - `https://mahaticket.kalpkrutinfotech.com/**`
   - `https://mahaticket.kalpkrutinfotech.com/auth/callback`
   - `https://mahaticket.kalpkrutinfotech.com/auth/mobile-done`
   - `mahaticket://**` (Android deep link return)
3. Remove any `https://mahaticket.com/**` entries if present.

### Google Cloud OAuth (if using GOOGLE_CLIENT_ID)

Authorized redirect URI must be:

`https://mahaticket.kalpkrutinfotech.com/api/auth/google/callback`

### Vercel

Set Production env:

- `APP_URL=https://mahaticket.kalpkrutinfotech.com`
- `NEXT_PUBLIC_APP_URL=https://mahaticket.kalpkrutinfotech.com`

Do not hardcode localhost or brand-foreign domains in UI.

Optional integrations (only when real credentials exist):

- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PAYMENT_WEBHOOK_SECRET`
- Email: `RESEND_API_KEY` or SMTP_*
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Client Firebase: `NEXT_PUBLIC_FIREBASE_*`

## Notes

- Seed content is **demo QA data**, not live commercial shows.
- Replace seed catalog via Admin before production launch.
- App connects to Postgres directly (Drizzle + `pg`). Supabase Auth is not required for booking.
