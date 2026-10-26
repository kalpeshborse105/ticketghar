# Production database backup & restore

**Rule:** Backup is **independent** of the reset transaction. Do **not** rely on `CREATE TABLE … AS SELECT` inside a transaction that later `ROLLBACK`s.

---

## 1. Pre-reset backup checklist

- [ ] Confirm target host class (`localhost` / staging / `*.pooler.supabase.com` = production-like)
- [ ] Record `git rev-parse HEAD` and preflight JSON timestamp
- [ ] Ensure disk/object storage for dump is **outside** the DB
- [ ] Exclude secrets from any **git-committed** artifact (`app_secrets` may be in dump — store dump privately)
- [ ] Run `npx tsx scripts/production-database-preflight.ts` and save stdout + `docs/PRODUCTION_RESET_PREFLIGHT.json`

### Recommended: `pg_dump` (schema + data)

```bash
# Example — set URL locally; do not commit dumps
pg_dump "%DATABASE_URL%" \
  --format=custom \
  --file="backups/mahaticket_pre_reset_%DATE%.dump"

# Plain SQL alternative
pg_dump "%DATABASE_URL%" \
  --format=plain \
  --file="backups/mahaticket_pre_reset_%DATE%.sql"
```

### Minimum tables to verify in dump

Catalogue clear set + preserve set:

`venues`, `venue_sections`, `seats`, `events`, `event_sessions`, `ticket_types`, `seat_inventory`, `orders`, `tickets`, `ticket_scans`, `settlements`, `event_reviews`, `users`, `organizers`, `districts`, `talukas`, `cities`, `app_runtime_config`, `home_sections`

**Do not commit** dumps that contain `app_secrets` or user PII to the public repo.

### Optional logical snapshot (in addition to pg_dump)

Run once **before** reset (autocommit / separate connection), e.g. copy into schema `theatre_backup_<date>` and **COMMIT** that session separately from the reset script.

---

## 2. Validate backup

```bash
pg_restore --list backups/mahaticket_pre_reset_*.dump | head
# Or: search plain SQL for "COPY public.venues"
```

- [ ] Venue count in dump matches preflight  
- [ ] Order/ticket counts match  
- [ ] Users count match  
- [ ] Restore drill on **empty staging** database succeeded at least once  

---

## 3. Restore procedure

### Full database

```bash
# Destructive to target — staging only unless disaster recovery
pg_restore --clean --if-exists --dbname="%STAGING_DATABASE_URL%" backups/mahaticket_pre_reset_*.dump
```

### Selective (catalogue only)

1. Restore dump to a side database.  
2. Copy rows for cleared tables back with identity columns as needed.  
3. Prefer full restore for test-catalogue mistakes.

### After failed reset mid-transaction

If the reviewed SQL ends in `ROLLBACK` (default), no restore needed.  
If a partial `COMMIT` happened, restore from `pg_dump`, then re-run postflight.

---

## 4. Post-reset backup

After a successful staging/prod clear + before theatre import:

- [ ] Take a second dump (`post_reset_empty_catalogue`)  
- [ ] Keep both dumps until import + first real paid order are stable  

---

## 5. What backup does **not** cover

- Razorpay/Cashfree merchant dashboards  
- Firebase / OAuth provider consoles  
- Objects in storage buckets (posters) — backup separately if required  
- Git history of `data/authoritative_theatres.json` (update after import)
