/*
MahaTicket — BookMyShow-cross-checked cinema venue candidates
District batch: Ahilyanagar, Akola, Amravati, Beed, Bhandara
Purpose: venue catalogue candidates ONLY.

SAFETY:
- This file does NOT create events, sessions, ticket types, seat rows, seat inventory,
  or make any venue bookable.
- BookMyShow listing is evidence that the venue is listed on a ticketing platform;
  it is NOT proof of MahaTicket sales authorization or a verified physical seat map.
- Capacity is deliberately recorded as unknown (NULL). Do not replace NULL with a guess.
- Run the preview query first and compare against existing rows before inserting.
- This SQL assumes public.venues columns: name, address, city, state, total_capacity,
  verification_status, has_seat_layout, is_template, ownership_type, facilities.
  Confirm those columns/types and required fields in src/db/schema.ts before INSERT.
*/

-- 1) Preview source candidates. No database changes.
WITH candidates (
  district, name, address, city, state, total_capacity,
  verification_status, has_seat_layout, is_template, ownership_type, facilities
) AS (
  VALUES
  ('Ahilyanagar','CONNPLEX Luxuriance Cinemas','3rd Floor, Kohinoor Mall, Premdan Chowk, Opposite Big Bazar','Ahilyanagar','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/ahmed/venue-list","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Ahilyanagar','MY Cinema','Pipeline Road, Savedi','Ahilyanagar','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/ahmed/venue-list","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Ahilyanagar','Asha Square Multiplex','Asha Chowk, near Kotwali Police Headquarter','Ahilyanagar','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/ahmed/venue-list","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Ahilyanagar','CINELIFE Miniplex (Dolby Atmos)','3rd Floor, Biz Bay One, Ch. Sambhaji Nagar Road, M.I.R.C','Ahilyanagar','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/ahmed/venue-list","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Ahilyanagar','Eylex Cinema','Kalyanam Lawns, A/P Wanjarwadi, Sonai, Tal Nevasa','Sonai','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/ahmed/venue-list","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Ahilyanagar','Dnyaneshwar Multiplex','1, Indira Peth, near ST Bus Stand','Rahuri','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/ahmed/venue-list","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),

  ('Akola','Miraj Cinemas: Radha Krishna','Murtizapur Road, Kirti Nagar, near TVS Showroom','Akola','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/akola/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Akola','1 Cinemas','2nd Floor, Bill Mart Commercial Complex, Washim Bypass Chowk','Akola','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/akola/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Akola','Manek Cinema','Manek Talkies, Tilak Road, near Akot Bus Stand','Akola','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/akola/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Akola','Vasant Talkies','Bhandaraj BK, near Tahsil Office','Akola','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/akola/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Akola','New Regal Cinema','Tilak Road, near Ram Mandir, Malipura','Akola','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/akola/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),

  ('Amravati','Miraj Cinemas: Tapadia City Centre','2nd Floor, Badnera Road','Amravati','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/amravati/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Amravati','E Orbit Multiplex','Elite Mall, Guruchhaya Colony, Saturna, Sai Nagar, Badnera Road','Amravati','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/amravati/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Amravati','Prabhat Talkies','Jawahar Gate Road, Amravati Camp, behind Mahila Vidyalaya','Amravati','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/amravati/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Amravati','Saroj Talkies','Saroj Chowk, Jawahar Gate Road','Amravati','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/amravati/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Amravati','Priya Talkies','Jaistambh Chowk, Morshi Road, near ICICI Bank','Amravati','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/amravati/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),

  ('Beed','Tanishka Cinema','Kalyan Pingle Daji Mall, above Croma, Chhatrapati Shivaji Maharaj Chowk, Nagar Road','Beed','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/beed/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Beed','Santoshimata','Shahu Nagar, Pangri Road, near Bus Stand','Beed','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/beed/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Beed','Bhagwati Chitra Mandir','S No. 59, Shivaji Complex, Georai Main Road, Shastri Chowk Bus Stand Road','Georai','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/beed/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Beed','Shree Chitramandir','Manik Nagar, Vidyanagar','Parli','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/beed/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),

  ('Bhandara','Adarsh Chitra Mandir','Gandhi Square, Gandhi Chowk, Santaji Nagar','Bhandara','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/bhandara/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Bhandara','AR Cineplex','Aswale Park, Samruddhi Nagar','Bhandara','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/bhandara/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Bhandara','Smile Multiplex','New Ganj Bazar, beside Vikram Palace Hotel, Hasara Road','Tumsar','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/bhandara/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb),
  ('Bhandara','Chhotu Maharaj Cine Cafe','Lakhani, Gadegaon, opposite Ashok Leyland','Lakhani','Maharashtra',NULL::integer,'unverified',false,true,'commercial_cinema',
   '[{"type":"booking_platform_listing","platform":"BookMyShow","url":"https://in.bookmyshow.com/bhandara/cinemas","note":"Listing cross-check only; capacity and seat map not verified."}]'::jsonb)
)
SELECT
  c.district, c.name, c.address, c.city, c.state, c.total_capacity,
  c.verification_status, c.has_seat_layout, c.is_template,
  CASE WHEN v.id IS NULL THEN 'MISSING_CANDIDATE'
       ELSE 'POSSIBLE_EXISTING_MATCH_REVIEW' END AS database_match_status,
  v.id AS existing_venue_id,
  c.facilities AS source_metadata
FROM candidates c
LEFT JOIN venues v
  ON lower(trim(v.name)) = lower(trim(c.name))
 AND lower(trim(v.city)) = lower(trim(c.city))
ORDER BY c.district, c.city, c.name;


-- 2) OPTIONAL INSERT — DO NOT RUN UNTIL:
--    (a) the preview has been reviewed,
--    (b) schema.ts confirms these columns and types,
--    (c) ownership_type accepts 'commercial_cinema',
--    (d) verification_status accepts 'unverified',
--    (e) has_seat_layout/is_template are BOOLEAN columns,
--    (f) total_capacity accepts NULL.
--
-- This INSERT skips exact name+city matches and creates only unverified catalogue
-- candidates. It still does not create events or seats.
--
-- BEGIN;
-- WITH candidates (
--   district, name, address, city, state, total_capacity,
--   verification_status, has_seat_layout, is_template, ownership_type, facilities
-- ) AS (
--   -- Copy the VALUES rows from the preview CTE above here.
--   -- Intentionally left disabled to prevent accidental production writes.
--   SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
--          NULL::integer, NULL::text, NULL::boolean, NULL::boolean,
--          NULL::text, NULL::jsonb
--   WHERE false
-- )
-- INSERT INTO venues (
--   name, address, city, state, total_capacity,
--   verification_status, has_seat_layout, is_template, ownership_type, facilities
-- )
-- SELECT c.name, c.address, c.city, c.state, c.total_capacity,
--        c.verification_status, c.has_seat_layout, c.is_template,
--        c.ownership_type, c.facilities
-- FROM candidates c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM venues v
--   WHERE lower(trim(v.name)) = lower(trim(c.name))
--     AND lower(trim(v.city)) = lower(trim(c.city))
-- );
-- COMMIT;
