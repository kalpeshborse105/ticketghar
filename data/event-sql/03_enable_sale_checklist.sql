-- ============================================================================
-- MahaTicket — ENABLE SALE for ONE event (checklist + examples)
-- ============================================================================
-- Do NOT run as a batch. Use after theater/organizer deal is signed.
-- Public sale requires ALL of:
--   1) venue seat layout (sections + seats) OR GA ticket types
--   2) ticket_types with price (paise) + quota
--   3) seat_inventory generated for the session (if seated)
--   4) events.status = 'published'
-- ============================================================================

-- --- A) Find the draft event ---
-- SELECT id, title, status, venue_id, slug FROM events WHERE status = 'draft' ORDER BY id;

-- --- B) Confirm sessions ---
-- SELECT * FROM event_sessions WHERE event_id = :event_id;

-- --- C) After seats exist on venue, generate ticket types (example shape only) ---
-- INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
-- VALUES (:event_id, :session_id, :section_id, 'General', 'सामान्य', 50000, 100, 100, 1);

-- --- D) Generate seat_inventory via admin/API (preferred) or approved script —
--     do not invent seat maps in this file.

-- --- E) Flip to public (THIS starts selling if inventory exists) ---
-- BEGIN;
-- UPDATE events
-- SET status = 'published', tag = NULL
-- WHERE id = :event_id
--   AND status IN ('draft', 'unpublished', 'approved');
-- -- Verify:
-- SELECT id, title, status FROM events WHERE id = :event_id;
-- ROLLBACK;
-- -- COMMIT;

-- --- F) Disable again (stop selling, keep history) ---
-- UPDATE events SET status = 'unpublished' WHERE id = :event_id;
