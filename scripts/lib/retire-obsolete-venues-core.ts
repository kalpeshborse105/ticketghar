/**
 * Pure helpers for retiring obsolete venues (no DB I/O).
 * Retire = mark verification_status unverified — never hard-delete protected history.
 */

export type VenueDepRow = {
  id: number;
  name: string;
  verification_status: string;
  orders: number;
  tickets: number;
  scans: number;
  reviews: number;
  events: number;
};

export type RetirePlan = {
  retainAuthoritative: number[];
  retireCandidates: number[];
  skipProtected: Array<{ id: number; reason: string }>;
  skipPendingOwner: Array<{ id: number; reason: string }>;
  skipAlreadyRetired: number[];
  skipUnknown: Array<{ id: number; reason: string }>;
};

export function buildRetirePlan(opts: {
  venues: VenueDepRow[];
  authoritativeIds: number[];
  pendingOwnerConfirmIds: number[];
  protectedPreserveIds: number[];
  /** Explicit obsolete IDs to retire (from inventory). Empty = derive zero-dep non-authoritative. */
  obsoleteIds?: number[];
}): RetirePlan {
  const auth = new Set(opts.authoritativeIds.map(Number));
  const pending = new Set(opts.pendingOwnerConfirmIds.map(Number));
  const protectedIds = new Set(opts.protectedPreserveIds.map(Number));
  const byId = new Map(opts.venues.map((v) => [v.id, v]));

  const skipProtected: RetirePlan['skipProtected'] = [];
  const skipPendingOwner: RetirePlan['skipPendingOwner'] = [];
  const skipAlreadyRetired: number[] = [];
  const skipUnknown: RetirePlan['skipUnknown'] = [];
  const retireCandidates: number[] = [];

  const candidates =
    opts.obsoleteIds && opts.obsoleteIds.length > 0
      ? opts.obsoleteIds.map(Number)
      : opts.venues
          .filter((v) => !auth.has(v.id) && !pending.has(v.id))
          .map((v) => v.id);

  for (const id of candidates) {
    if (auth.has(id)) {
      skipUnknown.push({ id, reason: 'Refusing to retire authoritative theatre' });
      continue;
    }
    if (pending.has(id)) {
      skipPendingOwner.push({
        id,
        reason: 'Pending owner confirm — not auto-retired',
      });
      continue;
    }
    const v = byId.get(id);
    if (!v) {
      skipUnknown.push({ id, reason: 'Venue id missing in live set' });
      continue;
    }
    if (protectedIds.has(id) || v.orders > 0 || v.tickets > 0 || v.scans > 0 || v.reviews > 0) {
      skipProtected.push({
        id,
        reason: `Protected history orders=${v.orders} tickets=${v.tickets} scans=${v.scans} reviews=${v.reviews}`,
      });
      continue;
    }
    if ((v.verification_status || '').toLowerCase() === 'unverified') {
      skipAlreadyRetired.push(id);
      continue;
    }
    retireCandidates.push(id);
  }

  return {
    retainAuthoritative: [...auth].sort((a, b) => a - b),
    retireCandidates: [...new Set(retireCandidates)].sort((a, b) => a - b),
    skipProtected,
    skipPendingOwner,
    skipAlreadyRetired,
    skipUnknown,
  };
}

/** Post-apply assertions (pure) */
export function assertRetentionIntact(opts: {
  beforeAuth: Array<{ id: number; name: string; verification_status: string }>;
  afterAuth: Array<{ id: number; name: string; verification_status: string }>;
}): string[] {
  const errors: string[] = [];
  if (opts.beforeAuth.length !== opts.afterAuth.length) {
    errors.push(
      `Authoritative count changed: before=${opts.beforeAuth.length} after=${opts.afterAuth.length}`
    );
  }
  const afterById = new Map(opts.afterAuth.map((v) => [v.id, v]));
  for (const b of opts.beforeAuth) {
    const a = afterById.get(b.id);
    if (!a) {
      errors.push(`Authoritative venue #${b.id} missing after retire`);
      continue;
    }
    if (a.name !== b.name) {
      errors.push(`Authoritative #${b.id} name changed: "${b.name}" → "${a.name}"`);
    }
    if ((a.verification_status || '').toLowerCase() !== 'verified') {
      errors.push(`Authoritative #${b.id} lost verified status`);
    }
  }
  return errors;
}
