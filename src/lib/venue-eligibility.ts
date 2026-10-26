/**
 * Event-creation venue eligibility.
 * Authoritative theatre IDs come from data/authoritative_theatres.json (manifest provenance).
 */
import fs from 'fs';
import path from 'path';

export type AuthoritativeTheatresFile = {
  authoritativeTheatreIds: number[];
  pendingOwnerConfirmIds?: number[];
  protectedPreserveIds?: number[];
};

let cached: AuthoritativeTheatresFile | null = null;

export function loadAuthoritativeTheatres(
  rootDir: string = process.cwd()
): AuthoritativeTheatresFile {
  if (cached) return cached;
  const filePath = path.join(rootDir, 'data', 'authoritative_theatres.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as AuthoritativeTheatresFile;
  if (!Array.isArray(raw.authoritativeTheatreIds) || raw.authoritativeTheatreIds.length === 0) {
    throw new Error('authoritative_theatres.json missing authoritativeTheatreIds');
  }
  cached = raw;
  return raw;
}

/** Test helper — clear cache between unit tests */
export function resetAuthoritativeTheatresCache() {
  cached = null;
}

export function isAuthoritativeTheatreId(
  venueId: number,
  catalog: AuthoritativeTheatresFile = loadAuthoritativeTheatres()
): boolean {
  return catalog.authoritativeTheatreIds.includes(Number(venueId));
}

/**
 * Eligible for NEW event creation:
 * - Must be in authoritative allowlist (provenance-backed)
 * - Must be verification_status === 'verified' in DB
 * Pending / protected / retired venues are not selectable for new events.
 */
export function isEligibleForNewEvent(opts: {
  venueId: number;
  verificationStatus: string | null | undefined;
  catalog?: AuthoritativeTheatresFile;
}): { ok: true } | { ok: false; reason: string } {
  const catalog = opts.catalog || loadAuthoritativeTheatres();
  const id = Number(opts.venueId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, reason: 'venueId is required and must be a positive integer' };
  }
  if (!isAuthoritativeTheatreId(id, catalog)) {
    return {
      ok: false,
      reason: `Venue #${id} is not in the authoritative new-theatre allowlist for event creation`,
    };
  }
  if ((opts.verificationStatus || '').toLowerCase() !== 'verified') {
    return {
      ok: false,
      reason: `Venue #${id} is not verified (status=${opts.verificationStatus || 'null'})`,
    };
  }
  return { ok: true };
}
