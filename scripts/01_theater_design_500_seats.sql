-- ============================================================================
-- MAHATICKET (महाटिकिट) - 01_theater_design_500_seats.sql
-- Architecture: 500 Physical Seats Auditorium Layout (Admin & App Parity)
-- 
-- Tiers Breakdown:
--   1. Premium (प्रीमियम)  : Rows A-D, 20 seats/row  =  80 seats (₹500 / 50000 paise)
--   2. Standard (स्टँडर्ड) : Rows E-N, 30 seats/row  = 300 seats (₹300 / 30000 paise)
--   3. Balcony (बाल्कनी)   : Rows O-R, 30 seats/row  = 120 seats (₹400 / 40000 paise)
--   TOTAL                  : 80 + 300 + 120          = 500 SEATS
-- ============================================================================

BEGIN;

DO $$
DECLARE
    -- Change to whichever venue_id you are provisioning (Default: 1 = Bal Gandharva Rang Mandir)
    v_venue_id INTEGER := 1;
    v_count INTEGER;
BEGIN
    -- Verify venue exists
    PERFORM id FROM public.venues WHERE id = v_venue_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venue ID % does not exist in public.venues.', v_venue_id;
    END IF;

    -- Clean existing layout safely (removes old seats & sections for this venue)
    -- First clear references from ticket_types and seat_inventory
    UPDATE public.ticket_types SET section_id = NULL WHERE section_id IN (SELECT id FROM public.venue_sections WHERE venue_id = v_venue_id);
    DELETE FROM public.seat_inventory WHERE seat_id IN (SELECT id FROM public.seats WHERE venue_id = v_venue_id);
    DELETE FROM public.seats WHERE venue_id = v_venue_id;
    DELETE FROM public.venue_sections WHERE venue_id = v_venue_id;

    -- 1. Create the 3 canonical sections
    INSERT INTO public.venue_sections
        (venue_id, name, name_mr, rows_count, cols_count, base_price, accessible)
    VALUES
        (v_venue_id, 'Premium',  'प्रीमियम', 4, 20, 50000, 1),
        (v_venue_id, 'Standard', 'स्टँडर्ड', 10, 30, 30000, 1),
        (v_venue_id, 'Balcony',  'बाल्कनी',  4, 30, 40000, 0);

    -- 2. Generate individual physical seats
    -- Premium Section: A-D (20 seats each)
    INSERT INTO public.seats
        (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
    SELECT
        v_venue_id,
        vs.id,
        r.row_label,
        n.seat_number,
        r.row_label || LPAD(n.seat_number::TEXT, 2, '0'),
        'premium',
        CASE WHEN n.seat_number IN (1, 2) THEN 1 ELSE 0 END,
        0
    FROM public.venue_sections vs
    CROSS JOIN (
        SELECT UNNEST(ARRAY['A','B','C','D']) AS row_label
    ) r
    CROSS JOIN GENERATE_SERIES(1, 20) AS n(seat_number)
    WHERE vs.venue_id = v_venue_id AND vs.name = 'Premium';

    -- Standard Section: E-N (30 seats each)
    INSERT INTO public.seats
        (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
    SELECT
        v_venue_id,
        vs.id,
        r.row_label,
        n.seat_number,
        r.row_label || LPAD(n.seat_number::TEXT, 2, '0'),
        'standard',
        CASE WHEN n.seat_number IN (1, 2) THEN 1 ELSE 0 END,
        0
    FROM public.venue_sections vs
    CROSS JOIN (
        SELECT UNNEST(ARRAY['E','F','G','H','I','J','K','L','M','N']) AS row_label
    ) r
    CROSS JOIN GENERATE_SERIES(1, 30) AS n(seat_number)
    WHERE vs.venue_id = v_venue_id AND vs.name = 'Standard';

    -- Balcony Section: O-R (30 seats each)
    INSERT INTO public.seats
        (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
    SELECT
        v_venue_id,
        vs.id,
        r.row_label,
        n.seat_number,
        r.row_label || LPAD(n.seat_number::TEXT, 2, '0'),
        'balcony',
        0,
        0
    FROM public.venue_sections vs
    CROSS JOIN (
        SELECT UNNEST(ARRAY['O','P','Q','R']) AS row_label
    ) r
    CROSS JOIN GENERATE_SERIES(1, 30) AS n(seat_number)
    WHERE vs.venue_id = v_venue_id AND vs.name = 'Balcony';

    -- 3. Verify exactly 500 seats created
    SELECT COUNT(*) INTO v_count FROM public.seats WHERE venue_id = v_venue_id;
    IF v_count <> 500 THEN
        RAISE EXCEPTION 'Seat count validation failed: Expected 500 seats, generated %.', v_count;
    END IF;

    -- 4. Update venue layout configuration & capacity
    UPDATE public.venues
    SET
        has_seat_layout = 1,
        total_capacity = 500,
        layout_config = json_build_object(
            'screenArc', true,
            'stageLabel', 'STAGE / रंगमंच',
            'screenColor', '#EA580C',
            'sections', json_build_array(
                json_build_object(
                    'name', 'Premium',
                    'nameMr', 'प्रीमियम',
                    'price', 50000,
                    'rows', json_build_array(
                        json_build_object('rowLabel', 'A', 'seats', 20, 'aisleAfter', json_build_array(10)),
                        json_build_object('rowLabel', 'B', 'seats', 20, 'aisleAfter', json_build_array(10)),
                        json_build_object('rowLabel', 'C', 'seats', 20, 'aisleAfter', json_build_array(10)),
                        json_build_object('rowLabel', 'D', 'seats', 20, 'aisleAfter', json_build_array(10))
                    )
                ),
                json_build_object(
                    'name', 'Standard',
                    'nameMr', 'स्टँडर्ड',
                    'price', 30000,
                    'rows', json_build_array(
                        json_build_object('rowLabel', 'E', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'F', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'G', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'H', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'I', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'J', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'K', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'L', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'M', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'N', 'seats', 30, 'aisleAfter', json_build_array(8, 22))
                    )
                ),
                json_build_object(
                    'name', 'Balcony',
                    'nameMr', 'बाल्कनी',
                    'price', 40000,
                    'rows', json_build_array(
                        json_build_object('rowLabel', 'O', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'P', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'Q', 'seats', 30, 'aisleAfter', json_build_array(8, 22)),
                        json_build_object('rowLabel', 'R', 'seats', 30, 'aisleAfter', json_build_array(8, 22))
                    )
                )
            )
        )::text
    WHERE id = v_venue_id;

    RAISE NOTICE 'Successfully provisioned 500-seat auditorium layout for Venue ID %', v_venue_id;
END $$;

-- Summary query for verification
SELECT
    vs.name AS section,
    vs.name_mr AS section_mr,
    vs.rows_count,
    vs.cols_count,
    vs.base_price / 100 AS price_inr,
    COUNT(s.id) AS actual_seats
FROM public.venue_sections vs
LEFT JOIN public.seats s ON s.section_id = vs.id
WHERE vs.venue_id = 1
GROUP BY vs.id, vs.name, vs.name_mr, vs.rows_count, vs.cols_count, vs.base_price
ORDER BY vs.base_price DESC;

SELECT COUNT(*) AS total_seats_in_venue FROM public.seats WHERE venue_id = 1;

COMMIT;
