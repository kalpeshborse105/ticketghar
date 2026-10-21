-- MahaTicket seed data — DEMO / STARTER only (not live commercial shows)
-- Safe to re-run: skips when events already exist.
-- Replace later with production catalog via Admin.

DO $$
DECLARE
  v_event_count INTEGER;
  admin_id INTEGER;
  customer_id INTEGER;
  org1 INTEGER;
  org2 INTEGER;
  org3 INTEGER;
  v_bal INTEGER;
  v_shivaji INTEGER;
  v_yash INTEGER;
  v_desh INTEGER;
  v_inamdar INTEGER;
  v_nehru INTEGER;
  sec_bal INTEGER;
  sec_stall INTEGER;
  sec_gold INTEGER;
  sec_silver INTEGER;
  e1 INTEGER; e2 INTEGER; e3 INTEGER; e4 INTEGER; e5 INTEGER; e6 INTEGER; e7 INTEGER; e8 INTEGER;
  s1 INTEGER; s2 INTEGER; s_music INTEGER; s_movie1 INTEGER; s_movie2 INTEGER; s_comedy INTEGER; s_cult INTEGER; s_ws INTEGER;
  tt_bal INTEGER; tt_stall INTEGER;
  seat_rec RECORD;
  ticket_face INTEGER := 100000;
  plat_fee INTEGER := 6000;
  tax_amt INTEGER := 1080;
  order_id_val INTEGER;
  hash1 TEXT;
  hash2 TEXT;
BEGIN
  SELECT COUNT(*) INTO v_event_count FROM public.events;
  IF v_event_count > 0 THEN
    RAISE NOTICE 'Seed skipped: events already present (%).', v_event_count;
    RETURN;
  END IF;

  -- Cities
  INSERT INTO public.cities (name, name_mr, sort_order) VALUES
    ('Mumbai', 'मुंबई', 1),
    ('Pune', 'पुणे', 2),
    ('Nagpur', 'नागपूर', 3),
    ('Nashik', 'नाशिक', 4),
    ('Thane', 'ठाणे', 5),
    ('Kolhapur', 'कोल्हापूर', 6),
    ('Sangli', 'सांगली', 7),
    ('Solapur', 'सोलापूर', 8),
    ('Chhatrapati Sambhajinagar', 'छत्रपती संभाजीनगर', 9),
    ('Ahilyanagar', 'अहिल्यानगर', 10)
  ON CONFLICT (name) DO NOTHING;

  -- Users (idempotent)
  INSERT INTO public.users (uid, email, full_name, phone_number, role, preferred_language, city)
  VALUES
    ('admin-mahaticket-super', 'admin@mahaticket.in', 'MahaTicket Super Admin', '+91 98200 12345', 'super_admin', 'mr', 'Pune'),
    ('ops-mahaticket-user', 'operations@mahaticket.in', 'Ananya Deshpande', '+91 98200 67890', 'operations', 'mr', 'Mumbai'),
    ('scanner-balgandharva-01', 'gate1@balgandharva.org', 'Ramesh Kulkarni', '+91 98200 54321', 'scanner', 'mr', 'Pune'),
    ('cust-demo-101', 'sachin.patil@gmail.com', 'Sachin Patil', '+91 98233 44556', 'customer', 'mr', 'Pune')
  ON CONFLICT (uid) DO NOTHING;
 
  SELECT id INTO admin_id FROM public.users WHERE uid = 'admin-mahaticket-super';
  SELECT id INTO customer_id FROM public.users WHERE uid = 'cust-demo-101';

  -- Organizers (demo)
  INSERT INTO public.organizers (name, company_name, email, phone, city, verification_status, commission_type, commission_rate, bank_name, bank_account_number, bank_ifsc, pan_number, gstin)
  VALUES
    ('Demo Natya Collective', 'Natyasampada Demo Theatres', 'natya@demo.mahaticket.in', '+91 98210 99887', 'Mumbai', 'verified', 'percentage', 500, 'SBI Shivaji Park', '38192048591', 'SBIN0001422', 'AAACN4920K', '27AAACN4920K1ZX'),
    ('Demo Swara Trust', 'Swaramadhuri Cultural Trust (Seed)', 'swara@demo.mahaticket.in', '+91 98220 33445', 'Pune', 'verified', 'percentage', 600, 'Bank of Maharashtra', '60192847291', 'MAHB0000004', 'AABTS9921E', '27AABTS9921E1Z0'),
    ('Demo Comedy Lab', 'Hasya Rang Productions (Seed)', 'comedy@demo.mahaticket.in', '+91 98201 11223', 'Pune', 'verified', 'percentage', 650, 'HDFC FC Road', '50200049281723', 'HDFC0000149', 'AABCB1234F', '27AABCB1234F1Z5');

  SELECT id INTO org1 FROM public.organizers WHERE email = 'natya@demo.mahaticket.in';
  SELECT id INTO org2 FROM public.organizers WHERE email = 'swara@demo.mahaticket.in';
  SELECT id INTO org3 FROM public.organizers WHERE email = 'comedy@demo.mahaticket.in';

  -- Venues across Maharashtra
  INSERT INTO public.venues (name, name_mr, address, city, state, pincode, latitude, longitude, facilities, total_capacity, has_seat_layout)
  VALUES
    ('Bal Gandharva Ranga Mandir', 'बालगंधर्व रंगमंदिर', 'JM Road, Shivajinagar', 'Pune', 'Maharashtra', '411005', '18.5204', '73.8567', '["AC","Wheelchair Ramp","Cafeteria"]', 600, 1),
    ('Shivaji Mandir Natyagruha', 'शिवाजी मंदिर नाट्यगृह', 'Dadar West', 'Mumbai', 'Maharashtra', '400028', '19.0178', '72.8478', '["Heritage Hall","AC","Metro"]', 500, 1),
    ('Yashwantrao Chavan Natyagruha', 'यशवंतराव चव्हाण नाट्यगृह', 'Kothrud', 'Pune', 'Maharashtra', '411038', '18.5074', '73.8077', '["AC","Parking","Elevator"]', 550, 1),
    ('Dr. Vasantrao Deshpande Hall', 'डॉ. वसंतराव देशपांडे सभागृह', 'Civil Lines', 'Nagpur', 'Maharashtra', '440001', '21.1458', '79.0882', '["Acoustic Pro","AC"]', 700, 1),
    ('Inox Bund Garden (Demo Screen)', 'इनॉक्स बंड गार्डन (डेमो)', 'Bund Garden Road', 'Pune', 'Maharashtra', '411001', '18.5280', '73.8760', '["Dolby","Recliner"]', 180, 1),
    ('Nehru Centre Auditorium (Demo)', 'नेहरू सेंटर सभागृह (डेमो)', 'Worli', 'Mumbai', 'Maharashtra', '400018', '19.0000', '72.8160', '["AC","Parking"]', 800, 1);

  SELECT id INTO v_bal FROM public.venues WHERE name = 'Bal Gandharva Ranga Mandir';
  SELECT id INTO v_shivaji FROM public.venues WHERE name = 'Shivaji Mandir Natyagruha';
  SELECT id INTO v_yash FROM public.venues WHERE name = 'Yashwantrao Chavan Natyagruha';
  SELECT id INTO v_desh FROM public.venues WHERE name = 'Dr. Vasantrao Deshpande Hall';
  SELECT id INTO v_inamdar FROM public.venues WHERE name LIKE 'Inox Bund Garden%';
  SELECT id INTO v_nehru FROM public.venues WHERE name LIKE 'Nehru Centre%';

  -- Sections for Bal Gandharva
  INSERT INTO public.venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
  VALUES (v_bal, 'Balcony Premium', 'बाल्कनी प्रीमियम', 3, 8, 50000, 0)
  RETURNING id INTO sec_bal;

  INSERT INTO public.venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
  VALUES (v_bal, 'Stall / Orchestra Gold', 'स्टॉल / सुवर्ण बैठक', 4, 8, 35000, 1)
  RETURNING id INTO sec_stall;

  -- Cinema sections (Inox demo)
  INSERT INTO public.venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
  VALUES (v_inamdar, 'Gold', 'गोल्ड', 4, 10, 28000, 0)
  RETURNING id INTO sec_gold;

  INSERT INTO public.venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
  VALUES (v_inamdar, 'Silver', 'सिल्व्हर', 5, 12, 18000, 1)
  RETURNING id INTO sec_silver;

  -- Physical seats Balcony
  INSERT INTO public.seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible)
  SELECT v_bal, sec_bal, r.lab, c.n,
         'BAL-' || r.lab || LPAD(c.n::text, 2, '0'),
         'platinum',
         CASE WHEN r.lab = 'C' AND c.n <= 2 THEN 1 ELSE 0 END
  FROM (VALUES ('A'),('B'),('C')) AS r(lab)
  CROSS JOIN generate_series(1, 8) AS c(n);

  -- Stall seats
  INSERT INTO public.seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible)
  SELECT v_bal, sec_stall, r.lab, c.n,
         'STL-' || r.lab || LPAD(c.n::text, 2, '0'),
         'gold', 0
  FROM (VALUES ('D'),('E'),('F'),('G')) AS r(lab)
  CROSS JOIN generate_series(1, 8) AS c(n);

  -- Cinema Gold seats
  INSERT INTO public.seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible)
  SELECT v_inamdar, sec_gold, r.lab, c.n,
         'GLD-' || r.lab || LPAD(c.n::text, 2, '0'),
         'gold', 0
  FROM (VALUES ('A'),('B'),('C'),('D')) AS r(lab)
  CROSS JOIN generate_series(1, 10) AS c(n);

  -- Cinema Silver seats (block aisle middle seats as blocked examples)
  INSERT INTO public.seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
  SELECT v_inamdar, sec_silver, r.lab, c.n,
         'SLV-' || r.lab || LPAD(c.n::text, 2, '0'),
         'silver',
         CASE WHEN c.n = 1 THEN 1 ELSE 0 END,
         CASE WHEN c.n IN (6, 7) THEN 1 ELSE 0 END
  FROM (VALUES ('E'),('F'),('G'),('H'),('I')) AS r(lab)
  CROSS JOIN generate_series(1, 12) AS c(n);

  -- Events (clearly DEMO / seed content)
  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_type, convenience_fee_value, gst_percent)
  VALUES
    (org1, v_bal,
     '[SEED] Punha Sahi Re Sahi — Demo Natak',
     '[सीड] पुन्हा सही रे सही — डेमो नाटक',
     'seed-punha-sahi-re-sahi-pune',
     'plays', 'नाटक', 'Marathi', 'U', 165,
     'Demo Marathi comedy theatre listing for MahaTicket QA. Not a live commercial booking.',
     'महाटिकिट चाचणीसाठी डेमो मराठी नाटक. हे थेट व्यावसायिक शो नाही.',
     'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1600&q=80',
     'published', 1, 'flat', 3000, 18)
  RETURNING id INTO e1;

  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org2, v_bal,
     '[SEED] Sur Nava Dhyas Nava — Demo Concert',
     '[सीड] सूर नवा ध्यास नवा — डेमो मैफल',
     'seed-sur-nava-dhyas-nava-pune',
     'music', 'संगीत', 'Marathi', 'U', 180,
     'Demo classical / natyasangeet evening for seed testing.',
     'सीड चाचणीसाठी डेमो शास्त्रीय / नाट्यसंगीत मैफल.',
     'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
     'published', 1, 3500)
  RETURNING id INTO e2;

  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org3, v_yash,
     '[SEED] Aai Shapath — Demo Standup',
     '[सीड] आई शपथ — डेमो स्टँडअप',
     'seed-aai-shapath-pune',
     'comedy', 'स्टँडअप कॉमेडी', 'Marathi', 'U/A 16+', 120,
     'Demo Marathi standup night for catalog QA.',
     'कॅटलॉग चाचणीसाठी डेमो मराठी स्टँडअप.',
     'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1600&q=80',
     'published', 1, 2500)
  RETURNING id INTO e3;

  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org1, v_shivaji,
     '[SEED] Lavani Vaibhav — Demo Cultural Night',
     '[सीड] लावणी वैभव — डेमो सांस्कृतिक रात्र',
     'seed-lavani-vaibhav-mumbai',
     'cultural', 'सांस्कृतिक', 'Marathi', 'U', 150,
     'Demo folk / lavani festival listing. Seed content only.',
     'डेमो लोककला / लावणी महोत्सव. फक्त सीड मजकूर.',
     'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
     'published', 0, 3000)
  RETURNING id INTO e4;

  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org2, v_desh,
     '[SEED] Warli Art Workshop — Demo',
     '[सीड] वारली चित्रकला कार्यशाळा — डेमो',
     'seed-warli-workshop-nagpur',
     'workshops', 'कार्यशाळा', 'Marathi & Hindi', 'U', 240,
     'Demo workshop listing for Nagpur city filter tests.',
     'नागपूर शहर फिल्टर चाचणीसाठी डेमो कार्यशाळा.',
     'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80',
     'published', 0, 2000)
  RETURNING id INTO e5;

  -- Marathi movie demos (cinema seat map)
  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org1, v_inamdar,
     '[SEED] Sairat Echoes — Demo Marathi Film',
     '[सीड] सैराट इकोज — डेमो मराठी चित्रपट',
     'seed-sairat-echoes-pune',
     'movies', 'चित्रपट', 'Marathi', 'U/A', 150,
     'Seed/demo Marathi film screening for seat-map QA. Not affiliated with any studio.',
     'सीट मॅप चाचणीसाठी डेमो मराठी चित्रपट. कोणत्याही स्टुडिओशी संबंधित नाही.',
     'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
     'published', 1, 2500)
  RETURNING id INTO e6;

  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org1, v_inamdar,
     '[SEED] Jhimma Reunion — Demo Family Film',
     '[सीड] झिम्मा रियुनियन — डेमो कौटुंबिक चित्रपट',
     'seed-jhimma-reunion-pune',
     'movies', 'चित्रपट', 'Marathi', 'U', 135,
     'Seed family comedy film listing for weekend filters.',
     'वीकेंड फिल्टर चाचणीसाठी डेमो कौटुंबिक चित्रपट.',
     'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
     'published', 0, 2500)
  RETURNING id INTO e7;

  INSERT INTO public.events (organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, status, featured, convenience_fee_value)
  VALUES
    (org2, v_nehru,
     '[SEED] Nashik Grape Harvest Music Night',
     '[सीड] नाशिक द्राक्ष काढणी संगीत रात्र',
     'seed-nashik-grape-music',
     'music', 'संगीत', 'Marathi', 'U', 160,
     'Placeholder music night tagged for multi-city catalog (venue listed Mumbai demo hall).',
     'मल्टी-सिटी कॅटलॉगसाठी प्लेसहोल्डर संगीत कार्यक्रम.',
     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80',
     'published', 0, 3000)
  RETURNING id INTO e8;

  -- Sessions (relative to NOW)
  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e1, date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '17 hours',
              date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '19 hours 45 minutes', 'active')
  RETURNING id INTO s1;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e1, date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '20 hours 30 minutes',
              date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '23 hours 15 minutes', 'active')
  RETURNING id INTO s2;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e2, date_trunc('day', NOW()) + INTERVAL '4 days' + INTERVAL '18 hours',
              date_trunc('day', NOW()) + INTERVAL '4 days' + INTERVAL '21 hours', 'active')
  RETURNING id INTO s_music;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e3, date_trunc('day', NOW()) + INTERVAL '3 days' + INTERVAL '19 hours 30 minutes',
              date_trunc('day', NOW()) + INTERVAL '3 days' + INTERVAL '21 hours 30 minutes', 'active')
  RETURNING id INTO s_comedy;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e4, date_trunc('day', NOW()) + INTERVAL '5 days' + INTERVAL '18 hours 30 minutes',
              date_trunc('day', NOW()) + INTERVAL '5 days' + INTERVAL '21 hours', 'active')
  RETURNING id INTO s_cult;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e5, date_trunc('day', NOW()) + INTERVAL '6 days' + INTERVAL '10 hours',
              date_trunc('day', NOW()) + INTERVAL '6 days' + INTERVAL '14 hours', 'active')
  RETURNING id INTO s_ws;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e6, date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '19 hours',
              date_trunc('day', NOW()) + INTERVAL '0 days' + INTERVAL '21 hours 30 minutes', 'active')
  RETURNING id INTO s_movie1;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES (e6, date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '21 hours',
              date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '23 hours 30 minutes', 'active')
  RETURNING id INTO s_movie2;

  INSERT INTO public.event_sessions (event_id, session_start_time, session_end_time, status)
  VALUES
    (e7, date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '15 hours',
         date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '17 hours 15 minutes', 'active'),
    (e7, date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '19 hours',
         date_trunc('day', NOW()) + INTERVAL '2 days' + INTERVAL '21 hours 15 minutes', 'active'),
    (e8, date_trunc('day', NOW()) + INTERVAL '7 days' + INTERVAL '19 hours',
         date_trunc('day', NOW()) + INTERVAL '7 days' + INTERVAL '21 hours 40 minutes', 'active');

  -- Ticket types + inventory for seated natak session s1
  INSERT INTO public.ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
  VALUES (e1, s1, sec_bal, 'Balcony Premium', 'बाल्कनी प्रीमियम', 50000, 24, 21, 1)
  RETURNING id INTO tt_bal;

  INSERT INTO public.ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
  VALUES (e1, s1, sec_stall, 'Stall Gold', 'स्टॉल सुवर्ण', 35000, 32, 30, 1)
  RETURNING id INTO tt_stall;

  -- Music GA types
  INSERT INTO public.ticket_types (event_id, session_id, name, name_mr, price, total_quota, available_quota, is_seated)
  VALUES
    (e2, s_music, 'Platinum Baithak', 'प्लॅटिनम बैठक', 80000, 100, 95, 0),
    (e2, s_music, 'Rasik Gallery', 'रसिक गॅलरी', 40000, 250, 240, 0);

  -- Comedy / cultural / workshop GA
  INSERT INTO public.ticket_types (event_id, session_id, name, name_mr, price, total_quota, available_quota, is_seated)
  VALUES
    (e3, s_comedy, 'Standard', 'सामान्य', 45000, 400, 380, 0),
    (e4, s_cult, 'Front Rows', 'पुढील रांगा', 60000, 200, 180, 0),
    (e5, s_ws, 'Workshop Pass', 'कार्यशाळा पास', 120000, 40, 35, 0);

  -- Movie ticket types session 1
  INSERT INTO public.ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
  SELECT e6, s_movie1, sec_gold, 'Gold', 'गोल्ड', 28000, 40, 38, 1;

  INSERT INTO public.ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
  SELECT e6, s_movie1, sec_silver, 'Silver', 'सिल्व्हर', 18000, 60, 55, 1;

  -- Seat inventory for natak s1
  INSERT INTO public.seat_inventory (session_id, seat_id, ticket_type_id, status, held_by_user_id, hold_expires_at)
  SELECT s1, s.id,
         CASE WHEN s.section_id = sec_bal THEN tt_bal ELSE tt_stall END,
         CASE
           WHEN s.seat_code IN ('BAL-A01', 'BAL-A02') THEN 'booked'
           WHEN s.seat_code = 'BAL-A05' THEN 'held'
           WHEN s.is_blocked = 1 THEN 'blocked'
           ELSE 'available'
         END,
         CASE WHEN s.seat_code = 'BAL-A05' THEN 'sample-guest-hold' ELSE NULL END,
         CASE WHEN s.seat_code = 'BAL-A05' THEN NOW() + INTERVAL '8 minutes' ELSE NULL END
  FROM public.seats s
  WHERE s.venue_id = v_bal;

  -- Seat inventory for movie s_movie1
  INSERT INTO public.seat_inventory (session_id, seat_id, ticket_type_id, status)
  SELECT s_movie1, s.id, tt.id,
         CASE WHEN s.is_blocked = 1 THEN 'blocked' ELSE 'available' END
  FROM public.seats s
  JOIN public.ticket_types tt
    ON tt.session_id = s_movie1
   AND tt.section_id = s.section_id
  WHERE s.venue_id = v_inamdar;

  -- (No demo orders: production and local app use only real customer bookings)

  INSERT INTO public.settlements (
    settlement_reference, organizer_id, event_id, total_gross_ticket_sales, total_platform_fees_collected,
    total_payment_gateway_cost, total_tax_collected, platform_commission_earned, total_refund_deductions,
    net_payable_to_organizer, status
  ) VALUES (
    'SETTLE-SEED-001', org1, e1, ticket_face, plat_fee, 2140, tax_amt, 5000, 0, ticket_face - 5000, 'pending'
  );

  INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, per_user_limit, active)
  VALUES
    ('MAHA50', 'flat', 5000, 40000, 5000, 1000, 3, 1),
    ('NATAK10', 'percentage', 1000, 30000, 10000, 500, 2, 1),
    ('CINEMA20', 'flat', 2000, 20000, 2000, 200, 1, 1);

  INSERT INTO public.announcements (title, message, city, category, active, starts_at, ends_at, cta_label)
  VALUES
    ('Welcome to MahaTicket', 'Demo catalog is live for Maharashtra entertainment booking QA. Replace seed events before production.', NULL, NULL, 1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days', 'Browse events'),
    ('Pune Theatre Week (Seed)', 'Explore seed Marathi natak listings in Pune this week.', 'Pune', 'plays', 1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '14 days', 'View plays');

  INSERT INTO public.partner_leads (organizer_name, company_name, mobile, email, event_name, category, city, status, message)
  VALUES
    ('Makarand Demo', 'Sahyadri Natya Manch (Seed)', '+91 98222 77889', 'lead1@demo.mahaticket.in',
     'Zopi Gelela Jagi Zhala (Seed)', 'plays', 'Pune', 'new', 'Seed partner lead for admin QA.'),
    ('Kunal Demo', 'Konkan Cultural Wave (Seed)', '+91 98200 88771', 'lead2@demo.mahaticket.in',
     'Sindhudurg Dashavatar (Seed)', 'cultural', 'Mumbai', 'contacted', 'Seed contacted lead.');

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
  VALUES (
    'admin-mahaticket-super', 'super_admin', 'SYSTEM_INITIALIZED', 'platform', 'mahaticket-core',
    '{"message":"MahaTicket seed catalog applied — demo Maharashtra events"}'
  );

  RAISE NOTICE 'MahaTicket seed complete.';
END $$;
