-- ============================================================================
-- MAHATICKET (महाटिकिट) - 02_allocate_seats_all_events.sql
-- Purpose: Allocate fresh 500-seat inventory for EVERY session of the venue
-- 
-- Ensures:
--   - 3 Ticket Types created per session (Premium: 80, Standard: 300, Balcony: 120)
--   - 500 Seat Inventory rows generated with status = 'available'
--   - Total tickets available = 500 per session
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_venue_id INTEGER := 1; -- Target venue (Bal Gandharva Rang Mandir)
    v_session RECORD;
    v_sec_premium_id INTEGER;
    v_sec_standard_id INTEGER;
    v_sec_balcony_id INTEGER;
    v_tt_premium_id INTEGER;
    v_tt_standard_id INTEGER;
    v_tt_balcony_id INTEGER;
    v_total_allocated INTEGER := 0;
    v_session_count INTEGER := 0;
BEGIN
    -- 1. Fetch section IDs for this venue
    SELECT id INTO v_sec_premium_id  FROM public.venue_sections WHERE venue_id = v_venue_id AND name = 'Premium';
    SELECT id INTO v_sec_standard_id FROM public.venue_sections WHERE venue_id = v_venue_id AND name = 'Standard';
    SELECT id INTO v_sec_balcony_id  FROM public.venue_sections WHERE venue_id = v_venue_id AND name = 'Balcony';

    IF v_sec_premium_id IS NULL OR v_sec_standard_id IS NULL OR v_sec_balcony_id IS NULL THEN
        RAISE EXCEPTION 'Venue % sections are missing. Please execute 01_theater_design_500_seats.sql first.', v_venue_id;
    END IF;

    -- 2. Loop through every active session for events at this venue
    FOR v_session IN
        SELECT es.id AS session_id, es.event_id, e.title
        FROM public.event_sessions es
        JOIN public.events e ON es.event_id = e.id
        WHERE e.venue_id = v_venue_id
        ORDER BY es.id
    LOOP
        v_session_count := v_session_count + 1;

        -- Clean existing seat_inventory for this session
        DELETE FROM public.seat_inventory WHERE session_id = v_session.session_id;

        -- Provision or update the 3 Ticket Types for this session
        -- 1. Premium (80 seats @ ₹500)
        SELECT id INTO v_tt_premium_id FROM public.ticket_types WHERE session_id = v_session.session_id AND (name = 'Premium' OR name = 'प्रीमियम');
        IF v_tt_premium_id IS NULL THEN
            INSERT INTO public.ticket_types
                (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
            VALUES
                (v_session.event_id, v_session.session_id, v_sec_premium_id, 'Premium', 'प्रीमियम', 50000, 80, 80, 1)
            RETURNING id INTO v_tt_premium_id;
        ELSE
            UPDATE public.ticket_types
            SET section_id = v_sec_premium_id, price = 50000, total_quota = 80, available_quota = 80, is_seated = 1
            WHERE id = v_tt_premium_id;
        END IF;

        -- 2. Standard (300 seats @ ₹300)
        SELECT id INTO v_tt_standard_id FROM public.ticket_types WHERE session_id = v_session.session_id AND (name = 'Standard' OR name = 'स्टँडर्ड');
        IF v_tt_standard_id IS NULL THEN
            INSERT INTO public.ticket_types
                (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
            VALUES
                (v_session.event_id, v_session.session_id, v_sec_standard_id, 'Standard', 'स्टँडर्ड', 30000, 300, 300, 1)
            RETURNING id INTO v_tt_standard_id;
        ELSE
            UPDATE public.ticket_types
            SET section_id = v_sec_standard_id, price = 30000, total_quota = 300, available_quota = 300, is_seated = 1
            WHERE id = v_tt_standard_id;
        END IF;

        -- 3. Balcony (120 seats @ ₹400)
        SELECT id INTO v_tt_balcony_id FROM public.ticket_types WHERE session_id = v_session.session_id AND (name = 'Balcony' OR name = 'बाल्कनी');
        IF v_tt_balcony_id IS NULL THEN
            INSERT INTO public.ticket_types
                (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
            VALUES
                (v_session.event_id, v_session.session_id, v_sec_balcony_id, 'Balcony', 'बाल्कनी', 40000, 120, 120, 1)
            RETURNING id INTO v_tt_balcony_id;
        ELSE
            UPDATE public.ticket_types
            SET section_id = v_sec_balcony_id, price = 40000, total_quota = 120, available_quota = 120, is_seated = 1
            WHERE id = v_tt_balcony_id;
        END IF;

        -- Allocate 500 individual physical seats into seat_inventory
        -- Premium Seats
        INSERT INTO public.seat_inventory
            (session_id, seat_id, ticket_type_id, status)
        SELECT
            v_session.session_id,
            s.id,
            v_tt_premium_id,
            'available'
        FROM public.seats s
        WHERE s.venue_id = v_venue_id AND s.section_id = v_sec_premium_id;

        -- Standard Seats
        INSERT INTO public.seat_inventory
            (session_id, seat_id, ticket_type_id, status)
        SELECT
            v_session.session_id,
            s.id,
            v_tt_standard_id,
            'available'
        FROM public.seats s
        WHERE s.venue_id = v_venue_id AND s.section_id = v_sec_standard_id;

        -- Balcony Seats
        INSERT INTO public.seat_inventory
            (session_id, seat_id, ticket_type_id, status)
        SELECT
            v_session.session_id,
            s.id,
            v_tt_balcony_id,
            'available'
        FROM public.seats s
        WHERE s.venue_id = v_venue_id AND s.section_id = v_sec_balcony_id;

        v_total_allocated := v_total_allocated + 500;
        RAISE NOTICE 'Session ID % (%): Allocated 500 fresh available seats.', v_session.session_id, v_session.title;
    END LOOP;

    RAISE NOTICE 'Complete! Allocated % total seats across % sessions.', v_total_allocated, v_session_count;
END $$;

-- Verification of allocations
SELECT
    es.id AS session_id,
    e.title AS event_title,
    to_char(es.session_start_time, 'YYYY-MM-DD HH24:MI') AS showtime,
    COUNT(si.id) AS total_inventory_seats,
    COUNT(CASE WHEN si.status = 'available' THEN 1 END) AS available_seats
FROM public.event_sessions es
JOIN public.events e ON es.event_id = e.id
LEFT JOIN public.seat_inventory si ON si.session_id = es.id
WHERE e.venue_id = 1
GROUP BY es.id, e.title, es.session_start_time
ORDER BY es.session_start_time;

COMMIT;
