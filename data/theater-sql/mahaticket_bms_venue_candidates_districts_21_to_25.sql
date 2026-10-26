-- MahaTicket candidate venue review: districts 21-25 (alphabetical)
-- Read-only preview only. No INSERT/UPDATE/DELETE.
-- Listings are discovery evidence, not proof of current operation, capacity, seat layout, or sales authorization.
-- Several Palghar candidates are regional-search leads and require direct verification; do not import without checking.
-- Duplicate/alias names are retained for research and should be deduplicated after verifying the physical venue.

WITH candidate_venues (
  district, venue_name, city, address, source_url,
  verified_capacity, has_verified_seat_layout, review_status
) AS (
  VALUES
  ('Nandurbar', 'Miraj Cinemas: NBC', 'Nandurbar', 'Miraj Cinemas Nandurbar Business Centre, S. No. 387/2, Surat Bypass Road, Nandurbar, Maharashtra 425412', 'https://www.district.in/movies/miraj-cinemas-nandurbar-CD3184', NULL::integer, false, 'platform_listed_unverified'),
  ('Nanded', 'PVR Treasure Bazaar Mall', 'Nanded', '2nd Floor, Treasure Bazaar, Latur–Nanded Road, Vasarani, Nanded, Maharashtra 431606', 'https://www.district.in/movies/pvr-inox-treasure-bazaar-mall-nanded-CD1018970', NULL::integer, false, 'platform_listed_unverified'),
  ('Nanded', 'Bharat E-Square Multiplex', 'Nanded', '3rd Floor, Meera Mall, Canal Road, Samarth Nagar, Nanded, Maharashtra 431605', 'https://cinematimes.in/theatre/bharat-e-square-nanded/', NULL::integer, false, 'platform_listed_unverified'),
  ('Nanded', 'Liberty Cinema', 'Nanded', 'Gadipura, Khadakpura, Nanded, Maharashtra 431604', 'https://cinematimes.in/movies-running-in-nanded/', NULL::integer, false, 'platform_listed_unverified'),
  ('Nanded', 'Shyam Talkies', 'Nanded', 'Railway Station Road, Shivaji Putala, Vazirabad, Nanded, Maharashtra 431601', 'https://www.mapstreetdata.com/india/Listing/Town/movies/Nanded/Nanded', NULL::integer, false, 'platform_listed_unverified'),
  ('Nanded', 'Carnival Cinema / Jyoti Talkies', 'Nanded', 'Near Railway Station, opposite Sant Sri Govind Singh Stadium, Gokul Nagar, Nanded, Maharashtra 431601', 'https://www.mapstreetdata.com/india/Listing/Town/movies/Nanded/Nanded', NULL::integer, false, 'platform_listed_unverified'),
  ('Nanded', 'Habib Talkies', 'Nanded', 'Khadakpura, Nanded, Maharashtra 431604', 'https://www.mapstreetdata.com/india/Listing/Town/movies/Nanded/Nanded', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'MovieMax: College Road', 'Nashik', 'College Road, Nashik, Maharashtra', 'https://www.district.in/movies/cinemas-in-nashik', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'Cinemax City Center', 'Nashik', 'City Center Mall, Untwadi Road, Nashik, Maharashtra', 'https://www.district.in/movies/cinemas-in-nashik', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'Divya Cinemas', 'Nashik', 'Purab Paschim Plaza, Trimurti Chowk, Cidco-9, Nashik, Maharashtra 422008', 'https://in.bookmyshow.com/cinemas/NASK/divya-cinemas-nashik/buytickets/DCCO/20261026', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'Vijay Mamta Cinemas', 'Nashik', 'Old Nashik–Pune Highway, opposite Prasad Chambers, Nashik, Maharashtra', 'https://www.google.com/maps/search/Local%2Bcinemas%2BJail%2BRoad%2BNashik%2BMaharashtra', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'PVR Cinemax Regimental Plaza Mall', 'Deolali, Nashik', 'Regimental Plaza Mall, Survey No. 305, A/2(P), near Bytco Point, Deolali, Nashik, Maharashtra', 'https://www.google.com/maps/search/Local%2Bcinemas%2BJail%2BRoad%2BNashik%2BMaharashtra', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'Regimental Mukta A2 Cinemas', 'Deolali, Nashik', 'Regimental Plaza Mall, near Bytco Point, Deolali, Nashik, Maharashtra', 'https://www.google.com/maps/search/Local%2Bcinemas%2BJail%2BRoad%2BNashik%2BMaharashtra', NULL::integer, false, 'platform_listed_unverified'),
  ('Nashik', 'Divya Cinemas: Nashik', 'Nashik', 'Purab Paschim Plaza, Trimurti Chowk, Cidco-9, Nashik, Maharashtra 422008', 'https://in.bookmyshow.com/cinemas/nashik/divya-cinemas-nashik/buytickets/dcco/20261022', NULL::integer, false, 'platform_listed_unverified'),
  ('Palghar', 'Cinepolis: Viva Swastik Mall', 'Virar, Palghar', 'Viva Swastik Mall, Virar West, Palghar district, Maharashtra', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Palghar', 'MovieMax: Dattani Square Mall', 'Vasai, Palghar', 'Dattani Square Mall, Vasai, Palghar district, Maharashtra', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Palghar', 'Miraj Cinemas: Dattani Mall', 'Vasai, Palghar', 'Dattani Mall, Vasai, Palghar district, Maharashtra', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Palghar', 'Fun Fiesta Cinemas', 'Vasai, Palghar', 'Vasai, Palghar district, Maharashtra', 'https://www.google.com/maps/search/cinemas+Vasai+Virar+Palghar+Maharashtra', NULL::integer, false, 'platform_listed_unverified'),
  ('Palghar', 'K Movie Star Multiplex', 'Virar, Palghar', 'Virar, Palghar district, Maharashtra', 'https://www.google.com/maps/search/cinemas+Vasai+Virar+Palghar+Maharashtra', NULL::integer, false, 'platform_listed_unverified'),
  ('Palghar', 'Shree Sai Cinema', 'Boisar, Palghar', 'Boisar, Palghar district, Maharashtra', 'https://www.google.com/maps/search/cinemas+Boisar+Palghar+Maharashtra', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Anusaya: Parbhani / E-SQUARE Anusaya', 'Parbhani', 'Gangakhed Road, near flyover, Parbhani, Maharashtra 431401', 'https://in.bookmyshow.com/parbhani/cinemas', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Naresh Cineplex', 'Parbhani', 'National Highway 222, Masoom Colony, Jintoor Road, Parbhani, Maharashtra 431401', 'https://in.bookmyshow.com/cinemas/PARB/naresh-cineplex-parbhani/buytickets/NCPM/20261026', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Mahavir Cinema Hall', 'Parbhani', 'Juna Mondha, Gandhi Park, Parbhani, Maharashtra 431401', 'https://www.cybo.com/IN/parbhani/movie-theaters', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Priti Cinema', 'Parbhani', 'Main Post Office Road, Parbhani, Maharashtra 431401', 'https://www.cybo.com/IN/parbhani/movie-theaters', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Talreja Cinema', 'Parbhani', 'Masoom Colony, Parbhani, Maharashtra 431401', 'https://www.cybo.com/IN/parbhani/movie-theaters', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Naresh Big Cinema', 'Parbhani', 'Jintur Road, Masoom Colony, Parbhani, Maharashtra 431401', 'https://www.cybo.com/IN/parbhani/movie-theaters', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Shivram Chitra Mandir', 'Parbhani', 'Shivram Nagar, Parbhani, Maharashtra 431401', 'https://www.cybo.com/IN/parbhani/movie-theaters', NULL::integer, false, 'platform_listed_unverified'),
  ('Parbhani', 'Meenakshi Cinemark', 'Selu, Parbhani', 'Jintur Street, near Government Rest House, Selu, Parbhani district, Maharashtra 431503', 'https://cinematimes.in/movies-running-in-parbhani/', NULL::integer, false, 'platform_listed_unverified')
)
SELECT district, venue_name, city, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, city, venue_name;
