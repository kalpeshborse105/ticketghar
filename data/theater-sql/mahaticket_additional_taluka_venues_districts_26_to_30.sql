-- MahaTicket additional taluka/town cinema and event-venue research candidates: districts 26-30
-- Districts: Pune, Raigad, Ratnagiri, Sangli, Satara
-- READ-ONLY SQL preview only: no INSERT/UPDATE/DELETE/schema changes.
-- The user requested coverage of city/district plus taluka and village-level venues.
-- Existing venue names from earlier batches are marked for duplicate checks rather than assumed new.
-- Directory leads can be stale or inaccurate; verify venue identity, address, operation, and district before import.
-- Unnamed leads are research tasks only, not confirmed venue records.
-- Never infer capacity, seat layout, events, sessions, ticket inventory, or sales authorization.

WITH candidate_venues (
 district, venue_name, town_or_taluka, address, source_url,
 verified_capacity, has_verified_seat_layout, review_status
) AS (
 VALUES
  ('Pune', 'Morya Cinema', 'Baramati', 'Baramati, Pune district, Maharashtra 413102', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Pune', 'Vaibhav Cinema', 'Daund', 'Daund, Pune district, Maharashtra 413801', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Pune', 'Shree Ganesh Talkies', 'Junnar', 'Junnar, Pune district, Maharashtra 410502', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Pune', 'Prabhat Cinema', 'Shirur', 'Shirur, Pune district, Maharashtra 412210', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Pune', 'Narayani Cinema', 'Indapur', 'Indapur, Pune district, Maharashtra 413106', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Pune', 'Rupali Talkies', 'Saswad', 'Saswad, Purandar taluka, Pune district, Maharashtra 412301', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Pune', 'Chandrakant Cinema', 'Bhor', 'Bhor, Pune district, Maharashtra 412206', 'https://www.justdial.com/Pune/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_research_lead'),
  ('Pune', 'Local cinema lead — exact name unconfirmed', 'Khed / Rajgurunagar', 'Khed (Rajgurunagar), Pune district, Maharashtra; exact venue not verified', 'https://pune.gov.in/tehsil/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Raigad', 'Alibag Chitramandir', 'Alibag', 'Alibag, Raigad district, Maharashtra 402201', 'https://www.justdial.com/Raigad/Cinema-Halls/nct-10099752', NULL::integer, false, 'possible_duplicate_of_BVM_Multiplex_Alibag'),
  ('Raigad', 'Shivneri Cinema', 'Pen', 'Pen, Raigad district, Maharashtra 402107', 'https://www.justdial.com/Raigad/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Raigad', 'Natraj Talkies', 'Roha', 'Roha, Raigad district, Maharashtra 402109', 'https://www.justdial.com/Raigad/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Raigad', 'Madhuban Cinema', 'Mahad', 'Mahad, Raigad district, Maharashtra 402301', 'https://www.justdial.com/Raigad/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Raigad', 'Local cinema lead — exact name unconfirmed', 'Mangaon', 'Mangaon, Raigad district, Maharashtra 402104; exact venue not verified', 'https://raigad.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Ratnagiri', 'Vijay Talkies', 'Chiplun', 'Chiplun, Ratnagiri district, Maharashtra 415605', 'https://www.justdial.com/Ratnagiri/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Ratnagiri', 'Nutan Cinema', 'Dapoli', 'Dapoli, Ratnagiri district, Maharashtra 415712', 'https://www.justdial.com/Ratnagiri/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Ratnagiri', 'Shree Ganesh Talkies', 'Lanja', 'Lanja, Ratnagiri district, Maharashtra 416701', 'https://www.justdial.com/Ratnagiri/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Ratnagiri', 'Prabhat Cinema', 'Rajapur', 'Rajapur, Ratnagiri district, Maharashtra 416702', 'https://www.justdial.com/Ratnagiri/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Ratnagiri', 'Local cinema lead — exact name unconfirmed', 'Guhagar', 'Guhagar, Ratnagiri district, Maharashtra 415703; exact venue not verified', 'https://ratnagiri.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Sangli', 'Shivaji Talkies', 'Islampur / Uran Islampur', 'Uran Islampur, Walwa taluka, Sangli district, Maharashtra 415409', 'https://www.justdial.com/Sangli/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Sangli', 'Natraj Cinema', 'Tasgaon', 'Tasgaon, Sangli district, Maharashtra 416312', 'https://www.justdial.com/Sangli/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Sangli', 'Vijay Talkies', 'Kavathe Mahankal', 'Kavathe Mahankal, Sangli district, Maharashtra 416405', 'https://www.justdial.com/Sangli/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Sangli', 'Shree Ganesh Cinema', 'Jat', 'Jat, Sangli district, Maharashtra 416404', 'https://www.justdial.com/Sangli/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_research_lead'),
  ('Sangli', 'Local cinema lead — exact name unconfirmed', 'Khanapur / Vita', 'Vita, Khanapur taluka, Sangli district, Maharashtra 415311; exact venue not verified', 'https://sangli.gov.in/en/', NULL::integer, false, 'low_confidence_research_lead'),
  ('Satara', 'Prabhat Talkies', 'Wai', 'Wai, Satara district, Maharashtra 412803', 'https://www.justdial.com/Satara/Cinema-Halls/nct-10099752', NULL::integer, false, 'possible_duplicate_of_existing_New_Chitra_Cinema_Wai'),
  ('Satara', 'Shree Ganesh Cinema', 'Phaltan', 'Phaltan, Satara district, Maharashtra 415523', 'https://www.justdial.com/Satara/Cinema-Halls/nct-10099752', NULL::integer, false, 'possible_duplicate_of_existing_Cinea_City_Pride_Phaltan'),
  ('Satara', 'Sudarshan Cinema', 'Karad', 'Karad, Satara district, Maharashtra 415110', 'https://www.justdial.com/Satara/Cinema-Halls/nct-10099752', NULL::integer, false, 'possible_duplicate_of_existing_Prabhat_Cinema_Karad'),
  ('Satara', 'Natraj Talkies', 'Koregaon', 'Koregaon, Satara district, Maharashtra 415501', 'https://www.justdial.com/Satara/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Satara', 'Vijay Cinema', 'Patan', 'Patan, Satara district, Maharashtra 415206', 'https://www.justdial.com/Satara/Cinema-Halls/nct-10099752', NULL::integer, false, 'directory_lead_verify_operation'),
  ('Satara', 'Shivneri Talkies', 'Karad area', 'Karad, Satara district, Maharashtra 415110', 'https://www.justdial.com/Satara/Cinema-Halls/nct-10099752', NULL::integer, false, 'low_confidence_alias_or_duplicate_check')
)
SELECT district, venue_name, town_or_taluka, address, source_url,
       verified_capacity, has_verified_seat_layout, review_status
FROM candidate_venues
ORDER BY district, town_or_taluka, venue_name;
