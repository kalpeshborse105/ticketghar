/**
 * Upsert well-known real Pune/Mumbai civic theatres (names/addresses only).
 * No events, no prices, no BMS scrape.
 */
import { config } from 'dotenv';
import pg from 'pg';

config({ override: true });

const VENUES = [
  {
    name: 'Bharat Natya Rang Mandir',
    nameMr: 'भारत नाट्य रंगमंदिर',
    city: 'Pune',
    address: 'Sadashiv Peth, Pune',
    capacity: null as number | null,
  },
  {
    name: 'Ram Krishna More Auditorium',
    nameMr: 'रामकृष्ण मोरे सभागृह',
    city: 'Pune',
    address: 'Chinchwad / Pimpri-Chinchwad, Pune',
    capacity: null,
  },
  {
    name: 'Vithal Tupe Sabhagruh',
    nameMr: 'विठ्ठल तुपे सभागृह',
    city: 'Pune',
    address: 'Pune',
    capacity: null,
  },
  {
    name: 'Sudarshan Rangmanch',
    nameMr: 'सुदर्शन रंगमंच',
    city: 'Pune',
    address: 'Pune',
    capacity: null,
  },
  {
    name: 'Lokshahir Annabhau Sathe Natyagruha',
    nameMr: 'लोकशाहीर अण्णाभाऊ साठे नाट्यगृह',
    city: 'Pune',
    address: 'Bibwewadi, off Satara Road, Pune',
    capacity: null,
  },
  {
    name: 'Nehru Memorial Hall',
    nameMr: 'नेहरू मेमोरियल हॉल',
    city: 'Pune',
    address: 'Camp, Pune',
    capacity: null,
  },
  {
    name: 'Shivaji Mandir',
    nameMr: 'शिवाजी मंदिर',
    city: 'Mumbai',
    address: 'Dadar West, Mumbai',
    capacity: null,
  },
  {
    name: 'Prabodhankar Thackeray Natya Mandir',
    nameMr: 'प्रबोधनकार ठाकरे नाट्य मंदिर',
    city: 'Mumbai',
    address: 'Vile Parle East, Mumbai',
    capacity: null,
  },
];

async function main() {
  const raw = process.env.DATABASE_URL || '';
  const url = raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
  const p = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  for (const v of VENUES) {
    const found = await p.query(
      `SELECT id FROM venues WHERE lower(name) = lower($1) AND lower(city) = lower($2) LIMIT 1`,
      [v.name, v.city]
    );
    if (found.rowCount) {
      await p.query(
        `UPDATE venues SET name_mr=$2, address=$3, verification_status='verified', state='Maharashtra'
         WHERE id=$1`,
        [found.rows[0].id, v.nameMr, v.address]
      );
      console.log('updated', v.name, found.rows[0].id);
    } else {
      const ins = await p.query(
        `INSERT INTO venues (name, name_mr, address, city, state, total_capacity, has_seat_layout, verification_status, is_template, ownership_type)
         VALUES ($1,$2,$3,$4,'Maharashtra', COALESCE($5, 600), 0, 'verified', 1, 'public_theatre')
         RETURNING id`,
        [v.name, v.nameMr, v.address, v.city, v.capacity]
      );
      console.log('inserted', v.name, ins.rows[0].id);
    }
  }

  const c = await p.query(`SELECT COUNT(*)::int AS n, verification_status FROM venues GROUP BY verification_status`);
  console.log(c.rows);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
