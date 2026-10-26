/**
 * Approved owner actions (2026-10-26):
 * A) Soft-unpublish strict zero-dep published events (expect #95)
 * B) Mark published+has-orders+no-future as completed (preserve history)
 * C) Correct venue names/cities/addresses; mark generic placeholders unverified
 * D) Upsert a few verified civic venues (NCPA halls) if missing
 *
 * NO DELETE. NO BMS scrape. NO invented sellable showtimes.
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

const raw = process.env.DATABASE_URL || '';
const url = raw
  .replace(/([?&])sslmode=[^&]*/gi, '$1')
  .replace(/\?&/, '?')
  .replace(/[?&]$/, '');

async function main() {
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const client = await p.connect();

  try {
    await client.query('BEGIN');

    // A) Soft-unpublish strict candidates
    const soft = await client.query(`
      UPDATE events e
      SET status = 'unpublished'
      WHERE e.status = 'published'
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
        AND NOT EXISTS (
              SELECT 1 FROM tickets t
              JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
            )
        AND NOT EXISTS (
              SELECT 1 FROM ticket_scans ts
              JOIN tickets t ON t.id = ts.ticket_id
              JOIN orders o ON o.id = t.order_id WHERE o.event_id = e.id
            )
        AND NOT EXISTS (SELECT 1 FROM event_reviews r WHERE r.event_id = e.id)
        AND NOT EXISTS (
              SELECT 1 FROM event_sessions s
              WHERE s.event_id = e.id AND s.session_start_time > NOW()
            )
      RETURNING e.id, e.title, e.status
    `);
    console.log('A soft-unpublish:', soft.rowCount, soft.rows);

    // B) Historical sold shows → completed
    const completed = await client.query(`
      UPDATE events e
      SET status = 'completed'
      WHERE e.status = 'published'
        AND EXISTS (SELECT 1 FROM orders o WHERE o.event_id = e.id)
        AND NOT EXISTS (
              SELECT 1 FROM event_sessions s
              WHERE s.event_id = e.id AND s.session_start_time > NOW()
            )
      RETURNING e.id, e.title, e.status
    `);
    console.log('B completed:', completed.rowCount, completed.rows.map((r) => r.id).join(','));

    // C1) Dinanath — same Mumbai Vile Parle landmark (keep both rows; correct metadata; no merge)
    await client.query(`
      UPDATE venues SET
        name = 'Dinanath Mangeshkar Natyagruha',
        name_mr = 'दीनानath मंगेशकर नाट्यगृह',
        city = 'Mumbai',
        address = 'Vile Parle East, Mumbai',
        verification_status = 'verified'
      WHERE id IN (2, 12)
    `);
    // fix typo in Marathi if broken
    await client.query(`
      UPDATE venues SET name_mr = 'दीनानाथ मंगेशकर नाट्यगृह'
      WHERE id IN (2, 12)
    `);

    // C2) Yashwantrao Chavan Pune — align duplicate spelling; keep FKs
    await client.query(`
      UPDATE venues SET
        name = 'Yashwantrao Chavan Natyagruha',
        name_mr = 'यशवंतराव चव्हाण नाट्यगृह',
        city = 'Pune',
        address = 'Kothrud, Pune',
        verification_status = 'verified'
      WHERE id IN (3, 53)
    `);

    // C3) Bal Gandharva Pune — verified public capacity 989
    await client.query(`
      UPDATE venues SET
        name = 'Bal Gandharva Rang Mandir',
        name_mr = 'बाळ गंधर्व रंगमंदिर',
        city = 'Pune',
        address = 'J.M. Road / Jangli Maharaj Road, Shivajinagar, Pune',
        total_capacity = 989,
        verification_status = 'verified'
      WHERE id = 1
    `);

    // C4) Ravindra Natya Mandir if present
    await client.query(`
      UPDATE venues SET
        name = 'Ravindra Natya Mandir',
        name_mr = 'रवींद्र नाट्य मंदिर',
        city = 'Mumbai',
        address = 'Sayani Road, Prabhadevi, Mumbai (P.L. Deshpande Maharashtra Kala Academy)',
        total_capacity = 911,
        verification_status = 'verified'
      WHERE name ILIKE '%Ravindra Natya%' OR name ILIKE '%रवींद्र%'
    `);

    // C5) Mark generic placeholder halls unverified (do not delete — may be referenced)
    const placeholders = await client.query(`
      UPDATE venues SET verification_status = 'unverified'
      WHERE verification_status <> 'unverified'
        AND (
          name ILIKE '%Town Hall%'
          OR name ILIKE '%Cultural Hall%'
          OR name ILIKE '%Cultural Centre%'
          OR name ILIKE '%Municipal Hall%'
          OR name ILIKE '%District Auditorium%'
          OR name ILIKE '%Municipal Auditorium%'
        )
      RETURNING id, name, city
    `);
    console.log('C placeholders→unverified:', placeholders.rowCount);

    // D) Upsert verified NCPA halls (idempotent by name+city)
    const ncpa = [
      {
        name: 'Jamshed Bhabha Theatre (NCPA)',
        nameMr: 'जमशेद भाभा थिएटर (एनसीपीए)',
        address: 'NCPA, Nariman Point, Mumbai',
        capacity: 1109,
      },
      {
        name: 'Tata Theatre (NCPA)',
        nameMr: 'टाटा थिएटर (एनसीपीए)',
        address: 'NCPA, Nariman Point, Mumbai',
        capacity: 960,
      },
      {
        name: 'NCPA Experimental Theatre',
        nameMr: 'एनसीपीए प्रयोग रंगमंच',
        address: 'NCPA, Nariman Point, Mumbai',
        capacity: 267,
      },
      {
        name: 'Godrej Dance Theatre (NCPA)',
        nameMr: 'गोदरेज डान्स थिएटर (एनसीपीए)',
        address: 'NCPA, Nariman Point, Mumbai',
        capacity: 177,
      },
    ];

    for (const v of ncpa) {
      const existing = await client.query(
        `SELECT id FROM venues WHERE lower(name) = lower($1) AND lower(city) = 'mumbai' LIMIT 1`,
        [v.name]
      );
      if (existing.rowCount) {
        await client.query(
          `UPDATE venues SET name_mr=$2, address=$3, total_capacity=$4, verification_status='verified', state='Maharashtra'
           WHERE id=$1`,
          [existing.rows[0].id, v.nameMr, v.address, v.capacity]
        );
        console.log('D updated NCPA', v.name, 'id', existing.rows[0].id);
      } else {
        const loc = await client.query(
          `SELECT id, district_id FROM cities WHERE LOWER(TRIM(name)) = 'mumbai' LIMIT 1`
        );
        const ins = await client.query(
          `INSERT INTO venues (name, name_mr, address, city, state, district_id, city_id, total_capacity, has_seat_layout, verification_status, is_template, ownership_type)
           VALUES ($1,$2,$3,'Mumbai','Maharashtra',$4,$5,$6,0,'verified',0,'cultural_institution')
           RETURNING id`,
          [
            v.name,
            v.nameMr,
            v.address,
            loc.rows[0]?.district_id ?? null,
            loc.rows[0]?.id ?? null,
            v.capacity,
          ]
        );
        console.log('D inserted NCPA', v.name, 'id', ins.rows[0].id);
      }
    }

    // Verify catalog shape
    const summary = await client.query(`
      SELECT status, COUNT(*)::int AS n FROM events GROUP BY status ORDER BY status
    `);
    const venues = await client.query(`
      SELECT verification_status, COUNT(*)::int AS n FROM venues GROUP BY verification_status ORDER BY 1
    `);
    const live = await client.query(`
      SELECT e.id, e.title, e.status,
             (SELECT COUNT(*)::int FROM event_sessions s WHERE s.event_id=e.id AND s.session_start_time>NOW()) AS future
      FROM events e
      WHERE e.status='published'
      ORDER BY e.id
    `);

    console.log('eventsByStatus', summary.rows);
    console.log('venuesByVerification', venues.rows);
    console.log('stillPublished', live.rows);

    await client.query('COMMIT');
    console.log('COMMIT OK');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ROLLBACK', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await p.end();
  }
}

main();
