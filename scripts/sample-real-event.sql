-- MahaTicket — SAMPLE seed (edit IDs / dates / poster URLs before running)
-- Run in Supabase SQL editor AFTER venues/organizers exist.
-- Do NOT invent showtimes: replace session times with real published show times.
-- Posters: upload via Admin → Events (preferred) OR paste YOUR hosted URLs (not scraped BMS assets).

BEGIN;

-- 0) Find / create venue (example: Dhule cultural hall — adjust to your real row)
-- SELECT id, name, name_mr, city FROM venues WHERE name_mr ILIKE '%धुळे%' OR city ILIKE '%Dhule%';

-- Assume organizer id=1 and venue id = :venue_id (replace below)
-- Example uses venue_id = 1 — CHANGE THIS.

WITH v AS (
  SELECT id AS venue_id FROM venues ORDER BY id ASC LIMIT 1
),
o AS (
  SELECT id AS organizer_id FROM organizers ORDER BY id ASC LIMIT 1
),
ins_event AS (
  INSERT INTO events (
    title, title_mr, slug, category, category_mr,
    organizer_id, venue_id, language, age_guidance, duration_minutes,
    description, description_mr,
    poster_url, banner_url, gallery_urls,
    convenience_fee_value, status, featured, tag, created_at
  )
  SELECT
    'Sample Marathi Natak',
    'नमुना मराठी नाटक',
    'sample-marathi-natak-' || floor(extract(epoch from now()))::text,
    'plays',
    'नाटक',
    o.organizer_id,
    v.venue_id,
    'Marathi',
    'U',
    150,
    'Replace with official synopsis.',
    'अधिकृत कथानक येथे लिहा.',
    -- Prefer admin upload URL from Supabase event-media bucket:
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/event-media/events/draft/cover-REPLACE.jpg',
    NULL,
    '["https://YOUR_PROJECT.supabase.co/storage/v1/object/public/event-media/events/draft/gallery-1.jpg"]'::text,
    3000,
    'published',
    0,
    'तिकिटे उपलब्ध',
    now()
  FROM v, o
  RETURNING id
),
ins_session AS (
  INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
  SELECT
    id,
    -- FUTURE show only (IST). Change to real date/time.
    (timestamp '2026-11-15 18:00:00' AT TIME ZONE 'Asia/Kolkata'),
    (timestamp '2026-11-15 20:30:00' AT TIME ZONE 'Asia/Kolkata'),
    'active'
  FROM ins_event
  RETURNING id, event_id
)
SELECT e.id AS event_id, s.id AS session_id
FROM ins_event e
JOIN ins_session s ON s.event_id = e.id;

-- Optional: mark all past active sessions completed (safe hygiene)
UPDATE event_sessions
SET status = 'completed'
WHERE status = 'active'
  AND (
    (session_end_time IS NOT NULL AND session_end_time < now())
    OR session_start_time < now() - interval '30 minutes'
  );

COMMIT;

-- After insert:
-- 1) Admin → Theatre designer: attach real seat layout for that venue/session
-- 2) Admin → Events: upload featured + gallery images (replaces placeholder URLs)
-- 3) Verify web + Android list only shows FUTURE bookable sessions
;