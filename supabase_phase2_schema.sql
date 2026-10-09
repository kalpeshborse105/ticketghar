-- ==============================================================================
-- MahaTicket / TicketGhar - Phase 2 Schema Migration
-- Maharashtra Location Master, Reusable Venue Templates & User Profile Avatar
-- ==============================================================================

-- 1. Extend Users table for profile photo persistence
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create Districts Table (36 Official Administrative Districts of Maharashtra)
CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  name_mr VARCHAR(128) NOT NULL,
  division VARCHAR(64) NOT NULL,
  division_mr VARCHAR(64) NOT NULL,
  state VARCHAR(64) NOT NULL DEFAULT 'Maharashtra',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Talukas Table (Sub-districts)
CREATE TABLE IF NOT EXISTS talukas (
  id SERIAL PRIMARY KEY,
  district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  name_mr VARCHAR(128) NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Extend Cities Table for District/Taluka Linking
ALTER TABLE cities 
  ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id),
  ADD COLUMN IF NOT EXISTS taluka_id INTEGER REFERENCES talukas(id),
  ADD COLUMN IF NOT EXISTS is_popular INTEGER DEFAULT 0;

-- 5. Extend Venues Table for Master Directory & Reusable Templates
ALTER TABLE venues 
  ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id),
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id),
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS is_template INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(32) DEFAULT 'public_theatre',
  ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}'::jsonb;

-- 6. Indexes for Fast Directory Lookup
CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(code);
CREATE INDEX IF NOT EXISTS idx_districts_division ON districts(division);
CREATE INDEX IF NOT EXISTS idx_cities_district ON cities(district_id);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_district ON venues(district_id);
CREATE INDEX IF NOT EXISTS idx_venues_verification ON venues(verification_status);
