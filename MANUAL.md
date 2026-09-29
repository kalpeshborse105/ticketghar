# TicketGhar (तिकीटघर) — Production Manual & Operations Guide
**Maharashtra-First Digital Ticket Marketplace & Company Control Center**

---

## 1. Quick Navigation & How to Visit Admin Panel

### A. Accessing the Admin Console
- **Direct Switcher in Header:** Click the prominent golden **"ॲडमिन कक्ष / Admin Panel"** button in the top navigation bar at any time.
- **Footer Link:** Click **"प्रशासक लॉगिन (Admin)"** in the website footer.
- **Partner Banner:** Click the **"ॲडमिन कंट्रोल कक्ष"** button in the lower organizer banner.

### B. Role-Based Access Control (RBAC)
In the top right of the Admin Console, use the **"सक्रिय भूमिका (RBAC)"** selector to test different operational modes:
1. **Super Admin (`super_admin`):** Full control over GMV, creating events, adding venues/cities, financial payouts, and viewing all orders.
2. **Operations (`operations`):** Reviewing organizer leads, scheduling showtimes, and publishing/unpublishing events.
3. **Finance (`finance`):** Settlement ledger review, fee breakdowns, and recording bank payout UTRs.
4. **Gate Scanner (`scanner`):** Mobile and desktop ticket gate barcode/QR scanner for verifying entry.

---

## 2. Managing Cities & Venues (शहरे व नाट्यगृहे)

### Adding a New City or Venue:
1. Go to the Admin Panel and click **"शहरे व नाट्यगृहे (Cities)"** in the sidebar.
2. Click **"+ नवीन नाट्यगृह / शहर जोडा"**.
3. Fill in:
   - **Auditorium Name:** (e.g. *Kalidas Natyamandir* / *कालिदास नाट्यमंदिर*).
   - **City in Maharashtra:** (e.g. *Nashik*, *Kolhapur*, *Solapur*, *Chhatrapati Sambhaji Nagar*, *Amravati*, *Thane*, or any custom city).
   - **Address:** Street location.
   - **Capacity & Layout:** Specify Balcony and Stall rows/columns and base ticket prices (e.g. ₹400 Balcony, ₹300 Stall).
4. Click **"Save Venue"**. The venue and its physical seat grid are instantly written to PostgreSQL, and the city immediately becomes selectable across the platform!

---

## 3. Database Architecture & Connection Guide

### A. Production Setup (Google Cloud SQL)
- **Engine:** PostgreSQL 16
- **Instance ID:** `ai-studio-05ee5a93`
- **Region:** `asia-southeast1`
- **Connection Type:** Google Cloud SQL Auth Proxy via Unix domain socket.
- **Connection Pooling:** Initialized lazily using `pg.Pool` with a maximum pool size of 10 connections.

### B. Runtime Environment Variables
Ensure these are configured in your `.env` or deployment environment:

| Variable | Description |
|---|---|
| `SQL_HOST` | Unix socket path (e.g. `/cloudsql/prime-sylph-wthv3:asia-southeast1:ai-studio-05ee5a93`) or `127.0.0.1` for local PostgreSQL. |
| `SQL_DB_NAME` | Database name (e.g. `ai-studio-db`). |
| `SQL_USER` | Application runtime database user with read/write access. |
| `SQL_PASSWORD` | Password for `SQL_USER`. |
| `SQL_ADMIN_USER` | Admin user with DDL migration privileges for `drizzle-kit`. |
| `SQL_ADMIN_PASSWORD` | Password for `SQL_ADMIN_USER`. |
| `RAZORPAY_KEY_ID` | Indian payment gateway public key for checkout. |
| `RAZORPAY_KEY_SECRET` | Secret key for verifying payment webhooks. |
| `TICKET_SECRET` | HMAC salt for signing verifiable gate entry QR passes. |

### C. Local Development Setup (Running on your machine)
If running locally with Docker or local PostgreSQL:
```bash
# 1. Start local PostgreSQL
docker run --name ticketghar-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai-studio-db -p 5432:5432 -d postgres:16

# 2. Configure .env
SQL_HOST="127.0.0.1"
SQL_DB_NAME="ai-studio-db"
SQL_USER="postgres"
SQL_PASSWORD="postgres"
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="postgres"

# 3. Push Database Schema
npx drizzle-kit push --config=./src/db/drizzle.config.ts

# 4. Seed authentic Maharashtra events, venues & seat maps
bun run src/db/seed.ts # or npx tsx src/db/seed.ts

# 5. Start dev server
npm run dev
```

---

## 4. Key Platform Features & Flow

1. **Price Range Slider:** Users can drag the budget slider from ₹100 to ₹2,000+ or click quick presets (`< ₹300`, `< ₹500`, `< ₹1,000`) to find events fitting their budget.
2. **Date Picker Dropdown:** Users can filter shows by Today, Tomorrow, This Weekend, Next 7 Days, or pick a specific date via the calendar input.
3. **Atomic Seat Hold Engine:** Locks selected seats for 8 minutes with an animated countdown timer. Expired holds are automatically released to prevent inventory hoarding.
4. **Transparent Checkout:** Breaks down ticket face value, platform convenience fee, and 18% GST with coupon support (`MAHA50`, `NATAK10`).
5. **Verifiable Gate Pass & Duplicate Rejection:** Generates an HMAC-SHA256 signed QR code. When scanned at the gate, the first scan grants entry; any subsequent scan of the same ticket is rejected with an "ALREADY USED" alert showing previous scan time and gate ID.
6. **Financial Settlement Ledger:** Separates ticket value, platform convenience fee, payment gateway cost, taxes, organizer commission, and calculates net payable to the organizer. Admins can record bank UTR reference numbers to mark settlements paid.
