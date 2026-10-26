-- Forward-only schema gap fill (SAFE / idempotent).
-- DO NOT run against production without explicit owner approval + backup.
-- Aligns lagging DBs with src/db/schema.ts for finalization items.

BEGIN;

-- coupons.used_count (coupon usage tracking after verified payment)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS used_count integer DEFAULT 0;

-- events.rejection_reason (admin reject persistence)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- users.avatar_url (profile)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- event_reviews (if missing on older dumps)
CREATE TABLE IF NOT EXISTS public.event_reviews (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  city TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  verified_attendance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_event_user_review UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON public.event_reviews (event_id);

COMMIT;

-- Rollback notes (manual):
-- ALTER TABLE public.coupons DROP COLUMN IF EXISTS used_count;
-- ALTER TABLE public.events DROP COLUMN IF EXISTS rejection_reason;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS avatar_url;
-- DROP TABLE IF EXISTS public.event_reviews;  -- only if empty / never used
