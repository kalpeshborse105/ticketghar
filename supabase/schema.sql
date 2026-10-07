-- MahaTicket (महाटिकिट) — Complete Supabase / Postgres bootstrap
-- Derived from src/db/schema.ts + Phase 2 extensions.
-- Safe for a NEW EMPTY database. No DROP TABLE statements.
-- Idempotent: uses IF NOT EXISTS throughout.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Guest User',
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'super_admin', 'organizer', 'manager', 'operations', 'finance', 'scanner')),
  preferred_language TEXT NOT NULL DEFAULT 'mr'
    CHECK (preferred_language IN ('mr', 'en')),
  city TEXT NOT NULL DEFAULT 'Pune',
  password_hash TEXT,
  organizer_id INTEGER REFERENCES public.organizers (id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  assigned_events TEXT,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. organizers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Pune',
  verification_status TEXT NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  status TEXT DEFAULT 'active',
  commission_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (commission_type IN ('percentage', 'flat')),
  commission_rate INTEGER NOT NULL DEFAULT 600,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  pan_number TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. cities (Phase 2 — explicit city catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_mr TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. venues
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  pincode TEXT,
  latitude TEXT,
  longitude TEXT,
  facilities TEXT,
  total_capacity INTEGER NOT NULL DEFAULT 600,
  has_seat_layout INTEGER NOT NULL DEFAULT 1 CHECK (has_seat_layout IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues (city);

-- ---------------------------------------------------------------------------
-- 5. venue_sections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_sections (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES public.venues (id),
  name TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  rows_count INTEGER NOT NULL DEFAULT 4,
  cols_count INTEGER NOT NULL DEFAULT 8,
  base_price INTEGER NOT NULL,
  accessible INTEGER NOT NULL DEFAULT 0 CHECK (accessible IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_venue_sections_venue ON public.venue_sections (venue_id);

-- ---------------------------------------------------------------------------
-- 6. seats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seats (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES public.venues (id),
  section_id INTEGER NOT NULL REFERENCES public.venue_sections (id),
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_code TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard',
  is_accessible INTEGER NOT NULL DEFAULT 0 CHECK (is_accessible IN (0, 1)),
  is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
  UNIQUE (venue_id, seat_code)
);

CREATE INDEX IF NOT EXISTS idx_seats_venue ON public.seats (venue_id);
CREATE INDEX IF NOT EXISTS idx_seats_section ON public.seats (section_id);

-- ---------------------------------------------------------------------------
-- 7. events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER NOT NULL REFERENCES public.organizers (id),
  venue_id INTEGER NOT NULL REFERENCES public.venues (id),
  title TEXT NOT NULL,
  title_mr TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  category_mr TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Marathi',
  age_guidance TEXT NOT NULL DEFAULT 'U',
  duration_minutes INTEGER NOT NULL DEFAULT 150,
  description TEXT NOT NULL,
  description_mr TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'published', 'unpublish', 'unpublished', 'cancelled', 'completed')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  rejection_reason TEXT,
  convenience_fee_type TEXT NOT NULL DEFAULT 'flat',
  convenience_fee_value INTEGER NOT NULL DEFAULT 3000,
  gst_percent INTEGER NOT NULL DEFAULT 18,
  cancellation_policy TEXT NOT NULL DEFAULT 'cancellable_up_to_4hr',
  cast_crew TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_venue ON public.events (venue_id);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events (featured);

-- ---------------------------------------------------------------------------
-- 8. event_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_sessions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.events (id),
  session_start_time TIMESTAMPTZ NOT NULL,
  session_end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'completed', 'sold_out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON public.event_sessions (event_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_start ON public.event_sessions (session_start_time);

-- ---------------------------------------------------------------------------
-- 9. ticket_types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.events (id),
  session_id INTEGER NOT NULL REFERENCES public.event_sessions (id),
  section_id INTEGER REFERENCES public.venue_sections (id),
  name TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  total_quota INTEGER NOT NULL CHECK (total_quota >= 0),
  available_quota INTEGER NOT NULL CHECK (available_quota >= 0),
  is_seated INTEGER NOT NULL DEFAULT 1 CHECK (is_seated IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_ticket_types_session ON public.ticket_types (session_id);

-- ---------------------------------------------------------------------------
-- 10. seat_inventory (session-specific authoritative availability)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seat_inventory (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.event_sessions (id),
  seat_id INTEGER NOT NULL REFERENCES public.seats (id),
  ticket_type_id INTEGER NOT NULL REFERENCES public.ticket_types (id),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'held', 'booked', 'blocked')),
  held_by_user_id TEXT,
  hold_expires_at TIMESTAMPTZ,
  order_id INTEGER,
  UNIQUE (session_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_inventory_session_status
  ON public.seat_inventory (session_id, status);
CREATE INDEX IF NOT EXISTS idx_seat_inventory_hold_expires
  ON public.seat_inventory (hold_expires_at)
  WHERE status = 'held';

-- ---------------------------------------------------------------------------
-- 11. orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES public.users (id),
  user_email TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_name TEXT NOT NULL,
  event_id INTEGER NOT NULL REFERENCES public.events (id),
  session_id INTEGER NOT NULL REFERENCES public.event_sessions (id),
  ticket_count INTEGER NOT NULL CHECK (ticket_count > 0),
  ticket_face_value_total INTEGER NOT NULL CHECK (ticket_face_value_total >= 0),
  platform_fee_total INTEGER NOT NULL CHECK (platform_fee_total >= 0),
  tax_total INTEGER NOT NULL CHECK (tax_total >= 0),
  gateway_cost_estimate INTEGER NOT NULL CHECK (gateway_cost_estimate >= 0),
  discount_total INTEGER NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  grand_total INTEGER NOT NULL CHECK (grand_total >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'captured', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  idempotency_key TEXT UNIQUE,
  hold_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event ON public.orders (event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status, payment_status);

-- FK from seat_inventory.order_id after orders exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seat_inventory_order_id_fkey'
  ) THEN
    ALTER TABLE public.seat_inventory
      ADD CONSTRAINT seat_inventory_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 12. tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL REFERENCES public.orders (id),
  session_id INTEGER NOT NULL REFERENCES public.event_sessions (id),
  ticket_type_id INTEGER NOT NULL REFERENCES public.ticket_types (id),
  seat_id INTEGER REFERENCES public.seats (id),
  seat_code TEXT NOT NULL DEFAULT 'General Admission',
  attendee_name TEXT NOT NULL,
  face_value INTEGER NOT NULL CHECK (face_value >= 0),
  security_hash TEXT NOT NULL,
  qr_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_order ON public.tickets (order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_session ON public.tickets (session_id);

-- ---------------------------------------------------------------------------
-- 13. ticket_scans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES public.tickets (id),
  ticket_code TEXT NOT NULL,
  scanned_by_user_id INTEGER REFERENCES public.users (id),
  scanner_device TEXT,
  scan_result TEXT NOT NULL,
  gate_name TEXT NOT NULL DEFAULT 'Main Entry Gate 1',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket ON public.ticket_scans (ticket_id);

-- ---------------------------------------------------------------------------
-- 14. settlements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id SERIAL PRIMARY KEY,
  settlement_reference TEXT NOT NULL UNIQUE,
  organizer_id INTEGER NOT NULL REFERENCES public.organizers (id),
  event_id INTEGER NOT NULL REFERENCES public.events (id),
  total_gross_ticket_sales INTEGER NOT NULL,
  total_platform_fees_collected INTEGER NOT NULL,
  total_payment_gateway_cost INTEGER NOT NULL,
  total_tax_collected INTEGER NOT NULL,
  platform_commission_earned INTEGER NOT NULL,
  total_refund_deductions INTEGER NOT NULL DEFAULT 0,
  net_payable_to_organizer INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_process', 'settled', 'disputed')),
  payout_utr TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 15. partner_leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id SERIAL PRIMARY KEY,
  organizer_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  event_name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  venue_preference TEXT,
  proposed_date TEXT,
  expected_capacity INTEGER,
  ticket_price_range TEXT,
  website_or_social TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'verified', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 16. audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 17. coupons / offers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'flat')),
  discount_value INTEGER NOT NULL,
  min_order_value INTEGER NOT NULL DEFAULT 0,
  max_discount INTEGER NOT NULL DEFAULT 10000,
  usage_limit INTEGER,
  per_user_limit INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  event_id INTEGER REFERENCES public.events (id),
  city TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 18. announcements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  city TEXT,
  category TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements (active);

-- ---------------------------------------------------------------------------
-- 19. device_tokens (FCM)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id SERIAL PRIMARY KEY,
  user_uid TEXT,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android'
    CHECK (platform IN ('android', 'ios', 'web')),
  app_version TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens (user_uid);

-- ---------------------------------------------------------------------------
-- 20. notification_log (dedupe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_log (
  id SERIAL PRIMARY KEY,
  device_token_id INTEGER REFERENCES public.device_tokens (id),
  user_uid TEXT,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN (
      'BOOKING_CONFIRMED',
      'PAYMENT_SUCCESS',
      'EVENT_REMINDER',
      'EVENT_UPDATED',
      'BOOKING_CANCELLED',
      'OFFER'
    )),
  dedupe_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_json TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Atomic seat hold helper (race-safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hold_seats(
  p_session_id INTEGER,
  p_seat_ids INTEGER[],
  p_user_id TEXT,
  p_hold_minutes INTEGER DEFAULT 8
)
RETURNS TABLE (inventory_id INTEGER, seat_id INTEGER, status TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Release expired holds for this session first
  UPDATE public.seat_inventory
  SET status = 'available',
      held_by_user_id = NULL,
      hold_expires_at = NULL
  WHERE session_id = p_session_id
    AND status = 'held'
    AND hold_expires_at < NOW();

  RETURN QUERY
  UPDATE public.seat_inventory si
  SET status = 'held',
      held_by_user_id = p_user_id,
      hold_expires_at = NOW() + (p_hold_minutes || ' minutes')::INTERVAL
  WHERE si.session_id = p_session_id
    AND si.seat_id = ANY (p_seat_ids)
    AND si.status = 'available'
  RETURNING si.id, si.seat_id, si.status;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Sensitive writes go through Next.js server APIs (service role / direct SQL).
-- Anon clients get read-only published catalog where safe.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Public read policies (catalog only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_published_events') THEN
    CREATE POLICY public_read_published_events ON public.events
      FOR SELECT USING (status = 'published');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_venues') THEN
    CREATE POLICY public_read_venues ON public.venues FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_cities') THEN
    CREATE POLICY public_read_cities ON public.cities FOR SELECT USING (is_active = 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_active_sessions') THEN
    CREATE POLICY public_read_active_sessions ON public.event_sessions
      FOR SELECT USING (status = 'active');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_ticket_types') THEN
    CREATE POLICY public_read_ticket_types ON public.ticket_types FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_sections') THEN
    CREATE POLICY public_read_sections ON public.venue_sections FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_seats') THEN
    CREATE POLICY public_read_seats ON public.seats FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_seat_inventory') THEN
    CREATE POLICY public_read_seat_inventory ON public.seat_inventory FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_active_announcements') THEN
    CREATE POLICY public_read_active_announcements ON public.announcements
      FOR SELECT USING (
        active = 1
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_active_coupons') THEN
    CREATE POLICY public_read_active_coupons ON public.coupons
      FOR SELECT USING (active = 1);
  END IF;
END $$;

-- Idempotent column migrations for existing instances
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cast_crew TEXT;

-- NOTE: App connects with Postgres role that bypasses RLS (direct SQL via pg Pool).
-- Browser must never receive service-role / DB password.
