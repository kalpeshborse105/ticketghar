-- MahaTicket remaining districts: Sindhudurg, Solapur, Thane, Wardha, Washim
-- Read-only candidate preview. No INSERT/UPDATE/DELETE.
-- Some venues have dated showtime evidence; other entries are directory leads only.
-- Listing evidence does not prove seat capacity, seat layout, organizer authorization, or suitability for ticket sales.
-- Confirm current operations and district boundaries; deduplicate alternate/renamed venues before any import.

WITH candidate_venues (
 district, venue_name, city, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Sindhudurg', 'PVR INOX: Nexus Centre City', 'Kankavli, Sindhudurg', 'Nexus Centre City Mall, Kankavli, Sindhudurg, Maharashtra', 'https://in.bookmyshow.com/', NULL::integer, false, 'platform_listed_unverified'),
  ('Sindhudurg', 'Rameshwar Talkies', 'Kudal, Sindhudurg', 'Kudal, Sindhudurg, Maharashtra', 'https://cinematimes.in/movies-running-in-sindhudurg/', NULL::integer, false, 'platform_listed_unverified'),
  ('Sindhudurg', 'Vijay Talkies', 'Sawantwadi, Sindhudurg', 'Sawantwadi, Sindhudurg, Maharashtra', 'https://cinematimes.in/movies-running-in-sindhudurg/', NULL::integer, false, 'platform_listed_unverified'),
  ('Sindhudurg', 'Sagar Talkies', 'Malvan, Sindhudurg', 'Malvan, Sindhudurg, Maharashtra', 'https://cinematimes.in/movies-running-in-sindhudurg/', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'E-SQUARE Oasis (A.C)', 'Solapur', 'Solapur, Maharashtra', 'https://cinematimes.in/theatre/e-square-oasis-a-c-solapur/', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'INOX: Solapur Central', 'Solapur', 'Solapur Central Mall, Jule Solapur, Solapur, Maharashtra 413004', 'https://in.bookmyshow.com/solapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'Prabhat Theatre', 'Solapur', 'Solapur, Maharashtra', 'https://in.bookmyshow.com/solapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'Bhagwat Chitra Mandir', 'Solapur', 'Solapur, Maharashtra', 'https://in.bookmyshow.com/solapur/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'Laxmi Narayan Talkies', 'Solapur', 'Solapur, Maharashtra', 'https://cinematimes.in/movies-running-in-solapur/', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'Natraj Cinema', 'Solapur', 'Solapur, Maharashtra', 'https://cinematimes.in/movies-running-in-solapur/', NULL::integer, false, 'platform_listed_unverified'),
  ('Solapur', 'Sangam Talkies', 'Solapur', 'Solapur, Maharashtra', 'https://cinematimes.in/movies-running-in-solapur/', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'Cinepolis: Viviana Mall / Lake Shore', 'Thane', 'Viviana Mall, Eastern Express Highway, Thane West, Maharashtra 400606', 'https://in.bookmyshow.com/cinemas/thane/cinepolis-vip-lake-shore-thane-ex-viviana-mall/buytickets/CPVV/20261022', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'INOX: Korum Mall', 'Thane', 'Korum Mall, Eastern Express Highway, Thane West, Maharashtra 400606', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'MovieMax: Wonder Mall', 'Thane', 'Wonder Mall, Ghodbunder Road, Thane West, Maharashtra 400615', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'Devgn CineX: The Walk', 'Thane', 'The Walk, Hiranandani Estate, Thane, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'Anand Cinema', 'Thane', 'Thane, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'Gold Cinema: Shivaji Road', 'Thane', 'Shivaji Road, Thane West, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'ICONIX CINEMAS (Old Aaradhna Talkies)', 'Thane', 'Thane, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'Cinepolis: High Street Mall', 'Thane', 'High Street Mall, Thane, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'Nazrana Cinema', 'Bhiwandi, Thane', 'Bhiwandi, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Thane', 'PVR: Haseen', 'Bhiwandi, Thane', 'Bhiwandi, Maharashtra', 'https://showting.in/movies/ranabaali-in-thane', NULL::integer, false, 'platform_listed_unverified'),
  ('Wardha', 'Ganesh Talkies', 'Wardha', 'Wardha, Maharashtra', 'https://cinematimes.in/theatre/ganesh-talkies-wardha/', NULL::integer, false, 'platform_listed_unverified'),
  ('Wardha', 'Poonam Talkies', 'Wardha', 'Wardha, Maharashtra', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'platform_listed_unverified'),
  ('Wardha', 'Ashok Talkies', 'Wardha', 'Wardha, Maharashtra', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'platform_listed_unverified'),
  ('Wardha', 'Rajkala Cinema', 'Wardha', 'Wardha, Maharashtra', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'platform_listed_unverified'),
  ('Washim', 'H2M Movieplex', 'Washim', 'Upper Ground Floor, B-Wing, Patni Commercial Complex, Washim, Maharashtra 444505', 'https://www.district.in/movies/h2m-movieplex-washim-CD1102408?fromdate=2026-10-23', NULL::integer, false, 'platform_listed_unverified')
)
SELECT district, venue_name, city, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, city, venue_name;
