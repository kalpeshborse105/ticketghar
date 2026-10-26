-- MahaTicket additional district/taluka/village venue research candidates: districts 11-15
-- Districts: Gadchiroli, Gondia, Hingoli, Jalgaon, Jalna
-- READ-ONLY candidate preview. No INSERT, UPDATE, DELETE, or schema changes.
-- Existing known city-level venues should be deduplicated against the live DB before import.
-- Entries include low-confidence directory leads where exact operation/name needs verification.
-- Do not infer current operation, seating/capacity, seat layout, events, or sell authorization.
-- District-level taluka list references are provided only to support geographic checking.

WITH candidate_venues (
 district, venue_name, town_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Gadchiroli', 'PictureTime MCG Cinemas', 'Gadchiroli town', 'Near Swaraj Health, Gadchiroli, Maharashtra 442605', 'https://in.bookmyshow.com/gadchiroli/cinemas', NULL::integer, false, 'existing_reference_check'),
  ('Gadchiroli', 'Old local cinema hall — name unconfirmed', 'Gadchiroli town', 'Historic/local cinema lead; exact venue name and address not verified', 'https://timesofindia.indiatimes.com/city/nagpur/changing-scenes-gadchiroli-gets-1st-ac-movie-theatre/articleshow/121374174.cms', NULL::integer, false, 'low_confidence_research_lead'),
  ('Gondia', 'Snehal Talkies', 'Tirora', 'Tirora, Gondia district, Maharashtra 441911', 'https://www.justdial.com/Gondia/Cinema-Halls-in-Goregaon/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Gondia', 'Lia Cineplex', 'Amgaon', 'Bail Bazar, Shubham Nagar, Amgaon, Gondia district, Maharashtra 441902', 'https://www.justdial.com/Gondia/Cinema-Halls-in-Amgaon-Gondia/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Gondia', 'Nirmal Theatre', 'Gondia town', 'Fulchur Road, Gondia Bazar, Gondia, Maharashtra 441601', 'https://www.justdial.com/Gondia/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Gondia', 'Kashish Cinemas', 'Gondia town', 'Ganesh Nagar, Gondia, Maharashtra 441601', 'https://www.justdial.com/Gondia/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Gondia', 'Shri Krishna Talkies', 'Goregaon area — exact district/address check', 'Goregaon listing; exact address not reliably resolved', 'https://www.justdial.com/Gondia/Cinema-Halls-in-Goregaon/nct-10099752', NULL::integer, false, 'low_confidence_location_check'),
  ('Hingoli', 'Radharam Talkies', 'Basmath (Basmat)', 'Panchsheel Nagar, Zenda Chowk Road, Basmath, Hingoli district, Maharashtra 431512', 'https://www.justdial.com/Hingoli/Cinema-Halls-in-Sengaon-Hingoli/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Hingoli', 'Radharam Cinemas', 'Basmath (Basmat)', 'Panchsheel Nagar, Basmath, Hingoli district, Maharashtra 431512', 'https://www.justdial.com/Hingoli/Cinema-Halls-in-Sengaon-Hingoli/nct-10099752', NULL::integer, false, 'possible_alias_of_Radharam_Talkies'),
  ('Hingoli', 'Local cinema hall lead — name unconfirmed', 'Kalamnuri', 'Kalamnuri, Hingoli district, Maharashtra; exact venue not verified', 'https://hingoli.nic.in/en/map-of-district/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Jalgaon', 'Ashok Talkies', 'Jalgaon city', 'Polan Peth, behind Old Bus Stand, Jalgaon, Maharashtra 425001', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Prakash Talkies', 'Pachora', 'Station Road, Pachora, Jalgaon district, Maharashtra 424201', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Raj Chitra Mandir', 'Chalisgaon', 'Hans Theatre Road, Bhoras Budruk, Chalisgaon, Jalgaon district, Maharashtra 424101', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Asha Talkies', 'Chopda', 'Maharashtra State Highway, Panchsheel Nagar, Chopda, Jalgaon district, Maharashtra 425107', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Hans Chitra Mandir', 'Chalisgaon', 'Hans Theatre Road, Bhoras Budruk, Chalisgaon, Jalgaon district, Maharashtra 424101', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'possible_alias_or_neighbouring_venue_check'),
  ('Jalgaon', 'Shalimar Talkies', 'Jamner', 'Anant Wadi, Jamner, Jalgaon district, Maharashtra 424206', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Kamal Cinema', 'Amalner', 'Amalner Road, Amalner, Jalgaon district, Maharashtra 425401', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Metro Cinema', 'Jalgaon city', 'Tourist Complex, Pratap Nagar, Jalgaon, Maharashtra 425001', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Shalimar Talkies', 'Dharangaon', 'Pashtane-Sonwad Road, Dharangaon, Jalgaon district, Maharashtra 425105', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Hansa Raj Theatre', 'Erandol', 'Main Road, Erandol, Jalgaon district, Maharashtra 425109', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Ullas Talkies', 'Jamner', 'Kapad Galli, Jamner, Jalgaon district, Maharashtra 424206', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Jalgaon', 'Old Kiran Theatre', 'Dharangaon', 'Pashtane-Sonwad Road, Landge Galli, Dharangaon, Jalgaon district, Maharashtra 425105', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_duplicate_check'),
  ('Jalgaon', 'Mohan Talkies (old cinema hall)', 'Jalgaon city', 'Ram Peth, Jalgaon, Maharashtra 425001', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_duplicate_check'),
  ('Jalgaon', 'Old Balaji Talkies', 'Bhusawal', 'Ambedkar Nagar, Bhusawal, Jalgaon district, Maharashtra 425201', 'https://www.justdial.com/Jalgaon/Cinema-Halls/nct-10099752', NULL::integer, false, 'historical_or_duplicate_check'),
  ('Jalna', 'Cinema hall lead — name unconfirmed', 'Ambad', 'Ambad, Jalna district, Maharashtra; exact venue name/address not verified', 'https://www.justdial.com/Jalna/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_research_lead'),
  ('Jalna', 'Cinema hall lead — name unconfirmed', 'Partur', 'Partur, Jalna district, Maharashtra; exact venue name/address not verified', 'https://www.justdial.com/Jalna/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_research_lead')
)
SELECT district, venue_name, town_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, town_or_taluka, venue_name;
