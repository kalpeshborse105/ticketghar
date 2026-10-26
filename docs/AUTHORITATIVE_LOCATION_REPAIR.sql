-- AUTHORITATIVE THEATRE LOCATION REPAIR
-- generatedAt: 2026-10-26T19:26:49.158Z
-- venue IDs: 55,56,59,60,61,62,63,64,65,66
-- Changes ONLY venues.city_id / venues.district_id.
-- Does NOT change names, verification_status, events, orders, tickets, payments, scans.
-- Default: ROLLBACK. Change final ROLLBACK to COMMIT only after owner approval.

BEGIN;

-- ===== PRECONDITIONS (exact before values) =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 55
      AND city_id IS NULL
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 55;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 56
      AND city_id IS NULL
      AND district_id = 17
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 56;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 59
      AND city_id IS NULL
      AND district_id IS NULL
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 59;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 60
      AND city_id IS NULL
      AND district_id IS NULL
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 60;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 61
      AND city_id IS NULL
      AND district_id IS NULL
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 61;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 62
      AND city_id IS NULL
      AND district_id IS NULL
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 62;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 63
      AND city_id IS NULL
      AND district_id IS NULL
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 63;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 64
      AND city_id IS NULL
      AND district_id IS NULL
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 64;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 65
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 65;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 66
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Precondition failed for venue #%', 66;
  END IF;
  IF (SELECT COUNT(*)::int FROM venues WHERE id IN (55,56,59,60,61,62,63,64,65,66)) <> 10 THEN
    RAISE EXCEPTION 'Authoritative venue count mismatch';
  END IF;
END $$;

-- ===== UPDATES (idempotent WHERE matches from-value) =====

-- venue #55 city_id: null → 2 | Unique cities.id=2 (Pune); compatible with district_id=26
UPDATE venues
SET city_id = 2
WHERE id = 55
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #56 city_id: null → 1 | Unique cities.id=1 (Mumbai); compatible with district_id=17
UPDATE venues
SET city_id = 1
WHERE id = 56
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #59 district_id: null → 17 | Address evidence → Mumbai City (districts.id=17)
UPDATE venues
SET district_id = 17
WHERE id = 59
  AND district_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #59 city_id: null → 1 | Unique cities.id=1 (Mumbai); compatible with district_id=17
UPDATE venues
SET city_id = 1
WHERE id = 59
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #60 district_id: null → 17 | Address evidence → Mumbai City (districts.id=17)
UPDATE venues
SET district_id = 17
WHERE id = 60
  AND district_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #60 city_id: null → 1 | Unique cities.id=1 (Mumbai); compatible with district_id=17
UPDATE venues
SET city_id = 1
WHERE id = 60
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #61 district_id: null → 17 | Address evidence → Mumbai City (districts.id=17)
UPDATE venues
SET district_id = 17
WHERE id = 61
  AND district_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #61 city_id: null → 1 | Unique cities.id=1 (Mumbai); compatible with district_id=17
UPDATE venues
SET city_id = 1
WHERE id = 61
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #62 district_id: null → 26 | Address evidence → Pune (districts.id=26)
UPDATE venues
SET district_id = 26
WHERE id = 62
  AND district_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #62 city_id: null → 2 | Unique cities.id=2 (Pune); compatible with district_id=26
UPDATE venues
SET city_id = 2
WHERE id = 62
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #63 district_id: null → 26 | Address evidence → Pune (districts.id=26)
UPDATE venues
SET district_id = 26
WHERE id = 63
  AND district_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #63 city_id: null → 2 | Unique cities.id=2 (Pune); compatible with district_id=26
UPDATE venues
SET city_id = 2
WHERE id = 63
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #64 district_id: null → 26 | Address evidence → Pune (districts.id=26)
UPDATE venues
SET district_id = 26
WHERE id = 64
  AND district_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- venue #64 city_id: null → 2 | Unique cities.id=2 (Pune); compatible with district_id=26
UPDATE venues
SET city_id = 2
WHERE id = 64
  AND city_id IS NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- ===== POSTCONDITIONS =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 55
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 55;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 56
      AND city_id = 1
      AND district_id = 17
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 56;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 59
      AND city_id = 1
      AND district_id = 17
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 59;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 60
      AND city_id = 1
      AND district_id = 17
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 60;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 61
      AND city_id = 1
      AND district_id = 17
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 61;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 62
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 62;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 63
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 63;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 64
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 64;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 65
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 65;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM venues
    WHERE id = 66
      AND city_id = 2
      AND district_id = 26
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for venue #%', 66;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM venues v
    JOIN cities c ON c.id = v.city_id
    WHERE v.id IN (55,56,59,60,61,62,63,64,65,66)
      AND v.city_id IS NOT NULL
      AND v.district_id IS NOT NULL
      AND c.district_id IS NOT NULL
      AND c.district_id IS DISTINCT FROM v.district_id
  ) THEN
    RAISE EXCEPTION 'City/district catalog mismatch among authoritative venues';
  END IF;
END $$;

ROLLBACK; -- Owner: change to COMMIT after review
