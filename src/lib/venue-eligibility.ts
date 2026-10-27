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
 * - verification_status === 'verified' (full 409 catalogue: unverified = research-only)
 * Authoritative allowlist is a featured subset for public defaults, not the only event venue.
 */
export function isEligibleForNewEvent(opts: {
  venueId: number;
  verificationStatus: string | null | undefined;
  catalog?: AuthoritativeTheatresFile;
}): { ok: true } | { ok: false; reason: string } {
  const id = Number(opts.venueId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, reason: 'venueId is required and must be a positive integer' };
  }
  if ((opts.verificationStatus || '').toLowerCase() !== 'verified') {
    return {
      ok: false,
      reason: `Venue #${id} is not verified (status=${opts.verificationStatus || 'null'})`,
    };
  }
  return { ok: true };
}
