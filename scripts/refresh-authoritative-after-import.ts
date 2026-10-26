/**
 * After clean import: list verified NCPA/public theatres and rewrite
 * data/authoritative_theatres.json with live IDs. Read + write file only;
 * DB read-only except we only SELECT venues.
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

config({ override: true });

function poolUrl() {
  const raw = process.env.DATABASE_URL || '';
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

async function main() {
  const p = new pg.Pool({
    connectionString: poolUrl(),
    ssl: { rejectUnauthorized: false },
  });
  try {
    const verified = (
      await p.query(
        `SELECT id, name, city, district_id, city_id, total_capacity, verification_status
         FROM venues
         WHERE verification_status = 'verified'
         ORDER BY id`
      )
    ).rows;

    const counts = (
      await p.query(
        `SELECT verification_status, COUNT(*)::int AS c FROM venues GROUP BY 1 ORDER BY 1`
      )
    ).rows;

    const out = {
      version: 3,
      generatedAt: new Date().toISOString(),
      sourceLabel: 'POST_CLEAR_THEATER_SQL_IMPORT',
      provenance:
        'IDs assigned after 2026-10-26 catalogue clear + safe theater-sql import. Old IDs 1–66 retired.',
      authoritativeTheatreIds: verified.map((v: { id: number }) => v.id),
      authoritativeTheatres: verified.map(
        (v: { id: number; name: string; city: string }) => ({
          id: v.id,
          name: v.name,
          city: v.city,
          evidence: 'verified_status_after_import',
        })
      ),
      seedUpdatedManifestIds: [],
      pendingOwnerConfirmIds: [],
      protectedPreserveIds: [],
      notes: [
        'Unverified research cinemas are catalogue-only (admin). Public /api/venues defaults to authoritative allowlist.',
        'No event sessions created — users cannot book until organizer publishes showtimes.',
        'Seat layouts empty (has_seat_layout=0) until designer / verified map.',
      ],
      venueCountsByStatus: counts,
    };

    const filePath = path.join(process.cwd(), 'data', 'authoritative_theatres.json');
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(out, null, 2));
    console.log('WROTE', filePath);
  } finally {
    await p.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
