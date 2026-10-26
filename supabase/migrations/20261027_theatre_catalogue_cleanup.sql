-- ============================================================================
-- MahaTicket / TicketGhar — Theatre catalogue cleanup (REVIEW ONLY)
-- File: supabase/migrations/20261027_theatre_catalogue_cleanup.sql
-- ============================================================================
-- IMPORTANT
--   • DO NOT auto-apply to production.
--   • Based on live audit 2026-10-26 (docs/THEATRE_DATABASE_FINAL_AUDIT.md).
--   • Soft-archive only. NO hard-delete of venues/events/orders/tickets/
--     scans/settlements/reviews/users.
--   • No villages master embedded (too large / incomplete). Use staging import.
--   • Set session GUCs below intentionally before running.
-- ============================================================================

-- Operator gates (must be set in the same session before DO blocks run):
--   SELECT set_config('mahaticket.cleanup_confirm', 'I_REVIEWED_THEATRE_AUDIT', false);
--   SELECT set_config('mahaticket.backup_confirm', 'BACKUP_SCHEMA_OK', false);
--   SELECT set_config('mahaticket.allow_soft_archive_dupes', 'yes', false);  -- optional
--   SELECT set_config('mahaticket.allow_location_repair', 'yes', false);     -- optional
--   SELECT set_config('mahaticket.allow_add_cities_taluka_fk', 'no', false);  -- default no

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) PREFLIGHT — abort on unexpected schema
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text;
BEGIN
  IF current_setting('mahaticket.cleanup_confirm', true) IS DISTINCT FROM 'I_REVIEWED_THEATRE_AUDIT' THEN
    RAISE EXCEPTION 'Preflight abort: set mahaticket.cleanup_confirm = I_REVIEWED_THEATRE_AUDIT';
  END IF;
  IF current_setting('mahaticket.backup_confirm', true) IS DISTINCT FROM 'BACKUP_SCHEMA_OK' THEN
    RAISE EXCEPTION 'Preflight abort: set mahaticket.backup_confirm = BACKUP_SCHEMA_OK after external backup';
  END IF;

  SELECT string_agg(t, ', ')
  INTO missing
  FROM unnest(ARRAY[
    'districts','talukas','cities','venues','venue_sections','seats',
    'events','event_sessions','ticket_types','seat_inventory',
    'orders','tickets','ticket_scans','settlements','event_reviews','audit_logs'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight abort: missing tables: %', missing;
  END IF;

  -- Refuse if stale-doc tables somehow appear as primary commerce path expectation
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('bookings','booking_items','payments')
  ) THEN
    RAISE EXCEPTION 'Preflight abort: unexpected legacy bookings/payments tables present — re-audit before cleanup';
  END IF;

  -- Required venue columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='verification_status'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='city_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='district_id'
  ) THEN
    RAISE EXCEPTION 'Preflight abort: venues missing verification_status/city_id/district_id';
  END IF;

  RAISE NOTICE 'Preflight OK — tables present; commerce model = orders/tickets';
END $$;

-- ---------------------------------------------------------------------------
-- 1) ROW COUNTS BEFORE
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _theatre_cleanup_counts_before AS
SELECT 'venues'::text AS entity, COUNT(*)::bigint AS n FROM public.venues
UNION ALL SELECT 'venue_sections', COUNT(*) FROM public.venue_sections
UNION ALL SELECT 'seats', COUNT(*) FROM public.seats
UNION ALL SELECT 'events', COUNT(*) FROM public.events
UNION ALL SELECT 'event_sessions', COUNT(*) FROM public.event_sessions
UNION ALL SELECT 'ticket_types', COUNT(*) FROM public.ticket_types
UNION ALL SELECT 'seat_inventory', COUNT(*) FROM public.seat_inventory
UNION ALL SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL SELECT 'tickets', COUNT(*) FROM public.tickets
UNION ALL SELECT 'ticket_scans', COUNT(*) FROM public.ticket_scans
UNION ALL SELECT 'settlements', COUNT(*) FROM public.settlements
UNION ALL SELECT 'event_reviews', COUNT(*) FROM public.event_reviews;

-- ---------------------------------------------------------------------------
-- 2) BACKUP SCHEMA (row copies + source ids). Does NOT copy app_secrets.
--    NOTE: CTAS does not preserve PK/FK/index/trigger metadata — keep a
--    separate schema-only dump outside this script.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS theatre_backup_20261027;

CREATE TABLE IF NOT EXISTS theatre_backup_20261027.meta (
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL
);

INSERT INTO theatre_backup_20261027.meta (note)
VALUES ('Theatre cleanup backup — row snapshots only; restore PK/FK from schema dump');

DROP TABLE IF EXISTS theatre_backup_20261027.venues;
CREATE TABLE theatre_backup_20261027.venues AS
SELECT v.*, now() AS backed_up_at FROM public.venues v;

DROP TABLE IF EXISTS theatre_backup_20261027.venue_sections;
CREATE TABLE theatre_backup_20261027.venue_sections AS
SELECT vs.*, now() AS backed_up_at FROM public.venue_sections vs;

DROP TABLE IF EXISTS theatre_backup_20261027.seats;
CREATE TABLE theatre_backup_20261027.seats AS
SELECT s.*, now() AS backed_up_at FROM public.seats s;

DROP TABLE IF EXISTS theatre_backup_20261027.events;
CREATE TABLE theatre_backup_20261027.events AS
SELECT e.*, now() AS backed_up_at FROM public.events e;

DROP TABLE IF EXISTS theatre_backup_20261027.event_sessions;
CREATE TABLE theatre_backup_20261027.event_sessions AS
SELECT es.*, now() AS backed_up_at FROM public.event_sessions es;

DROP TABLE IF EXISTS theatre_backup_20261027.ticket_types;
CREATE TABLE theatre_backup_20261027.ticket_types AS
SELECT tt.*, now() AS backed_up_at FROM public.ticket_types tt;

DROP TABLE IF EXISTS theatre_backup_20261027.seat_inventory;
CREATE TABLE theatre_backup_20261027.seat_inventory AS
SELECT si.*, now() AS backed_up_at FROM public.seat_inventory si;

DROP TABLE IF EXISTS theatre_backup_20261027.orders;
CREATE TABLE theatre_backup_20261027.orders AS
SELECT o.*, now() AS backed_up_at FROM public.orders o;

DROP TABLE IF EXISTS theatre_backup_20261027.tickets;
CREATE TABLE theatre_backup_20261027.tickets AS
SELECT t.*, now() AS backed_up_at FROM public.tickets t;

DROP TABLE IF EXISTS theatre_backup_20261027.ticket_scans;
CREATE TABLE theatre_backup_20261027.ticket_scans AS
SELECT ts.*, now() AS backed_up_at FROM public.ticket_scans ts;

DROP TABLE IF EXISTS theatre_backup_20261027.settlements;
CREATE TABLE theatre_backup_20261027.settlements AS
SELECT st.*, now() AS backed_up_at FROM public.settlements st;

DROP TABLE IF EXISTS theatre_backup_20261027.event_reviews;
CREATE TABLE theatre_backup_20261027.event_reviews AS
SELECT er.*, now() AS backed_up_at FROM public.event_reviews er;

DROP TABLE IF EXISTS theatre_backup_20261027.cities;
CREATE TABLE theatre_backup_20261027.cities AS
SELECT c.*, now() AS backed_up_at FROM public.cities c;

DROP TABLE IF EXISTS theatre_backup_20261027.districts;
CREATE TABLE theatre_backup_20261027.districts AS
SELECT d.*, now() AS backed_up_at FROM public.districts d;

DROP TABLE IF EXISTS theatre_backup_20261027.talukas;
CREATE TABLE theatre_backup_20261027.talukas AS
SELECT t.*, now() AS backed_up_at FROM public.talukas t;

-- Dependency snapshot for duplicate candidates
DROP TABLE IF EXISTS theatre_backup_20261027.duplicate_candidates;
CREATE TABLE theatre_backup_20261027.duplicate_candidates AS
SELECT
  v.id AS venue_id,
  v.name,
  v.city,
  v.district_id,
  v.city_id,
  v.verification_status,
  (SELECT COUNT(*) FROM public.events e WHERE e.venue_id = v.id) AS events,
  (SELECT COUNT(*) FROM public.orders o JOIN public.events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS orders,
  (SELECT COUNT(*) FROM public.tickets tk JOIN public.orders o ON o.id = tk.order_id JOIN public.events e ON e.id = o.event_id WHERE e.venue_id = v.id) AS tickets,
  (SELECT COUNT(*) FROM public.event_reviews er JOIN public.events e ON e.id = er.event_id WHERE e.venue_id = v.id) AS reviews,
  now() AS backed_up_at
FROM public.venues v
WHERE v.id IN (2, 12, 3, 53);

-- ---------------------------------------------------------------------------
-- 3) SAFETY ASSERTS — refuse soft-archive if deps appeared
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  o12 int; e12 int; r12 int;
  o53 int; e53 int; r53 int;
  o3 int; t3 int;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.orders o JOIN public.events e ON e.id = o.event_id WHERE e.venue_id = 12),
    (SELECT COUNT(*) FROM public.events e WHERE e.venue_id = 12),
    (SELECT COUNT(*) FROM public.event_reviews er JOIN public.events e ON e.id = er.event_id WHERE e.venue_id = 12)
  INTO o12, e12, r12;

  SELECT
    (SELECT COUNT(*) FROM public.orders o JOIN public.events e ON e.id = o.event_id WHERE e.venue_id = 53),
    (SELECT COUNT(*) FROM public.events e WHERE e.venue_id = 53),
    (SELECT COUNT(*) FROM public.event_reviews er JOIN public.events e ON e.id = er.event_id WHERE e.venue_id = 53)
  INTO o53, e53, r53;

  SELECT
    (SELECT COUNT(*) FROM public.orders o JOIN public.events e ON e.id = o.event_id WHERE e.venue_id = 3),
    (SELECT COUNT(*) FROM public.tickets tk JOIN public.orders o ON o.id = tk.order_id JOIN public.events e ON e.id = o.event_id WHERE e.venue_id = 3)
  INTO o3, t3;

  IF o3 < 1 OR t3 < 1 THEN
    RAISE EXCEPTION 'Safety abort: venue #3 expected protected orders/tickets (found orders=%, tickets=%). Re-audit.', o3, t3;
  END IF;

  IF o12 > 0 OR e12 > 0 OR r12 > 0 THEN
    RAISE EXCEPTION 'Safety abort: venue #12 unexpectedly has deps (orders=%, events=%, reviews=%). Manual review.', o12, e12, r12;
  END IF;

  IF o53 > 0 OR e53 > 0 OR r53 > 0 THEN
    RAISE EXCEPTION 'Safety abort: venue #53 unexpectedly has deps (orders=%, events=%, reviews=%). Manual review.', o53, e53, r53;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) OPTIONAL — soft-archive confirmed duplicate losers (#12, #53)
--    Does NOT delete rows, sections, or seats.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF current_setting('mahaticket.allow_soft_archive_dupes', true) IS DISTINCT FROM 'yes' THEN
    RAISE NOTICE 'Skipping soft-archive of #12/#53 (set mahaticket.allow_soft_archive_dupes=yes to enable)';
    RETURN;
  END IF;

  UPDATE public.venues
  SET verification_status = 'unverified'
  WHERE id IN (12, 53)
    AND verification_status IS DISTINCT FROM 'unverified';

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
  VALUES (
    'db-migration-20261027',
    'system',
    'venue_soft_archive_duplicate',
    'venue',
    '12,53',
    '{"reason":"exact_name_duplicate","keepers":[2,3],"mode":"verification_status=unverified"}'
  );

  RAISE NOTICE 'Soft-archived duplicate venues #12 and #53';
END $$;

-- ---------------------------------------------------------------------------
-- 5) OPTIONAL — location FK repair for authoritative allowlist only
--    city_id: Mumbai=1, Pune=2 (unique catalog names — FACT from live).
--    district_id: Mumbai City=17, Pune=26 (address-evidence plan).
--    Does NOT invent Mumbai Suburban vs City for ambiguous rows outside list.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF current_setting('mahaticket.allow_location_repair', true) IS DISTINCT FROM 'yes' THEN
    RAISE NOTICE 'Skipping location repair (set mahaticket.allow_location_repair=yes to enable)';
    RETURN;
  END IF;

  -- Assert catalog ids still match expected names
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = 1 AND name = 'Mumbai') THEN
    RAISE EXCEPTION 'Location repair abort: cities.id=1 is not Mumbai';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = 2 AND name = 'Pune') THEN
    RAISE EXCEPTION 'Location repair abort: cities.id=2 is not Pune';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.districts WHERE id = 17 AND name = 'Mumbai City') THEN
    RAISE EXCEPTION 'Location repair abort: districts.id=17 is not Mumbai City';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.districts WHERE id = 26 AND name = 'Pune') THEN
    RAISE EXCEPTION 'Location repair abort: districts.id=26 is not Pune';
  END IF;

  -- Pune allowlist
  UPDATE public.venues SET city_id = 2, district_id = COALESCE(district_id, 26)
  WHERE id IN (55, 62, 63, 64, 65, 66)
    AND (city_id IS DISTINCT FROM 2 OR district_id IS DISTINCT FROM 26);

  UPDATE public.venues SET district_id = 26
  WHERE id IN (55, 62, 63, 64, 65, 66) AND district_id IS DISTINCT FROM 26;

  UPDATE public.venues SET city_id = 2
  WHERE id IN (55, 62, 63, 64, 65, 66) AND city_id IS DISTINCT FROM 2;

  -- Mumbai allowlist (NCPA / Shivaji Mandir) — Mumbai City district with address evidence
  UPDATE public.venues SET city_id = 1, district_id = 17
  WHERE id IN (56, 59, 60, 61)
    AND (city_id IS DISTINCT FROM 1 OR district_id IS DISTINCT FROM 17);

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
  VALUES (
    'db-migration-20261027',
    'system',
    'venue_location_fk_repair',
    'venue',
    '55,56,59,60,61,62,63,64,65,66',
    '{"source":"AUTHORITATIVE_LOCATION_REPAIR_PLAN","note":"allowlist only"}'
  );

  RAISE NOTICE 'Applied allowlist location FK repairs';
END $$;

-- ---------------------------------------------------------------------------
-- 6) OPTIONAL — add cities.taluka_id FK if data clean (default OFF)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  orphans int;
BEGIN
  IF current_setting('mahaticket.allow_add_cities_taluka_fk', true) IS DISTINCT FROM 'yes' THEN
    RAISE NOTICE 'Skipping cities.taluka_id FK add';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO orphans
  FROM public.cities c
  WHERE c.taluka_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.talukas t WHERE t.id = c.taluka_id);

  IF orphans > 0 THEN
    RAISE EXCEPTION 'Cannot add cities.taluka_id FK: % orphan taluka_id values', orphans;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cities_taluka_id_fkey'
  ) THEN
    ALTER TABLE public.cities
      ADD CONSTRAINT cities_taluka_id_fkey
      FOREIGN KEY (taluka_id) REFERENCES public.talukas (id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7) IDEMPOTENT PLACEHOLDER — verified theatre upsert
--    Intentionally EMPTY of fabricated inserts. Load from staging after
--    owner supplies verified rows (name, address, district, sources).
--    Example pattern (commented):
--
-- INSERT INTO public.venues (name, name_mr, address, city, state, district_id, city_id,
--   verification_status, is_template, ownership_type, total_capacity, has_seat_layout)
-- SELECT ...
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.venues v
--   WHERE lower(v.name) = lower(...) AND v.city_id = ...
-- );
-- Do NOT generate seat maps here without verified layouts.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 8) POST VALIDATION — commerce row counts must not shrink
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  after_n bigint;
BEGIN
  FOR r IN SELECT entity, n FROM _theatre_cleanup_counts_before
           WHERE entity IN ('orders','tickets','ticket_scans','settlements','event_reviews','events')
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', r.entity) INTO after_n;
    IF after_n < r.n THEN
      RAISE EXCEPTION 'Post-validation abort: % count shrank % -> %', r.entity, r.n, after_n;
    END IF;
  END FOR;

  -- Keepers must remain verified
  IF EXISTS (
    SELECT 1 FROM public.venues
    WHERE id IN (2, 3)
      AND verification_status IS DISTINCT FROM 'verified'
  ) THEN
    RAISE EXCEPTION 'Post-validation abort: duplicate keepers #2/#3 must stay verified';
  END IF;

  RAISE NOTICE 'Post-validation OK — protected commerce counts preserved';
END $$;

CREATE TEMP TABLE _theatre_cleanup_counts_after AS
SELECT 'venues'::text AS entity, COUNT(*)::bigint AS n FROM public.venues
UNION ALL SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL SELECT 'tickets', COUNT(*) FROM public.tickets
UNION ALL SELECT 'ticket_scans', COUNT(*) FROM public.ticket_scans
UNION ALL SELECT 'settlements', COUNT(*) FROM public.settlements
UNION ALL SELECT 'event_reviews', COUNT(*) FROM public.event_reviews;

-- Review counts:
-- SELECT b.entity, b.n AS before, a.n AS after
-- FROM _theatre_cleanup_counts_before b
-- JOIN _theatre_cleanup_counts_after a USING (entity);

-- ---------------------------------------------------------------------------
-- 9) COMMIT or ROLLBACK
--    Default: leave transaction open for operator review, OR commit explicitly.
--    For safety in automated runners, ROLLBACK unless you uncomment COMMIT.
-- ---------------------------------------------------------------------------
-- COMMIT;
ROLLBACK;

-- ============================================================================
-- Operator notes after successful review:
-- 1) Replace final ROLLBACK with COMMIT only on approved staging/prod apply.
-- 2) Re-run scripts/theatre-final-audit-readonly.ts and diff JSON.
-- 3) Wrong district rows (#2,#4,#5,#6) are NOT auto-fixed here — need
--    address-evidence approval (see docs/VENUE_LOCATION_REPAIR.md).
-- 4) Full MH village master: import LGD CSV into staging schema, validate,
--    then map — do not paste incomplete village lists into this file.
-- ============================================================================
