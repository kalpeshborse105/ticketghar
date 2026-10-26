-- =============================================================================
-- MahaTicket DATA CLEANUP PREVIEW
-- Generated: 2026-10-26
-- Database: hosted Supabase (treat as PRODUCTION unless owner confirms staging)
--
-- !!! DO NOT EXECUTE UNTIL EXPLICIT OWNER APPROVAL !!!
-- This file intentionally mixes READ-ONLY preview queries with OPTIONAL mutations
-- wrapped in comments / gated by a transaction you must unlock.
--
-- Forbidden in this cleanup: DELETE / TRUNCATE / DROP / CASCADE / blanket UPDATEs
-- Never touch: users, orders, tickets, ticket_scans, settlements, audit_logs,
--              payments fields, reviews content deletion
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) BEFORE COUNTS (run first; record results)
-- -----------------------------------------------------------------------------
SELECT 'venues' AS entity, COUNT(*)::int AS n FROM venues
UNION ALL SELECT 'events', COUNT(*)::int FROM events
UNION ALL SELECT 'events_published', COUNT(*)::int FROM events WHERE status = 'published'
UNION ALL SELECT 'events_unpublished', COUNT(*)::int FROM events WHERE status = 'unpublished'
UNION ALL SELECT 'events_completed', COUNT(*)::int FROM events WHERE status = 'completed'
UNION ALL SELECT 'orders', COUNT(*)::int FROM orders
UNION ALL SELECT 'tickets', COUNT(*)::int FROM tickets
UNION ALL SELECT 'ticket_scans', COUNT(*)::int FROM ticket_scans
UNION ALL SELECT 'event_reviews', COUNT(*)::int FROM event_reviews
UNION ALL SELECT 'settlements', COUNT(*)::int FROM settlements;

-- -----------------------------------------------------------------------------
-- 1) PREVIEW — soft-unpublish candidates (strict: zero deps)
-- Expected as of 2026-10-26 audit: event id 95 only (verify again before apply)
-- -----------------------------------------------------------------------------
SELECT
  e.id,
  e.title,
  e.status AS current_status,
  (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders,
  (SELECT COUNT(*)::int FROM tickets t
     JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS tickets,
  (SELECT COUNT(*)::int FROM ticket_scans ts
     JOIN tickets t ON t.id = ts.ticket_id
     JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS scans,
  (SELECT COUNT(*)::int FROM event_reviews r WHERE r.event_id = e.id) AS reviews,
  (SELECT COUNT(*)::int FROM event_sessions s
     WHERE s.event_id = e.id AND s.session_start_time > NOW()) AS future_sessions
FROM events e
WHERE e.status = 'published'
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
  AND NOT EXISTS (
        SELECT 1 FROM tickets t
        JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
      )
  AND NOT EXISTS (
        SELECT 1 FROM ticket_scans ts
        JOIN tickets t ON t.id = ts.ticket_id
        JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
      )
  AND NOT EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e.id)
  AND NOT EXISTS (
        SELECT 1 FROM event_sessions s
        WHERE s.event_id = e.id AND s.session_start_time > NOW()
      )
ORDER BY e.id;

-- Capture rollback snapshot for candidate rows (run and SAVE the result set)
SELECT e.id, e.title, e.status AS original_status
FROM events e
WHERE e.id IN (
  SELECT e2.id
  FROM events e2
  WHERE e2.status = 'published'
    AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e2.id)
    AND NOT EXISTS (
          SELECT 1 FROM tickets t
          JOIN orders o ON o.id = t.order_id WHERE o.event_id = e2.id
        )
    AND NOT EXISTS (
          SELECT 1 FROM ticket_scans ts
          JOIN tickets t ON t.id = ts.ticket_id
          JOIN orders o ON o.id = t.order_id WHERE o.event_id = e2.id
        )
    AND NOT EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e2.id)
    AND NOT EXISTS (
          SELECT 1 FROM event_sessions s
          WHERE s.event_id = e2.id AND s.session_start_time > NOW()
        )
);

-- -----------------------------------------------------------------------------
-- 2) PREVIEW — historical published events WITH orders (PROTECT — no unpublish)
-- Optional later: mark status = 'completed' (lifecycle), never delete
-- -----------------------------------------------------------------------------
SELECT e.id, e.title, e.status,
       (SELECT COUNT(*)::int FROM orders o WHERE o.event_id = e.id) AS orders,
       (SELECT COUNT(*)::int FROM tickets t
          JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id) AS tickets
FROM events e
WHERE e.status = 'published'
  AND EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
  AND NOT EXISTS (
        SELECT 1 FROM event_sessions s
        WHERE s.event_id = e.id AND s.session_start_time > NOW()
      )
ORDER BY e.id;

-- -----------------------------------------------------------------------------
-- 3) PREVIEW — already unpublished (prior session); for awareness only
-- -----------------------------------------------------------------------------
SELECT id, title, status
FROM events
WHERE status = 'unpublished'
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 4) PREVIEW — venue fuzzy review (NO MERGE/DELETE in this file)
-- -----------------------------------------------------------------------------
-- Exact city+name duplicates (expect 0):
SELECT
  lower(regexp_replace(name, '\s+', ' ', 'g')) AS norm_name,
  lower(regexp_replace(city, '\s+', ' ', 'g')) AS norm_city,
  COUNT(*)::int AS n,
  array_agg(id ORDER BY id) AS ids
FROM venues
GROUP BY 1, 2
HAVING COUNT(*) > 1;

-- Manual review pairs (from audit heuristic):
--   venues.id IN (2, 12)  -- Dinanath Mangeshkar (Mumbai vs Vile Parle)
--   venues.id IN (3, 53)  -- Yashwantrao Chavan Pune spelling variants

SELECT id, name, name_mr, city, address, total_capacity, verification_status
FROM venues
WHERE id IN (2, 12, 3, 53)
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 5) OPTIONAL MUTATION A — soft-unpublish strict candidates
-- UNCOMMENT ONLY AFTER OWNER APPROVAL.
-- Re-run preview §1 immediately before applying; IDs may have changed.
-- -----------------------------------------------------------------------------
/*
BEGIN;

-- Safety: refuse if any candidate suddenly gained orders/tickets/reviews
CREATE TEMP TABLE _cleanup_candidates AS
SELECT e.id, e.status AS original_status
FROM events e
WHERE e.status = 'published'
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
  AND NOT EXISTS (
        SELECT 1 FROM tickets t
        JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
      )
  AND NOT EXISTS (
        SELECT 1 FROM ticket_scans ts
        JOIN tickets t ON t.id = ts.ticket_id
        JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
      )
  AND NOT EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e.id)
  AND NOT EXISTS (
        SELECT 1 FROM event_sessions s
        WHERE s.event_id = e.id AND s.session_start_time > NOW()
      );

-- Expectation check (adjust if preview shows different count)
-- SELECT COUNT(*) FROM _cleanup_candidates;  -- expect 1 on 2026-10-26

UPDATE events e
SET status = 'unpublished'
FROM _cleanup_candidates c
WHERE e.id = c.id
  AND e.status = 'published'
RETURNING e.id, e.title, e.status, c.original_status;

-- Keep _cleanup_candidates for rollback in same session, or export first:
-- COPY (SELECT * FROM _cleanup_candidates) TO STDOUT WITH CSV HEADER;

-- VERIFY
SELECT status, COUNT(*)::int
FROM events
GROUP BY status
ORDER BY status;

-- COMMIT;   -- only after verify
-- ROLLBACK; -- if anything unexpected
*/

-- -----------------------------------------------------------------------------
-- 6) ROLLBACK for Mutation A (same session if temp table still exists)
-- -----------------------------------------------------------------------------
/*
BEGIN;
UPDATE events e
SET status = c.original_status
FROM _cleanup_candidates c
WHERE e.id = c.id
  AND e.status = 'unpublished'
RETURNING e.id, e.title, e.status, c.original_status;
-- COMMIT;
*/

-- If temp table is gone, restore from captured CSV of original_status, e.g.:
/*
BEGIN;
UPDATE events SET status = 'published' WHERE id = 95 AND status = 'unpublished';
-- COMMIT;
*/

-- -----------------------------------------------------------------------------
-- 7) OPTIONAL MUTATION B — mark sold-out historical shows as completed
-- ONLY if product agrees that 'completed' is the public lifecycle value.
-- Does NOT delete content. Does NOT touch orders/tickets.
-- Preview IDs first; do not blanket-update.
-- -----------------------------------------------------------------------------
/*
-- PREVIEW rows that would change:
SELECT id, title, status
FROM events
WHERE status = 'published'
  AND EXISTS (SELECT 1 FROM orders o WHERE o.event_id = events.id)
  AND NOT EXISTS (
        SELECT 1 FROM event_sessions s
        WHERE s.event_id = events.id AND s.session_start_time > NOW()
      )
ORDER BY id;

-- Example explicit allowlist (REPLACE after owner review):
-- BEGIN;
-- UPDATE events
-- SET status = 'completed'
-- WHERE id IN (9,10,11,20,21,29,30,33,34,49,84,85,87,90,92)
--   AND status = 'published'
-- RETURNING id, title, status;
-- -- Rollback: UPDATE events SET status = 'published' WHERE id IN (...);
-- COMMIT;
*/

-- -----------------------------------------------------------------------------
-- 8) AFTER COUNTS (mirror section 0)
-- -----------------------------------------------------------------------------
-- Re-run section 0 queries after any approved COMMIT.

-- =============================================================================
-- END — no DELETE/TRUNCATE/DROP included by design
-- =============================================================================
