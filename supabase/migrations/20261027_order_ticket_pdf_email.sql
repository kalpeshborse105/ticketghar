-- Ticket PDF URL + one-time booking email stamp (no hard deletes)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ticket_pdf_url text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

COMMENT ON COLUMN public.orders.ticket_pdf_url IS 'Public URL of M-Ticket PDF in object storage';
COMMENT ON COLUMN public.orders.email_sent_at IS 'When confirmation email was first sent; null = not yet emailed';
