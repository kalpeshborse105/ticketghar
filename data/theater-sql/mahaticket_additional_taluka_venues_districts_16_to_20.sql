-- MahaTicket additional taluka/town cinema and event-venue research candidates: districts 16-20
-- Districts: Kolhapur, Latur, Mumbai City, Mumbai Suburban, Nagpur
-- READ-ONLY SQL preview: no INSERT/UPDATE/DELETE/schema changes.
-- User requested city + taluka + village coverage; these are candidate leads, not verified active venues.
-- Prior city-level venues from earlier batches are not intentionally repeated except records flagged for DB cross-check.
-- Mumbai City/Suburban boundary and historical single-screen status require special care.
-- No capacity, seat layout, event, date/time, or selling authorization is inferred.
-- Confirm the physical address and deduplicate aliases before adding to production.

WITH candidate_venues (
 district, venue_name, town_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Kolhapur', 'Sanket Talkies', 'Ichalkaranji', 'Ichalkaranji, Kolhapur district, Maharashtra 416115', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Vijay Theatre', 'Ichalkaranji', 'Ichalkaranji, Kolhapur district, Maharashtra 416115', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Natraj Cinema', 'Ichalkaranji', 'Ichalkaranji, Kolhapur district, Maharashtra 416115', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Shivneri Talkies', 'Gadhinglaj', 'Gadhinglaj, Kolhapur district, Maharashtra 416502', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Shree Ganesh Talkies', 'Kagal', 'Kagal, Kolhapur district, Maharashtra 416216', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Prabhat Chitra Mandir', 'Kurundwad', 'Kurundwad, Shirol taluka, Kolhapur district, Maharashtra 416106', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Laxmi Talkies', 'Murgud', 'Murgud, Kagal taluka, Kolhapur district, Maharashtra 416219', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Kolhapur', 'Shree Ram Cinema', 'Panhala area', 'Panhala, Kolhapur district, Maharashtra', 'https://www.justdial.com/Kolhapur/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_location_check'),
  ('Latur', 'Vijay Cinema', 'Udgir', 'Udgir, Latur district, Maharashtra 413517', 'https://www.justdial.com/Latur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Latur', 'Shivaji Talkies', 'Ahmedpur', 'Ahmedpur, Latur district, Maharashtra 413515', 'https://www.justdial.com/Latur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Latur', 'Nutan Chitra Mandir', 'Nilanga', 'Nilanga, Latur district, Maharashtra 413521', 'https://www.justdial.com/Latur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Latur', 'Rajesh Cinema', 'Ausa', 'Ausa, Latur district, Maharashtra 413520', 'https://www.justdial.com/Latur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Latur', 'Local cinema hall lead — name unconfirmed', 'Renapur', 'Renapur, Latur district, Maharashtra; exact venue not verified', 'https://latur.gov.in/en/tehsil/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Mumbai City', 'Liberty Cinema', 'Marine Lines', '41, New Marine Lines, Mumbai, Maharashtra 400020', 'https://www.libertycinema.in/', NULL::integer, false, 'check_existing_db'),
  ('Mumbai City', 'New Excelsior Cinema', 'Fort', 'Wallace Street / Fort, Mumbai, Maharashtra 400001', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'check_existing_db'),
  ('Mumbai City', 'Alfred Talkies', 'Grant Road', 'Grant Road, Mumbai, Maharashtra 400007', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'check_existing_db'),
  ('Mumbai City', 'Novelty Cinema', 'Grant Road', 'Lamington Road area, Mumbai, Maharashtra 400007', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_operation_check'),
  ('Mumbai City', 'Central Plaza Cinema', 'Girgaon', 'Charni Road / Girgaon, Mumbai, Maharashtra 400004', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_operation_check'),
  ('Mumbai City', 'Imperial Cinema', 'Grant Road', 'Grant Road, Mumbai, Maharashtra 400007', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_operation_check'),
  ('Mumbai Suburban', 'Roxy Cinema', 'Ghatkopar area — verify suburb/district mapping', 'Ghatkopar, Mumbai, Maharashtra', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'check_existing_db_and_district'),
  ('Mumbai Suburban', 'Satyam Cineplex', 'Borivali', 'Borivali, Mumbai Suburban district, Maharashtra 400092', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'check_existing_db'),
  ('Mumbai Suburban', 'Kamal Cinema', 'Kandivali', 'Kandivali, Mumbai Suburban district, Maharashtra 400067', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_operation_check'),
  ('Mumbai Suburban', 'Shree Sai Cinema', 'Dahisar', 'Dahisar, Mumbai Suburban district, Maharashtra 400068', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Mumbai Suburban', 'Rajan Cinema', 'Malad', 'Malad, Mumbai Suburban district, Maharashtra 400064', 'https://www.justdial.com/Mumbai/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_operation_check'),
  ('Mumbai Suburban', 'Gaiety Galaxy', 'Bandra West', 'Bandra West, Mumbai Suburban district, Maharashtra 400050', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'check_existing_db'),
  ('Mumbai Suburban', 'G7 Multiplex', 'Bandra West', 'Bandra West, Mumbai Suburban district, Maharashtra 400050', 'https://in.bookmyshow.com/mumbai/cinemas', NULL::integer, false, 'possible_alias_of_Gaiety_Galaxy'),
  ('Nagpur', 'Shyam Talkies', 'Kamptee', 'Kamptee, Nagpur district, Maharashtra 441001', 'https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Nagpur', 'Sudarshan Cinema', 'Kamptee', 'Kamptee, Nagpur district, Maharashtra 441001', 'https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Nagpur', 'Ganesh Talkies', 'Umred', 'Umred, Nagpur district, Maharashtra 441203', 'https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Nagpur', 'Prabhat Cinema', 'Katol', 'Katol, Nagpur district, Maharashtra 441302', 'https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Nagpur', 'Vijay Talkies', 'Saoner', 'Saoner, Nagpur district, Maharashtra 441107', 'https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Nagpur', 'Natraj Cinema', 'Ramtek', 'Ramtek, Nagpur district, Maharashtra 441106', 'https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_current_operation_check'),
  ('Nagpur', 'Local cinema hall lead — name unconfirmed', 'Bhiwapur', 'Bhiwapur, Nagpur district, Maharashtra; exact venue not verified', 'https://nagpur.gov.in/tehsil/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Nagpur', 'Local cinema hall lead — name unconfirmed', 'Parseoni', 'Parseoni, Nagpur district, Maharashtra; exact venue not verified', 'https://nagpur.gov.in/tehsil/', NULL::integer, false, 'low_confidence_research_lead')
)
SELECT district, venue_name, town_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, town_or_taluka, venue_name;
