-- MahaTicket additional taluka-level venue candidates: districts 6-10
-- Districts: Buldhana, Chandrapur, Chhatrapati Sambhajinagar, Dharashiv, Dhule
-- READ-ONLY preview; no INSERT/UPDATE/DELETE.
-- Candidates from directory/ticketing pages; some are ambiguous, duplicate aliases, historical, or need district validation.
-- Prior city-level records intentionally omitted where clearly recognized:
-- Buldhana: ARD Cinemall, Shyam Talkies.
-- Chandrapur: MDR Mall/Miraj, Cinejoy/Old Abhay, Radhakrishna, Rajkala, New Gold Star Brahmapuri, Chhotu Maharaj Rajura.
-- Chhatrapati Sambhajinagar: previously listed city multiplexes excluded; few supported taluka-level candidates found in this pass.
-- Dhule: Jyoti Chitra Mandir excluded.
-- Review any venue marked outside/uncertain district before treating it as a candidate.
-- Never infer capacity, seat map, active status, or organizer authorization from a directory listing.

WITH candidate_venues (
 district, venue_name, town_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Buldhana', 'Shri Hanuman Talkies', 'Malkapur', 'Vishnuwadi, Malkapur, Buldhana district, Maharashtra 443101', 'https://cinematimes.in/movies-running-in-buldhana/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Shri Gajanan Talkies', 'Malkapur', 'Malkapur, Buldhana district, Maharashtra 443101', 'https://www.justdial.com/Buldhana/Cinema-Halls-in-Buldhana-Road-Malkapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Cinemagic Cinema', 'Chikhli', 'Nagpur–Aurangabad Highway, Chikhli, Buldhana district, Maharashtra 443201', 'https://cinematimes.in/movies-running-in-buldhana/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Santosh Chitra Mandir', 'Deulgaon Raja', 'MH SH 176, Ambedkar Nagar, Deulgaon Raja, Buldhana district, Maharashtra 443204', 'https://cinematimes.in/movies-running-in-buldhana/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Gajanan Talkies', 'Khamgaon', 'Gandhi Chowk, Police Station Road, Khamgaon, Buldhana district, Maharashtra 444303', 'https://cinematimes.in/movies-running-in-buldhana/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Anjali Talkies', 'Chikhli', 'DP Road, Survey No. 100, Shivaji Maharaj Chowk, Chikhli, Buldhana district, Maharashtra 443201', 'https://cinematimes.in/movies-running-in-buldhana/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Gitanjali Cinema', 'Deulgaon Raja', 'Chikhli Road, Bhagwan Baba Nagar, Deulgaon Raja, Buldhana district, Maharashtra 443204', 'https://cinematimes.in/movies-running-in-buldhana/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Shree Chitra Mandir', 'Lonar', 'Lonar Road, near bus stand, Lonar, Buldhana district, Maharashtra 443302', 'https://www.justdial.com/Buldhana/Cinema-Halls-in-Buldhana-Road-Malkapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Raja Theatre', 'Mehkar', 'Pentakli Colony, Mehkar, Buldhana district, Maharashtra 443301', 'https://www.justdial.com/Buldhana/Cinema-Halls-in-Mehkar/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Cinemark Multiplex', 'Mehkar', 'Main Road / Pentakli Colony, Mehkar, Buldhana district, Maharashtra 443301', 'https://www.justdial.com/Buldhana/Cinema-Halls-in-Mehkar/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Buldhana', 'Maurya Cinema', 'Sindkhed Raja', 'Sindkhed Raja Road, Sindkhed Raja, Buldhana district, Maharashtra 443203', 'https://www.justdial.com/Buldhana/Cinema-Halls-in-Buldhana-Road-Malkapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chandrapur', 'Satyam Cinemax', 'Warora', 'Hanuman Ward, Yatra Road, Navin Vasti, Warora, Chandrapur district, Maharashtra 442907', 'https://www.justdial.com/Chandrapur/Cinema-Halls-in-Chandur-Chandrapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chandrapur', 'New Naresh Cinema', 'Gadchandur area', 'Gadchandur, Chandrapur district, Maharashtra 442908', 'https://www.justdial.com/Chandrapur/Cinema-Halls-in-Chandur-Chandrapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chandrapur', 'Deepthi Sky Cinex', 'Wani area — district must be checked', 'MIDC Road, Rampura Jatra Road, Wani, Maharashtra 445304', 'https://www.justdial.com/Chandrapur/Cinema-Halls-in-Chandur-Chandrapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chandrapur', 'Sonal Cinemax', 'Babupeth, Chandrapur', 'Babupeth, Chandrapur, Maharashtra 442403', 'https://www.justdial.com/Chandrapur/Cinema-Halls-in-Chandur-Chandrapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chandrapur', 'Venkataramana Cinema Hall', 'SKZR / Sirpur Kagaznagar — outside Maharashtra; exclude pending district check', 'Sirpur Kagaznagar, Telangana 504296', 'https://www.justdial.com/Chandrapur/Cinema-Halls-in-Chandur-Chandrapur/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chhatrapati Sambhajinagar', 'Shree Ganesh Cinema Hall', 'Paithan — unverified lead', 'Paithan, Chhatrapati Sambhajinagar district, Maharashtra', 'https://www.cybo.com/IN/sillod/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Chhatrapati Sambhajinagar', 'Sillod local cinema lead', 'Sillod', 'Sillod, Chhatrapati Sambhajinagar district, Maharashtra 431112', 'https://www.cybo.com/IN/sillod/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Shree Theater', 'Dharashiv (Osmanabad)', 'S.R.T. Colony, Dharashiv, Maharashtra 413501', 'https://yappe.in/maharashtra/osmanabad/shree-thea-dharashiv/180903', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Padmaja E-SQUARE', 'Dharashiv (Osmanabad)', 'Nimbalkar Park, Dharashiv, Maharashtra 413501', 'https://in.bookmyshow.com/cinemas-list/dmae/dharashiv-osmanabad/dmae', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Taj Cinemark', 'Dharashiv (Osmanabad)', 'Solapur Road, near Taj Mahal Masjid, Dharashiv, Maharashtra', 'https://in.bookmyshow.com/cinemas-list/dmae/dharashiv-osmanabad/dmae', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Jawahar Mini Theatre', 'Tuljapur', 'Ghatshil Road, Jijamata Nagar, Tuljapur, Dharashiv district, Maharashtra 413601', 'https://www.cybo.com/IN/tuljapur/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Jawahar Cinema', 'Tuljapur', 'Ghatshil Road, Jijamata Nagar, Tuljapur, Dharashiv district, Maharashtra 413601', 'https://www.cybo.com/IN/tuljapur/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Prithviraj Talkies', 'Kalamb', 'Ambajogai Road, Kalamb, Dharashiv district, Maharashtra 413507', 'https://www.justdial.com/Osmanabad/Cinema-Halls-in-Kalamb/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Bharat Talkies', 'Dharashiv (Osmanabad)', 'NH 211, Indira Colony, Dharashiv, Maharashtra 413501', 'https://www.cybo.com/IN/osmanabad/movie-theaters/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dharashiv', 'Prithviraj Theatre', 'Dharashiv (Osmanabad)', 'Parali Road, Shivaji Chowk, Dharashiv, Maharashtra 413501', 'https://www.justdial.com/Osmanabad/Cinema-Halls-in-Omerga-Osmanabad/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'Ashok Chitramandir', 'Shindkheda', 'Kesharanand Complex, State Highway 11, Shindkheda, Dhule district, Maharashtra 425406', 'https://cinematimes.in/region/dhule/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'PV Cinema', 'Pimpalner, Sakri', 'Pimpalner, Sakri taluka, Dhule district, Maharashtra 424306', 'https://cinematimes.in/region/dhule/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'Alankar Chitramandir', 'Shirpur', 'Nehru Road, Shirpur, Dhule district, Maharashtra 425405', 'https://cinematimes.in/region/dhule/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'Abhishek Chitra Mandir', 'Dondaicha / Shindkheda', 'Gopal Pura Road, Ranipura, Dondaicha, Dhule district, Maharashtra 425408', 'https://cinematimes.in/region/dhule/', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'Bhandari Talkies', 'Shirpur', 'Main Road, Bhoi Lane, Shirpur, Dhule district, Maharashtra 425405', 'https://www.justdial.com/Dhule/Movie-Theaters/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'Sagar Cinema Theatre', 'Pimpalner, Sakri', 'Satana Road, Pimpalner, Dhule district, Maharashtra 424306', 'https://www.justdial.com/Dhule/Movie-Theaters/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check'),
  ('Dhule', 'Ashok Cineplex', 'Shindkheda', 'State Highway 11, Shindkheda, Dhule district, Maharashtra 425406', 'https://www.justdial.com/Dhule/Movie-Theaters/nct-10099752', NULL::integer, false, 'needs_dedup_and_operation_check')
)
SELECT district, venue_name, town_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, town_or_taluka, venue_name;
