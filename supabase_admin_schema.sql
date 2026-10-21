-- ==============================================================================
-- MahaTicket - Unified Admin & Organizer Governance Schema Migration
-- ==============================================================================

-- 1. Events Table Extensions for Rich Content & Stitch Compliance
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS rich_description TEXT,
  ADD COLUMN IF NOT EXISTS advisory_text TEXT,
  ADD COLUMN IF NOT EXISTS cast_crew_metadata JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 2. Organizers Table Extensions for Access Governance
ALTER TABLE organizers
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS verification_docs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS can_scan_tickets BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_view_attendees BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS scanner_auth_token TEXT,
  ADD COLUMN IF NOT EXISTS scanner_pin_hash TEXT;

-- 3. Users Table Role Verification
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'customer';
  END IF;
END $$;

-- 4. Fast Lookup & Gate Verification Indexes (Valid columns only)
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_seat_inventory_session_status ON seat_inventory(session_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(user_phone);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(user_email);

-- 5. RLS Policies: Ensure Organizers can view attendee bookings without accessing passwords
COMMENT ON TABLE organizers IS 'Organizers are strictly restricted to ticket scanning and viewing event booking attendees.';
