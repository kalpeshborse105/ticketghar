-- MahaTicket additional taluka-level venue research: districts 1-5
-- Districts: Ahilyanagar, Akola, Amravati, Beed, Bhandara
-- READ-ONLY preview; no INSERT/UPDATE/DELETE.
-- Existing city-level candidates from previous batches intentionally omitted where identified.
-- Directory results may contain historical, duplicate, closed, renamed, or incorrectly geolocated venues.
-- Verify exact location, operating status, district, capacity, seat map, and organizer permission before any import.

WITH candidate_venues (
 district, venue_name, city_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Ahilyanagar', 'Agasti Chitra Mandir', 'Akole', 'Devthan Road, Akole, Ahilyanagar district, Maharashtra 422601', 'https://www.justdial.com/Sangamner/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Ahilyanagar', 'Montage Cinema', 'Sangamner', 'Sathe Nagar, Sangamner, Ahilyanagar district, Maharashtra', 'https://www.justdial.com/Sangamner/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Ahilyanagar', 'Rajasthan Theatre', 'Sangamner', 'Punjabi Colony, Sangamner, Ahilyanagar district, Maharashtra 422605', 'https://www.justdial.com/Sangamner/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Ahilyanagar', 'Chhotu Maharaj Cine Cafe', 'Sangamner', 'Sathe Nagar / Gunjalwadi Road, Sangamner, Ahilyanagar district, Maharashtra', 'https://www.justdial.com/Sangamner/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Akola', 'Shree Talkies', 'Akot', 'Akot, Akola district, Maharashtra 444101', 'https://www.justdial.com/Akot/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Akola', 'Gajanan Talkies', 'Akot', 'Akot, Akola district, Maharashtra 444101', 'https://www.justdial.com/Akot/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Akola', 'Sunny Palace', 'Akot', 'Akot, Akola district, Maharashtra 444101', 'https://www.justdial.com/Akot/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Akola', 'Gopal Talkies', 'Telhara', 'Main Road, Telhara, Akola district, Maharashtra 444108', 'https://www.justdial.com/Akola/Cinema-Halls-in-Murtizapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Akola', 'Indrayani Theatre', 'Hiwarkhed', 'Hiwarkhed, Akola district, Maharashtra 444103', 'https://www.justdial.com/Akola/Cinema-Halls-in-Murtizapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Akola', 'Gupta Theatre', 'Hiwarkhed', 'Hiwarkhed, Akola district, Maharashtra 444103', 'https://www.justdial.com/Akola/Cinema-Halls-in-Murtizapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Amravati', 'Dream Cinemas', 'Daryapur', 'Akot Road, opposite J. D. Patil College, Daryapur, Amravati district, Maharashtra 444803', 'https://www.justdial.com/Amravati/Cinema-Halls-in-Achalpur-Road-Paratwada/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Amravati', 'Melghat Talkies', 'Dharni', 'Amravati Main Road, behind bus stand, Dharni, Amravati district, Maharashtra 444702', 'https://www.justdial.com/Amravati/Cinema-Halls-in-Achalpur-Road-Paratwada/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Amravati', 'Nova Cinemas', 'Amravati', '2nd Floor, Dhabaliya Niwas, Ambapeth, Amravati, Maharashtra 444601', 'https://www.justdial.com/Amravati/Cinema-Halls-in-Achalpur-Road-Paratwada/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Amravati', 'Akbar Ali Theatre', 'Anjangaon Surji', 'Anjangaon Surji, Amravati district, Maharashtra 444705', 'https://www.justdial.com/Amravati/Cinema-Halls-in-Achalpur-Road-Paratwada/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Beed', 'Radha Chitra Mandir', 'Majalgaon', 'Bhim Nagar, Majalgaon, Beed district, Maharashtra 431131', 'https://www.cybo.com/IN/majalgaon/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Beed', 'Shriram Talkies', 'Majalgaon', 'Sirsat Galli, Majalgaon, Beed district, Maharashtra 431131', 'https://www.cybo.com/IN/majalgaon/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Beed', 'Asha Cineplex', 'Beed', 'Pingale Nagar, Datta Nagar, Beed, Maharashtra 431122', 'https://www.cybo.com/IN/majalgaon/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Beed', 'Mohan Cinemark', 'Ambajogai', 'Near Bus Stand, Prashant Nagar, Morewadi, Ambajogai, Beed district, Maharashtra 431517', 'https://www.cybo.com/IN/majalgaon/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Beed', 'Srinath Talkies', 'Parli Vaijnath', 'Shivaji Chowk, Manik Nagar, Parli Vaijnath, Beed district, Maharashtra 431515', 'https://www.cybo.com/IN/majalgaon/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Bhandara', 'Mahavir Talkies', 'Sakoli', 'Panchsheel Ward, Sakoli, Bhandara district, Maharashtra 441802', 'https://www.justdial.com/Bhandara/Cinema-Halls-in-Sakoli-Bhandara/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Bhandara', 'Blesy Cineplex', 'Tumsar', 'Shriram Nagar, Tumsar, Bhandara district, Maharashtra 441912', 'https://www.justdial.com/Bhandara/Cinema-Halls-in-Sakoli-Bhandara/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Bhandara', 'Shriram Talkies', 'Tumsar', 'Vivekanand Nagar, Tumsar, Bhandara district, Maharashtra 441912', 'https://www.justdial.com/Bhandara/Cinema-Halls-in-Sakoli-Bhandara/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Bhandara', 'Satyam Theatre', 'Bhandara', 'Station Road, Pragati Colony, Bhandara, Maharashtra 441904', 'https://www.justdial.com/Bhandara/Cinema-Halls-in-Sakoli-Bhandara/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Bhandara', 'Snehal Talkies', 'Tumsar', 'Tumsar, Bhandara district, Maharashtra 441912', 'https://www.justdial.com/Bhandara/Cinema-Halls-in-Sakoli-Bhandara/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check')
)
SELECT district, venue_name, city_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, city_or_taluka, venue_name;
