-- ==============================================================================
-- MahaTicket (महाटिकिट) - Clean Production Database Schema & Seed Script
-- Idempotent & Safe: Can be run in Supabase SQL Editor anytime.
-- ==============================================================================

-- Drop old legacy tables if present
DROP TABLE IF EXISTS legacy_bookings_uuid2, legacy_events_uuid2, legacy_profiles_uuid2, legacy_seats_uuid2, legacy_showtimes_uuid2, legacy_venues_uuid2 CASCADE;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Guest User',
  phone_number TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  preferred_language TEXT NOT NULL DEFAULT 'mr',
  city TEXT NOT NULL DEFAULT 'Pune',
  password_hash TEXT,
  organizer_id INTEGER,
  status TEXT DEFAULT 'active',
  assigned_events TEXT,
  otp_code TEXT,
  otp_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Organizers Table
CREATE TABLE IF NOT EXISTS organizers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Pune',
  verification_status TEXT NOT NULL DEFAULT 'verified',
  status TEXT DEFAULT 'active',
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_rate INTEGER NOT NULL DEFAULT 600,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  pan_number TEXT,
  gstin TEXT,
  approval_status VARCHAR(32) DEFAULT 'approved',
  can_scan_tickets BOOLEAN DEFAULT TRUE,
  can_view_attendees BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Districts & Cities
CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  division TEXT NOT NULL,
  division_mr TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  district_id INTEGER REFERENCES districts(id),
  name TEXT NOT NULL UNIQUE,
  name_mr TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  is_popular INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Venues
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  district_id INTEGER REFERENCES districts(id),
  city_id INTEGER REFERENCES cities(id),
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
  has_seat_layout INTEGER NOT NULL DEFAULT 1,
  verification_status TEXT NOT NULL DEFAULT 'verified',
  is_template INTEGER NOT NULL DEFAULT 1,
  ownership_type TEXT NOT NULL DEFAULT 'public_theatre',
  layout_config TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Venue Sections & Physical Seats
CREATE TABLE IF NOT EXISTS venue_sections (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  rows_count INTEGER NOT NULL DEFAULT 4,
  cols_count INTEGER NOT NULL DEFAULT 8,
  base_price INTEGER NOT NULL,
  accessible INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  section_id INTEGER REFERENCES venue_sections(id) ON DELETE CASCADE NOT NULL,
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_code TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard',
  is_accessible INTEGER NOT NULL DEFAULT 0,
  is_blocked INTEGER NOT NULL DEFAULT 0
);

-- 6. Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER REFERENCES organizers(id) NOT NULL,
  venue_id INTEGER REFERENCES venues(id) NOT NULL,
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
  trailer_url TEXT,
  gallery_urls TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  featured INTEGER NOT NULL DEFAULT 0,
  tag TEXT,
  cast_crew TEXT,
  convenience_fee_type TEXT NOT NULL DEFAULT 'flat',
  convenience_fee_value INTEGER NOT NULL DEFAULT 3000,
  gst_percent INTEGER NOT NULL DEFAULT 18,
  cancellation_policy TEXT NOT NULL DEFAULT 'cancellable_up_to_4hr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Event Sessions & Ticket Types
CREATE TABLE IF NOT EXISTS event_sessions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  session_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  session_id INTEGER REFERENCES event_sessions(id) ON DELETE CASCADE NOT NULL,
  section_id INTEGER REFERENCES venue_sections(id),
  name TEXT NOT NULL,
  name_mr TEXT NOT NULL,
  price INTEGER NOT NULL,
  total_quota INTEGER NOT NULL,
  available_quota INTEGER NOT NULL,
  is_seated INTEGER NOT NULL DEFAULT 1
);

-- 8. Seat Inventory (Authoritative reservation state)
CREATE TABLE IF NOT EXISTS seat_inventory (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES event_sessions(id) ON DELETE CASCADE NOT NULL,
  seat_id INTEGER REFERENCES seats(id) ON DELETE CASCADE NOT NULL,
  ticket_type_id INTEGER REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  held_by_user_id TEXT,
  hold_expires_at TIMESTAMP WITH TIME ZONE,
  order_id INTEGER,
  CONSTRAINT uq_session_seat UNIQUE (session_id, seat_id)
);

-- 9. Orders & Tickets
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  user_email TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_name TEXT NOT NULL,
  event_id INTEGER REFERENCES events(id) NOT NULL,
  session_id INTEGER REFERENCES event_sessions(id) NOT NULL,
  ticket_count INTEGER NOT NULL,
  ticket_face_value_total INTEGER NOT NULL,
  platform_fee_total INTEGER NOT NULL,
  tax_total INTEGER NOT NULL,
  gateway_cost_estimate INTEGER NOT NULL DEFAULT 0,
  discount_total INTEGER NOT NULL DEFAULT 0,
  grand_total INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  idempotency_key TEXT UNIQUE,
  hold_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  session_id INTEGER REFERENCES event_sessions(id) NOT NULL,
  ticket_type_id INTEGER REFERENCES ticket_types(id) NOT NULL,
  seat_id INTEGER REFERENCES seats(id),
  seat_code TEXT NOT NULL DEFAULT 'General Admission',
  attendee_name TEXT NOT NULL,
  face_value INTEGER NOT NULL,
  security_hash TEXT NOT NULL,
  qr_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'flat',
  discount_value INTEGER NOT NULL,
  min_order_value INTEGER NOT NULL DEFAULT 0,
  max_discount INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_to TIMESTAMP WITH TIME ZONE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure backwards-compatibility for existing coupons table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'flat';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_value INTEGER DEFAULT 5000;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_value INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount INTEGER DEFAULT 10000;

-- Indexes for ultra-fast query execution
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_sessions_event_status ON event_sessions(event_id, status);
CREATE INDEX IF NOT EXISTS idx_seat_inventory_lookup ON seat_inventory(session_id, status);
CREATE INDEX IF NOT EXISTS idx_seats_venue_section ON seats(venue_id, section_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(user_phone);

-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- 1. Default Organizer
INSERT INTO organizers (id, name, company_name, email, phone, city, verification_status, status)
VALUES (1, 'MahaNatya Pratishthan', 'Maharashtra Theatrical Arts Corp', 'support@mahaticket.in', '9822001122', 'Pune', 'verified', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Major Cities of Maharashtra
INSERT INTO cities (name, name_mr, state, is_popular, is_active, sort_order)
VALUES 
  ('All', 'सर्व शहरे', 'Maharashtra', 1, 1, 1),
  ('Pune', 'पुणे', 'Maharashtra', 1, 1, 2),
  ('Mumbai', 'मुंबई', 'Maharashtra', 1, 1, 3),
  ('Thane', 'ठाणे', 'Maharashtra', 1, 1, 4),
  ('Nashik', 'नाशिक', 'Maharashtra', 1, 1, 5),
  ('Kolhapur', 'कोल्हापूर', 'Maharashtra', 1, 1, 6),
  ('Nagpur', 'नागपूर', 'Maharashtra', 1, 1, 7),
  ('Chhatrapati Sambhajinagar', 'छत्रपती संभाजीनगर', 'Maharashtra', 1, 1, 8),
  ('Solapur', 'सोलापूर', 'Maharashtra', 0, 1, 9),
  ('Satara', 'सातारा', 'Maharashtra', 0, 1, 10),
  ('Sangli', 'सांगली', 'Maharashtra', 0, 1, 11),
  ('Navi Mumbai', 'नवी मुंबई', 'Maharashtra', 1, 1, 12)
ON CONFLICT (name) DO UPDATE SET is_active = 1, is_popular = EXCLUDED.is_popular;

-- 3. Iconic Theatres with Admin Seat Designer Layout
INSERT INTO venues (id, name, name_mr, address, city, state, pincode, total_capacity, has_seat_layout, layout_config)
VALUES 
  (
    1,
    'Bal Gandharva Rang Mandir',
    'बाळ गंधर्व रंगमंदिर',
    'J.M. Road, Shivajinagar',
    'Pune',
    'Maharashtra',
    '411005',
    850,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच","sections":[{"name":"Balcony","nameMr":"बाल्कनी","basePrice":750,"tier":"platinum","rows":[{"rowLabel":"A","aisleAfter":[],"middleGap":{"enabled":true,"afterSeat":4},"seatsCount":8},{"rowLabel":"B","aisleAfter":[],"middleGap":{"enabled":true,"afterSeat":4},"seatsCount":8}]},{"name":"First Class","nameMr":"प्रथम वर्ग","basePrice":500,"tier":"gold","rows":[{"rowLabel":"C","aisleAfter":[],"middleGap":{"enabled":true,"afterSeat":4},"seatsCount":8},{"rowLabel":"D","aisleAfter":[],"middleGap":{"enabled":true,"afterSeat":4},"seatsCount":8}]},{"name":"Stall","nameMr":"स्टॉल","basePrice":350,"tier":"silver","rows":[{"rowLabel":"E","aisleAfter":[],"middleGap":{"enabled":true,"afterSeat":4},"seatsCount":8},{"rowLabel":"F","aisleAfter":[],"middleGap":{"enabled":true,"afterSeat":4},"seatsCount":8}]}]}'
  ),
  (
    2,
    'Dinanath Mangeshkar Natyagruha',
    'दीनानाथ मंगेशकर नाट्यगृह',
    'Mongibai Road, Vile Parle East',
    'Mumbai',
    'Maharashtra',
    '400057',
    900,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  ),
  (
    3,
    'Yashwantrao Chavan Natyagruha',
    'यशवंतराव चव्हाण नाट्यगृह',
    'Kothrud',
    'Pune',
    'Maharashtra',
    '411038',
    800,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  ),
  (
    4,
    'Dr. Kashinath Ghanekar Natyagruha',
    'डॉ. काशिनाथ घाणेकर नाट्यगृह',
    'Ghodbunder Road',
    'Thane',
    'Maharashtra',
    '400610',
    950,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  )
ON CONFLICT (id) DO UPDATE SET layout_config = EXCLUDED.layout_config;

-- 4. Sections for Bal Gandharva (Venue 1)
INSERT INTO venue_sections (id, venue_id, name, name_mr, rows_count, cols_count, base_price)
VALUES 
  (1, 1, 'Balcony', 'बाल्कनी', 2, 8, 75000),
  (2, 1, 'First Class', 'प्रथम वर्ग', 2, 8, 50000),
  (3, 1, 'Stall', 'स्टॉल', 2, 8, 35000)
ON CONFLICT (id) DO UPDATE SET base_price = EXCLUDED.base_price;

-- 5. Physical Seats for Bal Gandharva (Rows A, B, C, D, E)
INSERT INTO seats (id, venue_id, section_id, row_label, seat_number, seat_code, tier)
VALUES 
  (1, 1, 1, 'A', 1, 'A01', 'platinum'),
  (2, 1, 1, 'A', 2, 'A02', 'platinum'),
  (3, 1, 1, 'A', 3, 'A03', 'platinum'),
  (4, 1, 1, 'A', 4, 'A04', 'platinum'),
  (5, 1, 1, 'A', 5, 'A05', 'platinum'),
  (6, 1, 1, 'A', 6, 'A06', 'platinum'),
  (7, 1, 1, 'A', 7, 'A07', 'platinum'),
  (8, 1, 1, 'A', 8, 'A08', 'platinum'),
  (9, 1, 1, 'B', 1, 'B01', 'platinum'),
  (10, 1, 1, 'B', 2, 'B02', 'platinum'),
  (11, 1, 1, 'B', 3, 'B03', 'platinum'),
  (12, 1, 1, 'B', 4, 'B04', 'platinum'),
  (13, 1, 1, 'B', 5, 'B05', 'platinum'),
  (14, 1, 1, 'B', 6, 'B06', 'platinum'),
  (15, 1, 1, 'B', 7, 'B07', 'platinum'),
  (16, 1, 1, 'B', 8, 'B08', 'platinum'),
  (17, 1, 2, 'C', 1, 'C01', 'gold'),
  (18, 1, 2, 'C', 2, 'C02', 'gold'),
  (19, 1, 2, 'C', 3, 'C03', 'gold'),
  (20, 1, 2, 'C', 4, 'C04', 'gold'),
  (21, 1, 2, 'C', 5, 'C05', 'gold'),
  (22, 1, 2, 'C', 6, 'C06', 'gold'),
  (23, 1, 2, 'C', 7, 'C07', 'gold'),
  (24, 1, 2, 'C', 8, 'C08', 'gold'),
  (25, 1, 2, 'D', 1, 'D01', 'gold'),
  (26, 1, 2, 'D', 2, 'D02', 'gold'),
  (27, 1, 2, 'D', 3, 'D03', 'gold'),
  (28, 1, 2, 'D', 4, 'D04', 'gold'),
  (29, 1, 2, 'D', 5, 'D05', 'gold'),
  (30, 1, 2, 'D', 6, 'D06', 'gold'),
  (31, 1, 2, 'D', 7, 'D07', 'gold'),
  (32, 1, 2, 'D', 8, 'D08', 'gold'),
  (33, 1, 3, 'E', 1, 'E01', 'silver'),
  (34, 1, 3, 'E', 2, 'E02', 'silver'),
  (35, 1, 3, 'E', 3, 'E03', 'silver'),
  (36, 1, 3, 'E', 4, 'E04', 'silver'),
  (37, 1, 3, 'E', 5, 'E05', 'silver'),
  (38, 1, 3, 'E', 6, 'E06', 'silver'),
  (39, 1, 3, 'E', 7, 'E07', 'silver'),
  (40, 1, 3, 'E', 8, 'E08', 'silver')
ON CONFLICT (id) DO NOTHING;

-- 6. Real Events (Dandiya Nights, Sahi Re Sahi, Natsamrat, etc.)
INSERT INTO events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, tag, cast_crew)
VALUES 
  (
    1,
    1,
    'Dandiya Nights 2026',
    'दांडिया रास महोत्सव २०२६',
    'dandiya-nights-2026',
    'cultural',
    'उत्सव / गरबा',
    'Hindi / Gujarati / Marathi',
    240,
    'Experience Maharashtra''s most electrifying Dandiya & Garba celebration with live celebrity orchestra, traditional dhol tasha, ethnic food stalls, and non-stop dancing under royal palace pavilions. Win exciting daily prizes for best traditional attire & best dancer!',
    'महाराष्ट्रातील सर्वात भव्य दांडिया व गरबा रास महोत्सव! प्रसिद्ध गायक, लाइव्ह ढोल-ताशा ऑर्केस्ट्रा, पारंपरिक पोशाख स्पर्धा आणि चवदार खाद्यपदार्थांची मेजवानी. आपल्या मित्र-परिवारासह या भव्य उत्सवात सहभागी व्हा आणि आनंद लुटा!',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600&q=80',
    'published',
    1,
    'ग्रँड सेलिब्रेशन',
    '[{"name":"सचिन-जिगर (Sachin-Jigar)","role":"मुख्य संगीतकार (Live Band)"},{"name":"प्रिती-पिंकी (Preeti-Pinky)","role":"गायिका (Lead Vocalist)"},{"name":"डीजे अनिकेत (DJ Aniket)","role":"डीजे व रिमिक्स (Folk DJ)"},{"name":"राजेश पटेल (Rajesh Patel)","role":"आयोजक (Fest Director)"}]'
  ),
  (
    1,
    1,
    'Punha Sahi Re Sahi',
    'पुन्हा सही रे सही',
    'punha-sahi-re-sahi',
    'plays',
    'नाटक',
    'Marathi',
    165,
    'Bharat Jadhav''s record-breaking legendary comedy drama featuring 4 distinct avatars on stage! A laugh riot that has captivated millions of Maharashtrian theatre lovers worldwide.',
    'भरत जाधव यांचे विक्रमी व तुफान गाजलेले मराठी नाटक! एकाच कलाकाराचे रंगमंचावर ४ भन्नाट अवतार आणि पोट धरून हसविणारी संवादफेक. संपूर्ण कुटुंबासह आवर्जून पाहण्यासारखे महानाट्य.',
    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1000&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80',
    'published',
    1,
    'सुपरहिट हाऊसफुल्ल',
    '[{"name":"भरत जाधव","role":"मुख्य अभिनेता (Madan Sukhatme / Hari)"},{"name":"सिद्धार्थ जाधव","role":"सह-कलाकार"},{"name":"केदार शिंदे","role":"दिग्दर्शक"}]'
  ),
  (
    1,
    2,
    'Natsamrat',
    'नटसम्राट',
    'natsamrat',
    'plays',
    'नाटक',
    'Marathi',
    175,
    'Kusumagraj''s timeless classic depicting the tragic journey of Shakespearean veteran actor Ganpatrao Belvalkar. Experience towering theatrical performances and iconic monologues.',
    'कुसुमाग्रज लिखित अजरामर मराठी अभिजात नाट्यकृती! अप्पासाहेब बेलवलकर यांची हृदयद्रावक कथा आणि रंगमंचावर थरार निर्माण करणारे गाजलेले स्वगत.',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1000&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80',
    'published',
    1,
    'अभिजात महानाट्य',
    '[{"name":"मोहन जोशी","role":"अप्पासाहेब बेलवलकर"},{"name":"रोहिणी हट्टंगडी","role":"कावेरी (सरकार)"},{"name":"जयंत सावरकर","role":"राम जोशी"}]'
  ),
  (
    1,
    1,
    'Aamhi Aani Aamche Baap',
    'आम्ही आणि आमचे बाप',
    'aamhi-aani-aamche-baap',
    'plays',
    'नाटक',
    'Marathi',
    150,
    'A heart-warming, rib-tickling modern father-son comedy exploring generation gaps, modern lifestyles, and unconditional family bonds.',
    'बाप-लेकाच्या नात्यातील गोड-आंबट गंमत, आधुनिक जीवनशैली आणि कौटुंबिक प्रेमाचा हळवा प्रवास उलगडणारे सुपर कॉमेडी नाटक.',
    'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=1000&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1600&q=80',
    'published',
    0,
    'नवीन प्रयोग',
    '[{"name":"सुमित राघवन","role":"मुख्य अभिनेता"},{"name":"सुनील बर्वे","role":"बाप"},{"name":"सचिन खेडेकर","role":"विशेष अतिथी"}]'
  ),
  (
    1,
    1,
    'Vasantotsav 2026 Live',
    'वसंतोत्सव २०२६ संगीत महोत्सव',
    'vasantotsav-2026',
    'music',
    'संगीत',
    'Marathi / Hindi',
    210,
    'Annual musical homage to Bharat Ratna Pandit Vasantrao Deshpande. Featuring soul-stirring classical, natyasangeet, ghazals, and grand fusion ensembles by Rahul Deshpande & maestro friends.',
    'पं. वसंतराव देशपांडे यांच्या स्मृतीप्रित्यर्थ आयोजित भव्य संगीत महोत्सव! शास्त्रीय संगीत, नाट्यसंगीत आणि फ्युजन संगीताची अप्रतिम मैफल.',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&q=80',
    'published',
    1,
    'विशेष संगीत मैफल',
    '[{"name":"राहुल देशपांडे","role":"गायक व आयोजक"},{"name":"अनुपम रॉय","role":"संगीतकार"},{"name":"ओजस अधिया","role":"तबला वादक"}]'
  )
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  title_mr = EXCLUDED.title_mr,
  poster_url = EXCLUDED.poster_url,
  banner_url = EXCLUDED.banner_url,
  cast_crew = EXCLUDED.cast_crew,
  status = 'published';

-- 7. Sessions for Events (Upcoming dates)
-- Dandiya Nights Sessions
INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
SELECT 
  e.id, 
  NOW() + (s.day_offset || ' days')::interval + '4 hours'::interval,
  NOW() + (s.day_offset || ' days')::interval + '8 hours'::interval,
  'active'
FROM events e
CROSS JOIN (VALUES (1), (2), (3)) AS s(day_offset)
WHERE e.slug = 'dandiya-nights-2026'
AND NOT EXISTS (
  SELECT 1 FROM event_sessions es WHERE es.event_id = e.id
);

-- Punha Sahi Re Sahi Sessions
INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
SELECT 
  e.id, 
  NOW() + (s.day_offset || ' days')::interval + '2 hours'::interval,
  NOW() + (s.day_offset || ' days')::interval + '5 hours'::interval,
  'active'
FROM events e
CROSS JOIN (VALUES (1), (2)) AS s(day_offset)
WHERE e.slug = 'punha-sahi-re-sahi'
AND NOT EXISTS (
  SELECT 1 FROM event_sessions es WHERE es.event_id = e.id
);

-- Natsamrat Sessions
INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
SELECT 
  e.id, 
  NOW() + (s.day_offset || ' days')::interval + '3 hours'::interval,
  NOW() + (s.day_offset || ' days')::interval + '6 hours'::interval,
  'active'
FROM events e
CROSS JOIN (VALUES (2), (4)) AS s(day_offset)
WHERE e.slug = 'natsamrat'
AND NOT EXISTS (
  SELECT 1 FROM event_sessions es WHERE es.event_id = e.id
);

-- Vasantotsav Sessions
INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
SELECT 
  e.id, 
  NOW() + (s.day_offset || ' days')::interval + '4 hours'::interval,
  NOW() + (s.day_offset || ' days')::interval + '7.5 hours'::interval,
  'active'
FROM events e
CROSS JOIN (VALUES (1), (2), (3)) AS s(day_offset)
WHERE e.slug = 'vasantotsav-2026'
AND NOT EXISTS (
  SELECT 1 FROM event_sessions es WHERE es.event_id = e.id
);

-- 8. Ticket Types for Dandiya Nights
INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
SELECT 
  es.event_id,
  es.id,
  3,
  'General Pass',
  'सामान्य प्रवेश पास',
  35000,
  200,
  180,
  0
FROM event_sessions es
JOIN events e ON es.event_id = e.id
WHERE e.slug = 'dandiya-nights-2026'
AND NOT EXISTS (
  SELECT 1 FROM ticket_types tt WHERE tt.session_id = es.id AND tt.name = 'General Pass'
);

INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
SELECT 
  es.event_id,
  es.id,
  2,
  'VIP Arena Pass',
  'व्हीआयपी अरेना पास',
  75000,
  100,
  90,
  0
FROM event_sessions es
JOIN events e ON es.event_id = e.id
WHERE e.slug = 'dandiya-nights-2026'
AND NOT EXISTS (
  SELECT 1 FROM ticket_types tt WHERE tt.session_id = es.id AND tt.name = 'VIP Arena Pass'
);

INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
SELECT 
  es.event_id,
  es.id,
  1,
  'Couple Pass',
  'कपल पास',
  120000,
  50,
  45,
  0
FROM event_sessions es
JOIN events e ON es.event_id = e.id
WHERE e.slug = 'dandiya-nights-2026'
AND NOT EXISTS (
  SELECT 1 FROM ticket_types tt WHERE tt.session_id = es.id AND tt.name = 'Couple Pass'
);

-- Ticket Types for Punha Sahi Re Sahi (Tiered: Stall ₹350, First Class ₹500, Balcony ₹750)
INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
SELECT 
  es.event_id,
  es.id,
  s.id,
  s.name,
  s.name_mr,
  s.base_price,
  40,
  40,
  1
FROM event_sessions es
JOIN events e ON es.event_id = e.id
CROSS JOIN venue_sections s
WHERE e.slug = 'punha-sahi-re-sahi' AND s.venue_id = 1
AND NOT EXISTS (
  SELECT 1 FROM ticket_types tt WHERE tt.session_id = es.id AND tt.section_id = s.id
);

-- 9. Seat Inventory for Theatre Shows (Bal Gandharva Rang Mandir Seats)
INSERT INTO seat_inventory (session_id, seat_id, ticket_type_id, status)
SELECT 
  es.id AS session_id,
  st.id AS seat_id,
  tt.id AS ticket_type_id,
  'available' AS status
FROM event_sessions es
JOIN events e ON es.event_id = e.id
JOIN seats st ON st.venue_id = e.venue_id
JOIN ticket_types tt ON tt.session_id = es.id AND tt.section_id = st.section_id
WHERE e.slug = 'punha-sahi-re-sahi'
ON CONFLICT (session_id, seat_id) DO NOTHING;

-- 10. Discount Coupons
INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, used_count, active, is_active)
VALUES 
  ('MAHA50', 'flat', 5000, 30000, 5000, 12, 1, 1),
  ('NATAK10', 'percentage', 1000, 20000, 10000, 45, 1, 1),
  ('CINEMA20', 'flat', 2000, 15000, 2000, 8, 1, 1)
ON CONFLICT (code) DO UPDATE SET active = 1, is_active = 1, used_count = EXCLUDED.used_count;
