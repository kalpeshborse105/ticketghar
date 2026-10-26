-- ============================================================================
-- MahaTicket: verified NCPA venue catalogue (POST-CLEAR USE)
-- ============================================================================
-- Checked against src/db/schema.ts + live columns:
--   venues: name, name_mr, address, city, state, total_capacity (NOT NULL),
--           verification_status, has_seat_layout (int 0/1), is_template (int 0/1),
--           ownership_type, facilities (text), city_id, district_id
--
-- Adds venue catalogue rows ONLY.
-- Does NOT create events, sessions, ticket types, seats, or inventory.
--
-- DO NOT RUN until test catalogue clear is done and reviewed.
-- Default ending is ROLLBACK. Uncomment COMMIT only after SELECT looks correct.
-- ============================================================================

BEGIN;

-- Abort if location masters missing (must survive catalogue clear)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE name = 'Mumbai') THEN
    RAISE EXCEPTION 'cities.name=Mumbai missing — restore location master before import';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.districts WHERE name = 'Mumbai City') THEN
    RAISE EXCEPTION 'districts.name=Mumbai City missing — restore location master before import';
  END IF;
END $$;

WITH candidates (
  name, name_mr, address, city, state, total_capacity,
  verification_status, has_seat_layout, is_template, ownership_type, facilities
) AS (
  VALUES
    ('Jamshed Bhabha Theatre (NCPA)', 'जमशेद भाभा थिएटर',
     'National Centre for the Performing Arts, Nariman Point, Mumbai, Maharashtra',
     'Mumbai', 'Maharashtra', 1109, 'verified', 0, 0, 'public_theatre',
     '[{"type":"official_source","url":"https://www.ncpamumbai.com/venue/jamshed-bhabha-theatre/","capacity_note":"Official published capacity: 1109; event configuration can change sellable seats."}]'),
    ('Tata Theatre (NCPA)', 'टाटा थिएटर',
     'National Centre for the Performing Arts, Nariman Point, Mumbai, Maharashtra',
     'Mumbai', 'Maharashtra', 960, 'verified', 0, 0, 'public_theatre',
     '[{"type":"official_source","url":"https://www.ncpamumbai.com/venue/tata-theatre/","capacity_note":"Official venue page publishes 960 seats; configuration can change sellable seats."}]'),
    ('NCPA Experimental Theatre', 'एक्सपेरिमेंटल थिएटर',
     'National Centre for the Performing Arts, Nariman Point, Mumbai, Maharashtra',
     'Mumbai', 'Maharashtra', 267, 'verified', 0, 0, 'public_theatre',
     '[{"type":"official_source","url":"https://www.ncpamumbai.com/venue/experimental-theatre/","capacity_note":"Official maximum 267; variable depending on stage size, not a fixed seat inventory."}]'),
    ('Godrej Dance Theatre (NCPA)', 'गोदरेज डान्स थिएटर',
     'National Centre for the Performing Arts, Nariman Point, Mumbai, Maharashtra',
     'Mumbai', 'Maharashtra', 177, 'verified', 0, 0, 'public_theatre',
     '[{"type":"official_source","url":"https://www.ncpamumbai.com/venue-landing/","capacity_note":"NCPA venue landing page publishes 177 seats."}]')
),
resolved AS (
  SELECT
    c.*,
    city_row.id AS city_id,
    dist.id AS district_id
  FROM candidates c
  INNER JOIN public.cities city_row
    ON lower(trim(city_row.name)) = lower(trim(c.city))
  INNER JOIN public.districts dist
    ON dist.name = 'Mumbai City'
  -- Guarding against ambiguous city names: Mumbai must resolve to exactly one cities row
  WHERE (
    SELECT COUNT(*) FROM public.cities x WHERE lower(trim(x.name)) = 'mumbai'
  ) = 1
),
inserted AS (
  INSERT INTO public.venues (
    name, name_mr, address, city, state, total_capacity,
    verification_status, has_seat_layout, is_template, ownership_type, facilities,
    city_id, district_id
  )
  SELECT
    r.name, r.name_mr, r.address, r.city, r.state, r.total_capacity,
    r.verification_status, r.has_seat_layout, r.is_template, r.ownership_type, r.facilities,
    r.city_id, r.district_id
  FROM resolved r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE lower(trim(v.name)) = lower(trim(r.name))
      AND lower(trim(v.city)) = lower(trim(r.city))
  )
  RETURNING id, name, city, city_id, district_id, total_capacity, verification_status
)
SELECT 'inserted' AS result, id, name, city, city_id, district_id, total_capacity, verification_status
FROM inserted;

-- Review output
SELECT id, name, name_mr, address, city, city_id, district_id,
       total_capacity, verification_status, has_seat_layout, is_template
FROM public.venues
WHERE lower(trim(city)) = 'mumbai'
  AND name ILIKE '%NCPA%'
ORDER BY name;

-- Keep seat layouts empty until TheatreSeatDesigner / verified map.
-- Do NOT generate physical seats from generic templates here.
-- Do NOT create events without organizer authorization.

-- Default safe ending (change only after review):
ROLLBACK;
-- COMMIT;
