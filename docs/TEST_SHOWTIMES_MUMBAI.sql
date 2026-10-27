-- MahaTicket — move a few Mumbai published shows to "tonight" for gate/scan testing.
-- PREVIEW first. Run UPDATE only after you confirm the event list.
-- Times are IST (Asia/Kolkata). Does NOT invent new sellable catalog — only shifts existing sessions.

-- 1) PREVIEW: Mumbai published events + current session times
SELECT
  e.id AS event_id,
  e.title_mr,
  e.title,
  e.status,
  v.name AS venue,
  v.city,
  s.id AS session_id,
  s.session_start_time AT TIME ZONE 'Asia/Kolkata' AS show_ist,
  s.status AS session_status
FROM events e
JOIN event_sessions s ON s.event_id = e.id
LEFT JOIN venues v ON v.id = e.venue_id
WHERE e.status = 'published'
  AND s.status IS DISTINCT FROM 'cancelled'
  AND (
    lower(coalesce(v.city, '')) LIKE '%mumbai%'
    OR lower(coalesce(v.city, '')) LIKE '%bombay%'
  )
ORDER BY s.session_start_time
LIMIT 40;

-- 2) PREVIEW: which sessions the UPDATE below would touch (top 6 Mumbai published)
WITH pick AS (
  SELECT s.id AS session_id
  FROM events e
  JOIN event_sessions s ON s.event_id = e.id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE e.status = 'published'
    AND s.status IS DISTINCT FROM 'cancelled'
    AND (
      lower(coalesce(v.city, '')) LIKE '%mumbai%'
      OR lower(coalesce(v.city, '')) LIKE '%bombay%'
    )
  ORDER BY s.session_start_time
  LIMIT 6
)
SELECT * FROM pick;

-- 3) APPLY (optional): set those 6 shows to tonight 8:00 / 9:30 / 10:45 PM IST staggered
-- Uncomment to run after preview approval.
/*
BEGIN;

WITH pick AS (
  SELECT s.id AS session_id, row_number() OVER (ORDER BY s.session_start_time) AS rn
  FROM events e
  JOIN event_sessions s ON s.event_id = e.id
  LEFT JOIN venues v ON v.id = e.venue_id
  WHERE e.status = 'published'
    AND s.status IS DISTINCT FROM 'cancelled'
    AND (
      lower(coalesce(v.city, '')) LIKE '%mumbai%'
      OR lower(coalesce(v.city, '')) LIKE '%bombay%'
    )
  ORDER BY s.session_start_time
  LIMIT 6
),
slots AS (
  SELECT
    session_id,
    rn,
    CASE rn
      WHEN 1 THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '20 hours')
      WHEN 2 THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '21 hours 30 minutes')
      WHEN 3 THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '22 hours 45 minutes')
      WHEN 4 THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '20 hours 30 minutes')
      WHEN 5 THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '21 hours')
      ELSE (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '23 hours')
    END AS start_ist
  FROM pick
)
UPDATE event_sessions s
SET
  session_start_time = (slots.start_ist AT TIME ZONE 'Asia/Kolkata'),
  session_end_time = ((slots.start_ist + interval '3 hours') AT TIME ZONE 'Asia/Kolkata')
FROM slots
WHERE s.id = slots.session_id;

COMMIT;
*/
