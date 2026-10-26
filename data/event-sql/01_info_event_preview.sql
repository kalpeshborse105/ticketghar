-- ============================================================================
-- MahaTicket — INFO event candidates PREVIEW (read-only)
-- ============================================================================
-- Same pattern as theater-sql BMS previews: SELECT only, no writes.
-- Replace EXAMPLE rows with owner-approved titles/descriptions/dates.
-- Do NOT paste BookMyShow scraped inventory here.
-- ============================================================================

WITH candidates (
  venue_name, venue_city, venue_id_optional,
  title, title_mr, category, category_mr, language,
  description, description_mr,
  poster_url,
  session_start_ist, session_end_ist,
  source_note
) AS (
  VALUES
  -- EXAMPLE ONLY — replace before any insert batch
  ('Jamshed Bhabha Theatre (NCPA)', 'Mumbai', 476,
   'EXAMPLE Info Title — Replace Me', 'उदाहरण माहिती शीर्षक',
   'cultural', 'सांस्कृतिक', 'English',
   'Informational listing only. Not for sale until organizer deal + status=published + seats.',
   'फक्त माहिती. विक्री नाही जोपर्यंत करार + published + आसने.',
   'https://www.ncpamumbai.com/wp-content/uploads/placeholder-poster.jpg',
   '2026-12-01 19:30:00+05:30'::timestamptz,
   '2026-12-01 22:00:00+05:30'::timestamptz,
   'example_row_not_authorized_for_sale'),

  ('Tata Theatre (NCPA)', 'Mumbai', 477,
   'EXAMPLE Second Info Title — Replace Me', 'दुसरे उदाहरण',
   'plays', 'नाटक', 'Marathi',
   'Draft catalogue card for organizer demos. No tickets.',
   'ऑर्गनायझर डेमोसाठी मसुदा. तिकिटे नाहीत.',
   'https://www.ncpamumbai.com/wp-content/uploads/placeholder-poster.jpg',
   '2026-12-05 16:00:00+05:30'::timestamptz,
   '2026-12-05 18:30:00+05:30'::timestamptz,
   'example_row_not_authorized_for_sale')
)
SELECT
  c.venue_name,
  c.venue_city,
  c.venue_id_optional,
  v.id AS matched_venue_id,
  v.verification_status AS venue_verification,
  CASE
    WHEN v.id IS NULL THEN 'VENUE_MISSING'
    WHEN c.venue_id_optional IS NOT NULL AND v.id IS DISTINCT FROM c.venue_id_optional
      THEN 'VENUE_ID_MISMATCH'
    ELSE 'VENUE_OK'
  END AS venue_match_status,
  c.title,
  c.category,
  c.session_start_ist,
  c.session_end_ist,
  c.source_note,
  'draft' AS intended_event_status,
  'no_ticket_types' AS intended_commerce
FROM candidates c
LEFT JOIN public.venues v
  ON (
    c.venue_id_optional IS NOT NULL AND v.id = c.venue_id_optional
  )
  OR (
    c.venue_id_optional IS NULL
    AND lower(trim(v.name)) = lower(trim(c.venue_name))
    AND lower(trim(v.city)) = lower(trim(c.venue_city))
  )
ORDER BY c.venue_city, c.venue_name, c.session_start_ist;
