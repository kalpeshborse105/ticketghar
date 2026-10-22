-- ==============================================================================
-- MAHATICKET (महाटिकिट) - COMPLETE EVENT INSERTION SQL SCRIPT
-- ==============================================================================
-- This SQL script inserts 1 complete event with venue, sections, physical seats,
-- sessions (showtimes), ticket pricing tiers, and seat inventory.
-- Compatible with Supabase SQL Editor and standard PostgreSQL.
-- ==============================================================================

DO $$
DECLARE
    v_organizer_id INT;
    v_venue_id INT;
    v_section_stall_id INT;
    v_section_balcony_id INT;
    v_event_id INT;
    v_session_1_id INT;
    v_session_2_id INT;
    v_tt_stall_sess1 INT;
    v_tt_balcony_sess1 INT;
    v_tt_stall_sess2 INT;
    v_tt_balcony_sess2 INT;
    v_row_label TEXT;
    v_seat_num INT;
    v_seat_id INT;
BEGIN

    -- --------------------------------------------------------------------------
    -- 1. ORGANIZER (आयोजक)
    -- --------------------------------------------------------------------------
    SELECT id INTO v_organizer_id FROM organizers WHERE email = 'natyavedh@mahaticket.com' LIMIT 1;
    IF v_organizer_id IS NULL THEN
        INSERT INTO organizers (name, company_name, email, phone, city, verification_status, status, commission_type, commission_rate)
        VALUES ('नाट्यवेध प्रॉडक्शन्स', 'Natyavedh Productions Pvt Ltd', 'natyavedh@mahaticket.com', '9822001122', 'Pune', 'verified', 'active', 'percentage', 600)
        RETURNING id INTO v_organizer_id;
    END IF;

    -- --------------------------------------------------------------------------
    -- 2. VENUE (नाट्यगृह / प्रेक्षागृह)
    -- --------------------------------------------------------------------------
    -- We use existing Bal Gandharva Rang Mandir (ID 1) or insert if missing
    SELECT id INTO v_venue_id FROM venues WHERE id = 1 LIMIT 1;
    IF v_venue_id IS NULL THEN
        INSERT INTO venues (name, name_mr, address, city, state, pincode, total_capacity, has_seat_layout, verification_status)
        VALUES ('Bal Gandharva Rang Mandir', 'बालगंधर्व रंगमंदिर', 'Jangali Maharaj Road, Shivajinagar, Pune', 'Pune', 'Maharashtra', '411005', 600, 1, 'verified')
        RETURNING id INTO v_venue_id;
    END IF;

    -- --------------------------------------------------------------------------
    -- 3. VENUE SECTIONS (विभाग: स्टॉल व बाल्कनी)
    -- --------------------------------------------------------------------------
    SELECT id INTO v_section_stall_id FROM venue_sections WHERE venue_id = v_venue_id AND name = 'Stall' LIMIT 1;
    IF v_section_stall_id IS NULL THEN
        INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
        VALUES (v_venue_id, 'Stall', 'स्टॉल', 5, 10, 40000, 1)
        RETURNING id INTO v_section_stall_id;
    END IF;

    SELECT id INTO v_section_balcony_id FROM venue_sections WHERE venue_id = v_venue_id AND name = 'Balcony' LIMIT 1;
    IF v_section_balcony_id IS NULL THEN
        INSERT INTO venue_sections (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
        VALUES (v_venue_id, 'Balcony', 'बाल्कनी', 3, 10, 60000, 0)
        RETURNING id INTO v_section_balcony_id;
    END IF;

    -- --------------------------------------------------------------------------
    -- 4. PHYSICAL SEATS (आसन मांडणी)
    -- --------------------------------------------------------------------------
    -- Generate Stall Seats: Rows A-C, Seats 1-10 (30 seats)
    FOREACH v_row_label IN ARRAY ARRAY['A', 'B', 'C'] LOOP
        FOR v_seat_num IN 1..10 LOOP
            IF NOT EXISTS (SELECT 1 FROM seats WHERE venue_id = v_venue_id AND section_id = v_section_stall_id AND row_label = v_row_label AND seat_number = v_seat_num) THEN
                INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
                VALUES (v_venue_id, v_section_stall_id, v_row_label, v_seat_num, 'STALL-' || v_row_label || '-' || LPAD(v_seat_num::TEXT, 2, '0'), 'standard', 0, 0);
            END IF;
        END LOOP;
    END LOOP;

    -- Generate Balcony Seats: Rows BA-BB, Seats 1-10 (20 seats)
    FOREACH v_row_label IN ARRAY ARRAY['BA', 'BB'] LOOP
        FOR v_seat_num IN 1..10 LOOP
            IF NOT EXISTS (SELECT 1 FROM seats WHERE venue_id = v_venue_id AND section_id = v_section_balcony_id AND row_label = v_row_label AND seat_number = v_seat_num) THEN
                INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
                VALUES (v_venue_id, v_section_balcony_id, v_row_label, v_seat_num, 'BAL-' || v_row_label || '-' || LPAD(v_seat_num::TEXT, 2, '0'), 'gold', 0, 0);
            END IF;
        END LOOP;
    END LOOP;

    -- --------------------------------------------------------------------------
    -- 5. EVENT (कार्यक्रम / नाटक तपशील)
    -- --------------------------------------------------------------------------
    -- Notice: Change title, title_mr, description, poster_url as needed!
    INSERT INTO events (
        organizer_id,
        venue_id,
        title,
        title_mr,
        slug,
        category,
        category_mr,
        language,
        age_guidance,
        duration_minutes,
        description,
        description_mr,
        poster_url,
        banner_url,
        status,
        featured,
        tag,
        cast_crew,
        convenience_fee_type,
        convenience_fee_value,
        gst_percent,
        cancellation_policy
    ) VALUES (
        v_organizer_id,
        v_venue_id,
        'Shree Tashi Sau',
        'श्री तशी सौ (कौटुंबिक महानाटक)',
        'shree-tashi-sau-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
        'plays',
        'नाटक',
        'Marathi',
        'U',
        150,
        'A heartwarming family comedy drama starring veteran Marathi stage actors. Experience laughter, emotions, and cultural charm.',
        'एक अप्रतिम कौटुंबिक आणि खुसखुशीत नाटक. दिग्दर्शन आणि अभिनयाची सुंदर जुगलबंदी, जी संपूर्ण कुटुंबाला हसवून आणि भावुक करून सोडेल.',
        'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        'published',
        1,
        'सुपरहिट १००+ प्रयोग',
        '[{"name":"सुमित राघवन","role":"मुख्य भूमिका"},{"name":"सुकन्या मोने","role":"मुख्य भूमिका"},{"name":"विजय केंकरे","role":"दिग्दर्शक"}]',
        'flat',
        3000, -- ₹30 platform convenience fee
        18,
        'cancellable_up_to_4hr'
    )
    RETURNING id INTO v_event_id;

    -- --------------------------------------------------------------------------
    -- 6. EVENT SESSIONS / SHOWTIMES (प्रयोग / वेळा)
    -- --------------------------------------------------------------------------
    -- Session 1: Tomorrow 04:00 PM (16:00 IST)
    INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
    VALUES (
        v_event_id,
        (CURRENT_DATE + INTERVAL '1 day' + TIME '16:00:00' - INTERVAL '5 hours 30 minutes'),
        (CURRENT_DATE + INTERVAL '1 day' + TIME '18:30:00' - INTERVAL '5 hours 30 minutes'),
        'active'
    )
    RETURNING id INTO v_session_1_id;

    -- Session 2: Day After Tomorrow 08:00 PM (20:00 IST)
    INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
    VALUES (
        v_event_id,
        (CURRENT_DATE + INTERVAL '2 days' + TIME '20:00:00' - INTERVAL '5 hours 30 minutes'),
        (CURRENT_DATE + INTERVAL '2 days' + TIME '22:30:00' - INTERVAL '5 hours 30 minutes'),
        'active'
    )
    RETURNING id INTO v_session_2_id;

    -- --------------------------------------------------------------------------
    -- 7. TICKET PRICING TIERS (तिकीट दर)
    -- --------------------------------------------------------------------------
    -- For Session 1:
    INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
    VALUES (v_event_id, v_session_1_id, v_section_stall_id, 'Stall', 'स्टॉल', 40000, 30, 30, 1)
    RETURNING id INTO v_tt_stall_sess1;

    INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
    VALUES (v_event_id, v_session_1_id, v_section_balcony_id, 'Balcony', 'बाल्कनी', 60000, 20, 20, 1)
    RETURNING id INTO v_tt_balcony_sess1;

    -- For Session 2:
    INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
    VALUES (v_event_id, v_session_2_id, v_section_stall_id, 'Stall', 'स्टॉल', 40000, 30, 30, 1)
    RETURNING id INTO v_tt_stall_sess2;

    INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
    VALUES (v_event_id, v_session_2_id, v_section_balcony_id, 'Balcony', 'बाल्कनी', 60000, 20, 20, 1)
    RETURNING id INTO v_tt_balcony_sess2;

    -- --------------------------------------------------------------------------
    -- 8. SEAT INVENTORY (प्रत्येक प्रयोगासाठी आसनांची उपलब्धता)
    -- --------------------------------------------------------------------------
    -- Session 1 Stall inventory:
    INSERT INTO seat_inventory (session_id, seat_id, ticket_type_id, status)
    SELECT v_session_1_id, s.id, v_tt_stall_sess1, 'available'
    FROM seats s
    WHERE s.venue_id = v_venue_id AND s.section_id = v_section_stall_id;

    -- Session 1 Balcony inventory:
    INSERT INTO seat_inventory (session_id, seat_id, ticket_type_id, status)
    SELECT v_session_1_id, s.id, v_tt_balcony_sess1, 'available'
    FROM seats s
    WHERE s.venue_id = v_venue_id AND s.section_id = v_section_balcony_id;

    -- Session 2 Stall inventory:
    INSERT INTO seat_inventory (session_id, seat_id, ticket_type_id, status)
    SELECT v_session_2_id, s.id, v_tt_stall_sess2, 'available'
    FROM seats s
    WHERE s.venue_id = v_venue_id AND s.section_id = v_section_stall_id;

    -- Session 2 Balcony inventory:
    INSERT INTO seat_inventory (session_id, seat_id, ticket_type_id, status)
    SELECT v_session_2_id, s.id, v_tt_balcony_sess2, 'available'
    FROM seats s
    WHERE s.venue_id = v_venue_id AND s.section_id = v_section_balcony_id;

    RAISE NOTICE '✓ कार्यक्रम यशस्वीरित्या जोडला! Event ID: %, Title: Shree Tashi Sau', v_event_id;
END $$;
