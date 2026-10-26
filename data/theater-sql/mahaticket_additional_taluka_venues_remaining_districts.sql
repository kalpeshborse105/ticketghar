-- MahaTicket remaining-district cinema and event venue research candidates
-- Districts: Sindhudurg, Solapur, Thane, Wardha, Washim
-- READ-ONLY SQL preview: no INSERT, UPDATE, DELETE, or schema changes.
-- This is the final alphabetical district batch, but not a guarantee every village venue in Maharashtra has been found.
-- Some records were already mentioned in prior city-level batches and are explicitly flagged for DB deduplication.
-- Some taluka entries are location-level research leads only; they are NOT confirmed named venues.
-- Verify exact venue identity, current operation, district mapping, address, and duplicate/alias status before import.
-- Do not infer seat capacity, seat layout, events, sessions, inventory, or ticket-sales authorization.

WITH candidate_venues (
 district, venue_name, town_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Sindhudurg', 'Laxmi Chitramandir', 'Kankavli', 'Achara Road, near Police Station, Kalmath, Kankavli, Sindhudurg, Maharashtra 416602', 'https://in.bookmyshow.com/sindhudurg/cinemas', NULL::integer, false, 'check_existing_db_existing_city_candidate'),
  ('Sindhudurg', 'Aaradhya Cinema', 'Zarap / Kudal', 'Zarap Zero Point, near Nemale Bridge, Zarap, Sindhudurg, Maharashtra 416510', 'https://in.bookmyshow.com/sindhudurg/cinemas', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Sindhudurg', 'Siddhi Cinema', 'Oros', 'Opposite RTO Office, Oros, Sindhudurg, Maharashtra 416812', 'https://in.bookmyshow.com/sindhudurg/cinemas', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Sindhudurg', 'Starlight Cinema', 'Devgad', 'Devgad Kelkar College Road, Devgad, Sindhudurg, Maharashtra 416613', 'https://cinematimes.in/movies-running-in-sindhudurg/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Sindhudurg', 'Matsyagandha Samarth Theatre', 'Malvan / Devbag', 'Near Devbag Gram Panchayat, Devbag, Malvan, Sindhudurg, Maharashtra 416606', 'https://cinematimes.in/movies-running-in-sindhudurg/', NULL::integer, false, 'possible_event_theatre_verify'),
  ('Sindhudurg', 'Arya Nova Cinemaz', 'Sawantwadi / Nirukhe', 'Vengurla-Belgaum Road, Kolgaon/Nirukhe area, Sawantwadi, Sindhudurg, Maharashtra 416510', 'https://cinematimes.in/movies-running-in-sindhudurg/', NULL::integer, false, 'check_existing_db_and_exact_address'),
  ('Sindhudurg', 'Chhotu Maharaj Cinema', 'Sindhudurg listing — exact town check', 'District directory result; confirm physical address before import', 'https://www.justdial.com/Sindhudurg/Cinema-Halls-in-Kankavli/nct-10099752', NULL::integer, false, 'low_confidence_location_check'),
  ('Solapur', 'Rangprabha Talkies', 'Mangalwedha', 'Gate No. 24, Mangalwedha Main Road, near Bharat Talkies, Mangalwedha, Solapur, Maharashtra 413305', 'https://in.bookmyshow.com/solapur/cinemas', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Solapur', 'Shiv Parvati Cinema', 'Sangola', 'Miraj-Pandharpur Road, Godasewadi, Sangola, Solapur, Maharashtra 413307', 'https://cinematimes.in/movies-running-in-solapur/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Solapur', 'SN Cinema', 'Karkamb', 'Tembhurni-Karkamb-Pandharpur Road, Karkamb, Solapur, Maharashtra 413302', 'https://cinematimes.in/movies-running-in-solapur/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Solapur', 'Chatrapati Cinema', 'Barshi', 'Barshi-Latur Highway, Jawali Plots, Barshi, Solapur, Maharashtra 413401', 'https://cinematimes.in/movies-running-in-solapur/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Solapur', 'Padma Cinema', 'Solapur city', '168B, Shaniwar Peth, Ganesh Peth, Sakhar Peth, Solapur, Maharashtra 413005', 'https://in.bookmyshow.com/solapur/venue-list', NULL::integer, false, 'check_existing_db_existing_city_candidate'),
  ('Solapur', 'Bhagwat Uma Mandir', 'Solapur city', '8, Old Police Line, Murarji Peth, Solapur, Maharashtra 413001', 'https://in.bookmyshow.com/solapur/venue-list', NULL::integer, false, 'check_existing_db_existing_city_candidate'),
  ('Solapur', 'Local cinema lead — exact name unconfirmed', 'Pandharpur', 'Pandharpur, Solapur district, Maharashtra 413304; exact venue not verified', 'https://solapur.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Thane', 'Gopi Cinema', 'Dombivli West', 'Nana Shankarshet Road, Dombivli West, Thane district, Maharashtra 421202', 'https://davp.nic.in/ufo.pdf', NULL::integer, false, 'verify_current_status_and_existing_db'),
  ('Thane', 'Tilak Talkies', 'Dombivli East', 'Tilak Complex, opposite railway station, Dombivli East, Thane district, Maharashtra 421201', 'https://davp.nic.in/ufo.pdf', NULL::integer, false, 'verify_current_status_and_existing_db'),
  ('Thane', 'Sagar Cinema', 'Kalyan', 'Kalyan, Thane district, Maharashtra 421301', 'https://davp.nic.in/ufo.pdf', NULL::integer, false, 'verify_current_status_and_existing_db'),
  ('Thane', 'Abhishek Cinema', 'Kudus, Wada taluka', 'Kudus, Wada taluka, Thane district, Maharashtra', 'https://davp.nic.in/ufo.pdf', NULL::integer, false, 'verify_current_status_and_existing_db'),
  ('Thane', 'Shree Ganesh Talkies', 'Thane West', 'Edulji Road, opposite Charai Telephone Exchange, Thane West, Maharashtra 400601', 'https://davp.nic.in/ufo.pdf', NULL::integer, false, 'verify_current_status_and_existing_db'),
  ('Thane', 'Vandana Cinema', 'Thane West', 'L.B.S. Marg, Thane West, Maharashtra 400602', 'https://davp.nic.in/ufo.pdf', NULL::integer, false, 'verify_current_status_and_existing_db'),
  ('Thane', 'Ashok Anil Multiplex / Miraj Cinemas', 'Ulhasnagar', 'Kalyan-Ambernath Road, Ulhasnagar, Thane district, Maharashtra 421002', 'https://cinematimes.in/movies-running-in-thane/', NULL::integer, false, 'check_existing_db_existing_city_candidate'),
  ('Thane', 'SM5 Cinema', 'Kalyan', 'Near Agra Road, Kalyan, Thane district, Maharashtra 421301', 'https://cinematimes.in/movies-running-in-thane/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Thane', 'Vaishali Cinema', 'Badlapur', 'Badlapur Station Road, Sarvodaynagar, Manjarli, Badlapur, Thane district, Maharashtra 421503', 'https://cinematimes.in/movies-running-in-thane/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Thane', 'Local cinema lead — exact name unconfirmed', 'Murbad', 'Murbad, Thane district, Maharashtra 421401; exact venue not verified', 'https://thane.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Wardha', 'Laxmi Talkies', 'Hinganghat', 'Dag Borkhedi, Hinganghat, Wardha district, Maharashtra 442301', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Wardha', 'Empress Cinema', 'Pulgaon', 'Gandhi Nagar, Pulgaon, Wardha district, Maharashtra 442302', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Wardha', 'Raghav Cineplex', 'Talegaon (Arvi area)', 'Ramdara, Ward No. 1, Talegaon, Wardha district, Maharashtra', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'verify_town_and_existing_db'),
  ('Wardha', 'New Laxmi Talkies', 'Deoli', 'Kedar Layout, Deoli, Wardha district, Maharashtra 442101', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Wardha', 'Kranti Cinemas', 'Pulgaon', 'Sawant Wada, Pulgaon, Wardha district, Maharashtra 442303', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Wardha', 'Tirupati Talkies', 'Arvi', 'State Highway 241, Arvi, Wardha district, Maharashtra 442201', 'https://cinematimes.in/movies-running-in-wardha/', NULL::integer, false, 'check_existing_db_and_operation'),
  ('Washim', 'H2M Movieplex', 'Washim town', 'Upper Ground Floor, B-Wing, Patni Commercial Complex, Washim, Maharashtra 444505', 'https://www.district.in/movies/h2m-movieplex-washim-CD1102408', NULL::integer, false, 'check_existing_db_existing_city_candidate'),
  ('Washim', 'Local cinema lead — exact name unconfirmed', 'Karanja Lad', 'Karanja Lad, Washim district, Maharashtra 444105; exact venue not verified', 'https://washim.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Washim', 'Local cinema lead — exact name unconfirmed', 'Mangrulpir', 'Mangrulpir, Washim district, Maharashtra 444403; exact venue not verified', 'https://washim.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Washim', 'Local cinema lead — exact name unconfirmed', 'Risod', 'Risod, Washim district, Maharashtra 444506; exact venue not verified', 'https://washim.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Washim', 'Local cinema lead — exact name unconfirmed', 'Malegaon', 'Malegaon, Washim district, Maharashtra 444503; exact venue not verified', 'https://washim.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead')
)
SELECT district, venue_name, town_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, town_or_taluka, venue_name;
