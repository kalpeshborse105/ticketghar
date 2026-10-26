-- MahaTicket additional district/taluka/town cinema research candidates: districts 21-25
-- Districts: Nandurbar, Nanded, Nashik, Palghar, Parbhani
-- READ-ONLY SQL preview only: no INSERT/UPDATE/DELETE/schema changes.
-- Candidate list focuses on smaller towns/talukas and excludes known previously listed city venues where identifiable.
-- Some records are low-confidence leads without an identified cinema name; do not treat those as confirmed venues.
-- Records marked outside_district must be reassigned or excluded, not imported under the listed district.
-- Verify exact address, current operation, alias/duplicate status, and district mapping before any production insert.
-- Never infer capacity, seat map, events, dates/times, inventory, or sales authorization.

WITH candidate_venues (
 district, venue_name, town_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Nandurbar', 'New Ganesh Cinema', 'Taloda', 'College Road, Taloda, Nandurbar district, Maharashtra 425413', 'https://www.cybo.com/IN/taloda/movie-theaters/', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nandurbar', 'Amar Chitra Mandir', 'Nandurbar town', 'Raysinghpura, Navnath Nagar, Nandurbar, Maharashtra 425412', 'https://www.cybo.com/IN/taloda/movie-theaters/', NULL::integer, false, 'directory_lead_check_existing_db'),
  ('Nandurbar', 'Manoranjan Cinema Hall', 'Shahada', 'Mahalaxmi Nagar, Shahada, Nandurbar district, Maharashtra 425409', 'https://www.cybo.com/IN/taloda/movie-theaters/', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nandurbar', 'Miraj Cinema / Miraj Cenima', 'Nandurbar town', 'Gayatri Nagar, Gandhinagar, Nandurbar, Maharashtra 425412', 'https://www.cybo.com/IN/taloda/movie-theaters/', NULL::integer, false, 'possible_alias_of_existing_Miraj_Cinemas_NBC'),
  ('Nandurbar', 'Dondaicha cinema listing — name unclear', 'Dondaicha', 'Dondaicha, Dhule district; outside Nandurbar district, do not import as Nandurbar', 'https://www.cybo.com/IN/taloda/movie-theaters/', NULL::integer, false, 'outside_district_exclude_or_reassign'),
  ('Nanded', 'Dhanraj Theatre', 'Kinwat', 'Main Road, Kupati, Kinwat, Nanded district, Maharashtra 431804', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Mukhed/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nanded', 'Manohar Talkies', 'Mukhed', 'Mahadev Temple Road, Mukhed, Nanded district, Maharashtra 431715', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Mukhed/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nanded', 'Natraj Theatre', 'Dharmabad', 'Dharmabad, Nanded district, Maharashtra 431809', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Mukhed/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nanded', 'Firozuddin Theatre', 'Degloor', 'Shahaji Nagar, Azad Colony, Degloor, Nanded district, Maharashtra 431717', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Degaon-Mukhed/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nanded', 'Cine Delight Cinema Theatre', 'Degloor', 'Gut No. 281, Zia Colony, Degloor, Nanded district, Maharashtra 431717', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Degaon-Mukhed/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nanded', 'Uday Theatre', 'Kinwat', 'Main Road, Kupati, Kinwat, Nanded district, Maharashtra 431804', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Degaon-Mukhed/nct-10099752', NULL::integer, false, 'possible_alias_check'),
  ('Nanded', 'Sweety Cinema', 'Mukhed', 'Main Road, Mukhed, Nanded district, Maharashtra 431715', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Mukhed/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nanded', 'Kalpana Chitra Mandir', 'Udgir — outside Nanded district', 'Udgir, Latur district, Maharashtra 413517', 'https://www.justdial.com/Nanded/Cinema-Halls-in-Mukhed/nct-10099752', NULL::integer, false, 'outside_district_reassign_to_Latur'),
  ('Nashik', 'Madhuban Cinema', 'Malegaon', 'Malegaon, Nashik district, Maharashtra 423203', 'https://www.justdial.com/Nashik/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nashik', 'Mohan Talkies', 'Manmad', 'Manmad, Nandgaon taluka, Nashik district, Maharashtra 423104', 'https://www.justdial.com/Nashik/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nashik', 'Shree Ganesh Cinema', 'Yeola', 'Yeola, Nashik district, Maharashtra 423401', 'https://www.justdial.com/Nashik/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nashik', 'Sudarshan Cinema', 'Sinnar', 'Sinnar, Nashik district, Maharashtra 422103', 'https://www.justdial.com/Nashik/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Nashik', 'Prabhat Talkies', 'Niphad', 'Niphad, Nashik district, Maharashtra 422303', 'https://www.justdial.com/Nashik/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_research_lead'),
  ('Nashik', 'Local cinema hall lead — name unconfirmed', 'Igatpuri', 'Igatpuri, Nashik district, Maharashtra; exact venue not verified', 'https://nashik.gov.in/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Palghar', 'Shree Sai Cinema', 'Dahanu', 'Dahanu, Palghar district, Maharashtra 401602', 'https://www.justdial.com/Palghar/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Palghar', 'Fun Fiesta Cinemas', 'Boisar', 'Boisar, Palghar district, Maharashtra 401501', 'https://www.justdial.com/Palghar/Cinema-Halls/nct-10099752', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Palghar', 'K Movie Star Multiplex', 'Boisar', 'Boisar, Palghar district, Maharashtra 401501', 'https://www.justdial.com/Palghar/Cinema-Halls/nct-10099752', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Palghar', 'Local cinema hall lead — name unconfirmed', 'Jawhar', 'Jawhar, Palghar district, Maharashtra 401603; exact venue not verified', 'https://palghar.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Palghar', 'Local cinema hall lead — name unconfirmed', 'Wada', 'Wada, Palghar district, Maharashtra 421303; exact venue not verified', 'https://palghar.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Palghar', 'Local cinema hall lead — name unconfirmed', 'Mokhada', 'Mokhada, Palghar district, Maharashtra 401604; exact venue not verified', 'https://palghar.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Parbhani', 'Khushi Multiplex', 'Jintur', 'Jalna Road / Jintur Road, Jintur, Parbhani district, Maharashtra 431509', 'https://in.bookmyshow.com/parbhani/cinemas', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Parbhani', 'Meenakshi Cinemark', 'Selu', 'Plot No. 13, Jintur Street, near Government Rest House, Selu, Parbhani district, Maharashtra 431503', 'https://cinematimes.in/movies-running-in-parbhani/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Parbhani', 'Local cinema hall lead — name unconfirmed', 'Gangakhed', 'Gangakhed, Parbhani district, Maharashtra 431514; exact venue not verified', 'https://parbhani.gov.in/en/subdivisions-and-talukas/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Parbhani', 'Local cinema hall lead — name unconfirmed', 'Pathri', 'Pathri, Parbhani district, Maharashtra 431506; exact venue not verified', 'https://parbhani.gov.in/en/subdivisions-and-talukas/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Parbhani', 'Local cinema hall lead — name unconfirmed', 'Manwath', 'Manwath, Parbhani district, Maharashtra 431505; exact venue not verified', 'https://parbhani.gov.in/en/subdivisions-and-talukas/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Parbhani', 'Local cinema hall lead — name unconfirmed', 'Purna', 'Purna, Parbhani district, Maharashtra 431511; exact venue not verified', 'https://parbhani.gov.in/en/subdivisions-and-talukas/', NULL::integer, false, 'low_confidence_research_lead')
)
SELECT district, venue_name, town_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, town_or_taluka, venue_name;
