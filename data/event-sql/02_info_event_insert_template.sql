-- ============================================================================
-- MahaTicket — INFO event INSERT template (draft / not for sale)
-- ============================================================================
-- Pattern mirrors data/theater-sql/mahaticket_verified_venue_catalogue.sql
--
-- Creates:
--   • events with status = 'draft'   ← public API ignores (only 'published')
--   • optional event_sessions for planned date/time (info / admin)
-- Does NOT create:
--   • ticket_types, seat_inventory, seats, orders
--
-- REVIEW OUTPUT then choose exactly one ending:
--   ROLLBACK;   (default — safe)
--   COMMIT;     (only after you approve the SELECT results)
--
-- Legal posture: informational catalogue only until you enable sale
-- (see 03_enable_sale_checklist.sql).
-- ============================================================================

BEGIN;

-- 0) Require info organizer (run 00_… and COMMIT first, or use an existing org id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizers LIMIT 1) THEN
    RAISE EXCEPTION 'No organizers — restore organizers or run 00_platform_info_organizer.sql';
  END IF;
  IF (SELECT COUNT(*) FROM public.venues) < 1 THEN
    RAISE EXCEPTION 'No venues — import theater catalogue first';
  END IF;
END $$;

-- Prefer dedicated info organizer; fall back to lowest id if not created yet
WITH org AS (
  SELECT id FROM (
    SELECT id, 0 AS pri FROM public.organizers
    WHERE lower(email) = 'catalogue-info@mahaticket.local'
    UNION ALL
    SELECT id, 1 AS pri FROM public.organizers
  ) ranked
  ORDER BY pri, id
  LIMIT 1
),
candidates (
  venue_name, venue_city, venue_id_optional,
  title, title_mr, slug, category, category_mr, language,
  description, description_mr, poster_url,
  session_start_ist, session_end_ist,
  source_note
) AS (
  VALUES
  -- ========== REPLACE THESE EXAMPLE ROWS AFTER REVIEW ==========
  ('Jamshed Bhabha Theatre (NCPA)', 'Mumbai', 476,
   'EXAMPLE Info Title — Replace Me', 'उदाहरण माहिती शीर्षक',
   'example-info-jbt-replace-me',
   'cultural', 'सांस्कृतिक', 'English',
   'Informational listing only. Not for sale until deal + published + seats.',
   'फक्त माहिती. करार + published + आसने झाल्याशिवाय विक्री नाही.',
   'https://placehold.co/600x900/png?text=Info+Only',
   '2026-12-01 19:30:00+05:30'::timestamptz,
   '2026-12-01 22:00:00+05:30'::timestamptz,
   'example_row_not_authorized_for_sale'),

  ('Tata Theatre (NCPA)', 'Mumbai', 477,
   'EXAMPLE Second Info Title — Replace Me', 'दुसरे उदाहरण',
   'example-info-tata-replace-me',
   'plays', 'नाटक', 'Marathi',
   'Draft catalogue card. No tickets. No inventory.',
   'मसुदा कार्ड. तिकिटे / इन्व्हेंटरी नाही.',
   'https://placehold.co/600x900/png?text=Info+Only',
   '2026-12-05 16:00:00+05:30'::timestamptz,
   '2026-12-05 18:30:00+05:30'::timestamptz,
   'example_row_not_authorized_for_sale')
  -- ========== ADD MORE VALUE ROWS (same columns) AS NEEDED ==========
),
resolved AS (
  SELECT
    c.*,
    v.id AS venue_id,
    (SELECT id FROM org) AS organizer_id
  FROM candidates c
  JOIN public.venues v
    ON (
      c.venue_id_optional IS NOT NULL AND v.id = c.venue_id_optional
    )
    OR (
      c.venue_id_optional IS NULL
      AND lower(trim(v.name)) = lower(trim(c.venue_name))
      AND lower(trim(v.city)) = lower(trim(c.venue_city))
    )
),
ins_events AS (
  INSERT INTO public.events (
    organizer_id, venue_id,
    title, title_mr, slug,
    category, category_mr, language,
    description, description_mr, poster_url,
    status, featured, tag
  )
  SELECT
    r.organizer_id, r.venue_id,
    r.title, r.title_mr, r.slug,
    r.category, r.category_mr, r.language,
    r.description, r.description_mr, r.poster_url,
    'draft',              -- DISABLED / not for sale
    0,
    'info_only'           -- easy admin filter
  FROM resolved r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.slug = r.slug
  )
  RETURNING id, slug, venue_id, status
),
ins_sessions AS (
  INSERT INTO public.event_sessions (
    event_id, session_start_time, session_end_time, status
  )
  SELECT
    e.id,
    r.session_start_ist,
    r.session_end_ist,
    'active'              -- time exists for info; event.draft still blocks public sale
  FROM resolved r
  JOIN ins_events e ON e.slug = r.slug
  WHERE r.session_start_ist IS NOT NULL
    AND r.session_end_ist IS NOT NULL
    AND r.session_start_ist < r.session_end_ist
  RETURNING id, event_id, session_start_time, session_end_time, status
)
SELECT 'event' AS kind, id::text, slug AS ref, status
FROM ins_events
UNION ALL
SELECT 'session', id::text, event_id::text, status
FROM ins_sessions;

-- Review what would remain if you COMMIT:
SELECT e.id, e.slug, e.title, e.status, e.tag, e.venue_id, v.name AS venue,
       s.id AS session_id, s.session_start_time, s.session_end_time
FROM public.events e
JOIN public.venues v ON v.id = e.venue_id
LEFT JOIN public.event_sessions s ON s.event_id = e.id
WHERE e.tag = 'info_only' OR e.status = 'draft'
ORDER BY e.id, s.session_start_time;

-- Confirm commerce still empty for these drafts:
SELECT
  (SELECT COUNT(*) FROM public.ticket_types tt
     JOIN public.events e ON e.id = tt.event_id WHERE e.status = 'draft') AS draft_ticket_types,
  (SELECT COUNT(*) FROM public.seat_inventory) AS seat_inventory_rows,
  (SELECT COUNT(*) FROM public.orders) AS orders;

-- Default safe ending:
ROLLBACK;
-- COMMIT;
