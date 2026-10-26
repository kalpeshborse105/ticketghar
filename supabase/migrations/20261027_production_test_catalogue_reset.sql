-- ============================================================================
-- MahaTicket — TEST CATALOGUE RESET (REVIEW ONLY)
-- File: supabase/migrations/20261027_production_test_catalogue_reset.sql
-- ============================================================================
-- Clears development theatres / events / inventory / orders / tickets / scans /
-- reviews / settlements. PRESERVES users, organizers, districts, talukas,
-- cities, app_secrets, app_runtime_config, home_sections.
--
-- DO NOT auto-run on production.
-- External pg_dump MUST exist BEFORE this session (not inside this TX).
-- Default ends in ROLLBACK. Uncomment COMMIT only after staging proof.
--
-- Session gates:
--   SELECT set_config('mahaticket.reset_confirm', 'I_CLEAR_TEST_CATALOGUE', false);
--   SELECT set_config('mahaticket.backup_external_ok', 'PGDUMP_VERIFIED', false);
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF current_setting('mahaticket.reset_confirm', true) IS DISTINCT FROM 'I_CLEAR_TEST_CATALOGUE' THEN
    RAISE EXCEPTION 'Abort: set mahaticket.reset_confirm=I_CLEAR_TEST_CATALOGUE';
  END IF;
  IF current_setting('mahaticket.backup_external_ok', true) IS DISTINCT FROM 'PGDUMP_VERIFIED' THEN
    RAISE EXCEPTION 'Abort: external pg_dump not confirmed (mahaticket.backup_external_ok)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
    RAISE EXCEPTION 'Abort: users empty — refusing reset';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('bookings','booking_items','payments')
  ) THEN
    RAISE EXCEPTION 'Abort: unexpected bookings/payments tables — re-audit';
  END IF;
END $$;

-- Pre counts (NOTICE)
DO $$
BEGIN
  RAISE NOTICE 'ticket_scans=%', (SELECT COUNT(*) FROM public.ticket_scans);
  RAISE NOTICE 'tickets=%', (SELECT COUNT(*) FROM public.tickets);
  RAISE NOTICE 'seat_inventory=%', (SELECT COUNT(*) FROM public.seat_inventory);
  RAISE NOTICE 'settlements=%', (SELECT COUNT(*) FROM public.settlements);
  RAISE NOTICE 'orders=%', (SELECT COUNT(*) FROM public.orders);
  RAISE NOTICE 'event_reviews=%', (SELECT COUNT(*) FROM public.event_reviews);
  RAISE NOTICE 'event_images=%', (SELECT COUNT(*) FROM public.event_images);
  RAISE NOTICE 'ticket_types=%', (SELECT COUNT(*) FROM public.ticket_types);
  RAISE NOTICE 'event_sessions=%', (SELECT COUNT(*) FROM public.event_sessions);
  RAISE NOTICE 'events=%', (SELECT COUNT(*) FROM public.events);
  RAISE NOTICE 'seats=%', (SELECT COUNT(*) FROM public.seats);
  RAISE NOTICE 'venue_sections=%', (SELECT COUNT(*) FROM public.venue_sections);
  RAISE NOTICE 'venues=%', (SELECT COUNT(*) FROM public.venues);
  RAISE NOTICE 'users=%', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE 'districts=%', (SELECT COUNT(*) FROM public.districts);
  RAISE NOTICE 'cities=%', (SELECT COUNT(*) FROM public.cities);
  RAISE NOTICE 'app_secrets=%', (SELECT COUNT(*) FROM public.app_secrets);
END $$;

-- Child → parent deletes (no FK disable)
DELETE FROM public.ticket_scans;
DELETE FROM public.tickets;
DELETE FROM public.seat_inventory;
DELETE FROM public.settlements;
DELETE FROM public.orders;
DELETE FROM public.event_reviews;
DELETE FROM public.event_images;
DELETE FROM public.ticket_types;
DELETE FROM public.event_sessions;
DELETE FROM public.events;
DELETE FROM public.seats;
DELETE FROM public.venue_sections;
DELETE FROM public.venues;

-- Optional marketing (commented — enable only if approved)
-- DELETE FROM public.coupons;
-- DELETE FROM public.announcements;
-- DELETE FROM public.notification_log;

DO $$
DECLARE
  u int; d int; c int; s int; v int; o int;
BEGIN
  SELECT COUNT(*) INTO u FROM public.users;
  SELECT COUNT(*) INTO d FROM public.districts;
  SELECT COUNT(*) INTO c FROM public.cities;
  SELECT COUNT(*) INTO s FROM public.app_secrets;
  SELECT COUNT(*) INTO v FROM public.venues;
  SELECT COUNT(*) INTO o FROM public.orders;

  IF u < 1 OR s < 1 OR d < 1 OR c < 1 THEN
    RAISE EXCEPTION 'Post-check abort: preserve tables damaged (users=% secrets=% districts=% cities=%)', u, s, d, c;
  END IF;
  IF v <> 0 OR o <> 0 THEN
    RAISE EXCEPTION 'Post-check abort: venues=% orders=% (expected 0)', v, o;
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
  VALUES (
    'sql-20261027-test-catalogue-reset',
    'system',
    'test_catalogue_reset',
    'database',
    'catalogue',
    '{"note":"SQL path; prefer scripts/production-database-reset.ts for gated apply"}'
  );
END $$;

-- Default safe ending:
ROLLBACK;
-- COMMIT;  -- only after staging validation
