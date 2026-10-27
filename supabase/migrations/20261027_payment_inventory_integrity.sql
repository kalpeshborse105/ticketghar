-- ============================================================================
-- Payment / inventory integrity (REVIEW before apply — NOT auto-run)
-- ============================================================================
-- 1) Unique razorpay_payment_id when present (prevents dual confirm on same payment)
-- 2) Helpful indexes for hold/order lookup
-- ============================================================================

BEGIN;

-- Partial unique index: multiple NULLs allowed, non-null payment ids unique
CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_uidx
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id <> '';

CREATE INDEX IF NOT EXISTS seat_inventory_order_id_idx
  ON public.seat_inventory (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS seat_inventory_session_status_idx
  ON public.seat_inventory (session_id, status);

-- Default ending for review:
ROLLBACK;
-- COMMIT;
