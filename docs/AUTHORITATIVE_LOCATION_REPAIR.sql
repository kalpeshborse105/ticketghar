-- AUTHORITATIVE THEATRE LOCATION REPAIR (IDs 55,56,59-66)
-- Generated READ-ONLY plan — DO NOT run until owner reviews.
-- Does not change verification_status, names, events, tickets, orders.
BEGIN;

-- Unique cities.id=2 (Pune) from text "Pune"
UPDATE venues SET city_id = 2
WHERE id = 55
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=1 (Mumbai) from text "Mumbai"
UPDATE venues SET city_id = 1
WHERE id = 56
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=1 (Mumbai) from text "Mumbai"
UPDATE venues SET city_id = 1
WHERE id = 59
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Mumbai City (districts.id=17)
UPDATE venues SET district_id = 17
WHERE id = 59
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=1 (Mumbai) from text "Mumbai"
UPDATE venues SET city_id = 1
WHERE id = 60
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Mumbai City (districts.id=17)
UPDATE venues SET district_id = 17
WHERE id = 60
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=1 (Mumbai) from text "Mumbai"
UPDATE venues SET city_id = 1
WHERE id = 61
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Mumbai City (districts.id=17)
UPDATE venues SET district_id = 17
WHERE id = 61
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=2 (Pune) from text "Pune"
UPDATE venues SET city_id = 2
WHERE id = 62
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Pune (districts.id=26)
UPDATE venues SET district_id = 26
WHERE id = 62
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=2 (Pune) from text "Pune"
UPDATE venues SET city_id = 2
WHERE id = 63
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Pune (districts.id=26)
UPDATE venues SET district_id = 26
WHERE id = 63
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=2 (Pune) from text "Pune"
UPDATE venues SET city_id = 2
WHERE id = 64
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Pune (districts.id=26)
UPDATE venues SET district_id = 26
WHERE id = 64
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=2 (Pune) from text "Pune"
UPDATE venues SET city_id = 2
WHERE id = 65
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Pune (districts.id=26)
UPDATE venues SET district_id = 26
WHERE id = 65
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Unique cities.id=2 (Pune) from text "Pune"
UPDATE venues SET city_id = 2
WHERE id = 66
  AND city_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Address/provenance → Pune (districts.id=26)
UPDATE venues SET district_id = 26
WHERE id = 66
  AND district_id IS NOT DISTINCT FROM NULL
  AND id IN (55,56,59,60,61,62,63,64,65,66);

-- Assert all 10 rows still exist
DO $$ BEGIN
  IF (SELECT COUNT(*) FROM venues WHERE id IN (55,56,59,60,61,62,63,64,65,66)) <> 10 THEN
    RAISE EXCEPTION 'Authoritative venue count changed — rolling back';
  END IF;
END $$;

-- Review then COMMIT; or ROLLBACK;
ROLLBACK; -- change to COMMIT after owner approval
