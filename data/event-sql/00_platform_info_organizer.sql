-- ============================================================================
-- MahaTicket — platform organizer for INFORMATIONAL catalogue events
-- ============================================================================
-- REVIEW ONLY. Default ends in ROLLBACK.
-- Purpose: events.organizer_id is NOT NULL. Info-only listings need an organizer
-- row that is clearly NOT a selling partner until you assign a real one.
-- ============================================================================

BEGIN;

INSERT INTO public.organizers (
  name, company_name, email, phone, city,
  verification_status, status,
  commission_type, commission_rate
)
SELECT
  'MahaTicket Info Catalogue',
  'MahaTicket Platform (Information Only — Not For Sale)',
  'catalogue-info@mahaticket.local',
  '0000000000',
  'Pune',
  'verified',
  'active',
  'percentage',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizers
  WHERE lower(email) = 'catalogue-info@mahaticket.local'
);

SELECT id, name, company_name, email, status
FROM public.organizers
WHERE lower(email) = 'catalogue-info@mahaticket.local'
   OR company_name ILIKE '%Information Only%'
ORDER BY id;

ROLLBACK;
-- COMMIT;
