-- Optional profile age (years). Mobile + phone already use phone_number.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS age integer;

COMMENT ON COLUMN users.age IS 'Optional user age in years for MahaTicket profile';
