/**
 * Pure venue↔location repair helpers (no DB I/O).
 * Used by repair-venue-locations.ts and offline tests.
 */

export type EvidenceLevel = 'verified' | 'heuristic' | 'unresolved';

export type CityRow = {
  id: number;
  name: string;
  district_id: number | null;
};

export type DistrictRow = {
  id: number;
  name: string;
  code: string;
};

export type VenueRow = {
  id: number;
  name: string;
  city: string;
  address: string;
  district_id: number | null;
  city_id: number | null;
  verification_status: string;
};

export type ProposedChange = {
  venueId: number;
  name: string;
  field: 'city_id' | 'district_id';
  from: number | null;
  to: number;
  reason: string;
  evidenceLevel: EvidenceLevel;
};

export type UnresolvedItem = {
  venueId: number;
  name: string;
  city: string;
  address: string;
  reason: string;
  evidenceLevel: 'unresolved';
};

export type DuplicateReview = {
  keepId: number;
  otherId: number;
  note: string;
  recommendation: 'manual_review_only';
  deps: Record<string, number>;
};

/** Official renames only — unique target names in cities catalog */
export const CITY_ALIASES: Record<string, string> = {
  ahmednagar: 'Ahilyanagar',
  ahmadnagar: 'Ahilyanagar',
  vasai: 'Vasai-Virar',
  'vasai virar': 'Vasai-Virar',
  aurangabad: 'Chhatrapati Sambhajinagar',
  osmanabad: 'Dharashiv',
};

/**
 * Cities whose free-text name alone cannot choose among Mumbai City vs Suburban
 * (or similar). city_id may still link if the cities.name row is unique.
 */
export const DISTRICT_AMBIGUOUS_CITY_TEXTS = new Set(['mumbai']);

/**
 * District corrections allowed only when venue id + address evidence both match.
 * Never apply from city text "Mumbai" alone.
 */
export const DISTRICT_CORRECTIONS: Array<{
  venueId: number;
  districtName: string;
  addressEvidence: RegExp;
  reason: string;
}> = [
  {
    venueId: 2,
    districtName: 'Mumbai Suburban',
    addressEvidence: /vile\s*parle/i,
    reason: 'Address contains Vile Parle East → Mumbai Suburban (not Pune)',
  },
  {
    venueId: 12,
    districtName: 'Mumbai Suburban',
    addressEvidence: /vile\s*parle/i,
    reason: 'Address contains Vile Parle East → Mumbai Suburban (not Thane)',
  },
  {
    venueId: 4,
    districtName: 'Thane',
    addressEvidence: /thane/i,
    reason: 'City+address Thane West / Ghodbunder — district was wrongly Pune',
  },
  {
    venueId: 5,
    districtName: 'Pune',
    addressEvidence: /pune|shivajinagar|senapati\s*bapat/i,
    reason: 'Pavilion Mall address is Pune — district was wrongly Mumbai City',
  },
  {
    venueId: 6,
    districtName: 'Pune',
    addressEvidence: /pune|aundh|parihar/i,
    reason: 'Westend Mall address is Pune — district was wrongly Mumbai City',
  },
  {
    venueId: 7,
    districtName: 'Mumbai Suburban',
    addressEvidence: /ghatkopar/i,
    reason: 'R City Mall Ghatkopar West → Mumbai Suburban (not Mumbai City)',
  },
  {
    venueId: 9,
    districtName: 'Mumbai Suburban',
    addressEvidence: /vile\s*parle/i,
    reason: 'Prabodhankar Thackeray — Vile Parle East → Mumbai Suburban',
  },
  // NCPA complex — Nariman Point is Mumbai City (Island City)
  {
    venueId: 8,
    districtName: 'Mumbai City',
    addressEvidence: /nariman\s*point|ncpa/i,
    reason: 'NCPA Experimental — Nariman Point → Mumbai City',
  },
  {
    venueId: 59,
    districtName: 'Mumbai City',
    addressEvidence: /nariman\s*point|ncpa/i,
    reason: 'Jamshed Bhabha (NCPA) — Nariman Point → Mumbai City',
  },
  {
    venueId: 60,
    districtName: 'Mumbai City',
    addressEvidence: /nariman\s*point|ncpa/i,
    reason: 'Tata Theatre (NCPA) — Nariman Point → Mumbai City',
  },
  {
    venueId: 61,
    districtName: 'Mumbai City',
    addressEvidence: /nariman\s*point|ncpa/i,
    reason: 'Godrej Dance Theatre (NCPA) — Nariman Point → Mumbai City',
  },
];

export const SUSPECTED_DUPLICATE_PAIRS: Array<{
  keepId: number;
  otherId: number;
  note: string;
}> = [
  {
    keepId: 2,
    otherId: 12,
    note: 'Same display name + Vile Parle address — likely seed duplicate; do not merge/auto-unverify',
  },
  {
    keepId: 3,
    otherId: 53,
    note: 'Same display name + Kothrud Pune address — likely seed duplicate; do not merge/auto-unverify',
  },
];

export function norm(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveCityTargetName(cityText: string): string {
  const n = norm(cityText);
  return CITY_ALIASES[n] || cityText.trim();
}

/**
 * Resolve city row. Never picks the "first" of multiple matches — returns unresolved.
 */
export function resolveCityRow(
  cityText: string,
  cities: CityRow[]
): { ok: true; city: CityRow } | { ok: false; reason: string } {
  const target = resolveCityTargetName(cityText);
  const matches = cities.filter((c) => norm(c.name) === norm(target));
  if (matches.length === 0) {
    return { ok: false, reason: `No cities row for "${cityText}" (target "${target}")` };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      reason: `Ambiguous city name "${target}" matched ${matches.length} rows — refuse first-match`,
    };
  }
  return { ok: true, city: matches[0] };
}

export function findDistrictByName(
  name: string,
  districts: DistrictRow[]
): DistrictRow | null {
  const matches = districts.filter((d) => norm(d.name) === norm(name));
  if (matches.length !== 1) return null;
  return matches[0];
}

export function isMumbaiFamilyCityText(cityText: string): boolean {
  return DISTRICT_AMBIGUOUS_CITY_TEXTS.has(norm(cityText));
}

export type BuildPlanInput = {
  venues: VenueRow[];
  cities: CityRow[];
  districts: DistrictRow[];
};

export type BuildPlanResult = {
  proposed: ProposedChange[];
  unresolved: UnresolvedItem[];
  focusReview: Record<number, unknown>;
};

/**
 * Build repair plan. Does not propose verification_status changes.
 */
export function buildRepairPlan(input: BuildPlanInput): BuildPlanResult {
  const { venues, cities, districts } = input;
  const proposed: ProposedChange[] = [];
  const unresolved: UnresolvedItem[] = [];

  const correctionById = new Map(DISTRICT_CORRECTIONS.map((c) => [c.venueId, c]));

  for (const v of venues) {
    const cityRes = resolveCityRow(v.city, cities);

    if (!cityRes.ok) {
      unresolved.push({
        venueId: v.id,
        name: v.name,
        city: v.city,
        address: v.address,
        reason: cityRes.reason,
        evidenceLevel: 'unresolved',
      });
    } else {
      const cityRow = cityRes.city;
      if (v.city_id == null || Number(v.city_id) !== Number(cityRow.id)) {
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'city_id',
          from: v.city_id,
          to: cityRow.id,
          reason: `Link city_id to unique cities.id=${cityRow.id} (${cityRow.name}) from text "${v.city}"`,
          evidenceLevel: 'verified',
        });
      }

      // District fill from city FK — blocked for Mumbai free-text
      if (
        v.district_id == null &&
        cityRow.district_id != null &&
        !isMumbaiFamilyCityText(v.city) &&
        !correctionById.has(v.id)
      ) {
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'district_id',
          from: null,
          to: cityRow.district_id,
          reason: `Fill null district_id from cities.district_id for ${cityRow.name}`,
          evidenceLevel: 'verified',
        });
      } else if (
        v.district_id == null &&
        isMumbaiFamilyCityText(v.city) &&
        !correctionById.has(v.id)
      ) {
        unresolved.push({
          venueId: v.id,
          name: v.name,
          city: v.city,
          address: v.address,
          reason:
            'Cannot infer Mumbai City vs Mumbai Suburban from city text "Mumbai" alone — need address evidence or manual district',
          evidenceLevel: 'unresolved',
        });
      } else if (
        cityRow.district_id != null &&
        v.district_id != null &&
        Number(v.district_id) !== Number(cityRow.district_id) &&
        !isMumbaiFamilyCityText(v.city) &&
        !correctionById.has(v.id)
      ) {
        // Non-Mumbai inconsistency: align to city catalog district
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'district_id',
          from: v.district_id,
          to: cityRow.district_id,
          reason: `Align venue.district_id to cities.district_id for ${cityRow.name}`,
          evidenceLevel: 'verified',
        });
      }
    }

    // Address-evidenced district corrections
    const corr = correctionById.get(v.id);
    if (corr) {
      const dist = findDistrictByName(corr.districtName, districts);
      if (!dist) {
        unresolved.push({
          venueId: v.id,
          name: v.name,
          city: v.city,
          address: v.address,
          reason: `Canonical district "${corr.districtName}" not found uniquely in districts table`,
          evidenceLevel: 'unresolved',
        });
      } else if (!corr.addressEvidence.test(v.address || '')) {
        unresolved.push({
          venueId: v.id,
          name: v.name,
          city: v.city,
          address: v.address,
          reason: `District correction for #${v.id} skipped — address lacks required evidence /${corr.addressEvidence.source}/`,
          evidenceLevel: 'unresolved',
        });
      } else if (Number(v.district_id) !== Number(dist.id)) {
        proposed.push({
          venueId: v.id,
          name: v.name,
          field: 'district_id',
          from: v.district_id,
          to: dist.id,
          reason: corr.reason,
          evidenceLevel: 'verified',
        });
      }
    }
  }

  // Dedupe proposed: same venue+field keep last (district correction wins over fill)
  const keyed = new Map<string, ProposedChange>();
  for (const p of proposed) {
    keyed.set(`${p.venueId}:${p.field}`, p);
  }
  const deduped = [...keyed.values()].sort((a, b) => a.venueId - b.venueId || a.field.localeCompare(b.field));

  const focusIds = [2, 12, 3, 53, 4, 5, 6, 7];
  const focusReview: Record<number, unknown> = {};
  for (const id of focusIds) {
    const v = venues.find((x) => x.id === id);
    if (!v) {
      focusReview[id] = { missing: true };
      continue;
    }
    focusReview[id] = {
      venue: v,
      proposed: deduped.filter((p) => p.venueId === id),
      unresolved: unresolved.filter((u) => u.venueId === id),
    };
  }

  return { proposed: deduped, unresolved, focusReview };
}

export type ApprovalArtifact = {
  approvedAt: string;
  approvedBy: string;
  baselineGeneratedAt: string;
  productionConfirm?: string;
  backupConfirmed: boolean;
  changes: Array<{
    venueId: number;
    field: 'city_id' | 'district_id';
    from: number | null;
    to: number;
  }>;
};

export function changeKey(ch: {
  venueId: number;
  field: string;
  from: number | null;
  to: number;
}): string {
  return `${ch.venueId}:${ch.field}:${ch.from}:${ch.to}`;
}

/**
 * Require approval.baselineGeneratedAt === reviewed dry-run generatedAt,
 * and that the live plan still matches that dry-run's proposed rows (no drift).
 */
export function validateBaselineAgainstPlan(
  approval: ApprovalArtifact,
  baseline: { generatedAt: string; proposed: ProposedChange[] },
  currentPlan: ProposedChange[]
): string[] {
  const errors: string[] = [];
  if (!baseline?.generatedAt) {
    errors.push('Baseline dry-run file missing generatedAt');
    return errors;
  }
  if (approval.baselineGeneratedAt !== baseline.generatedAt) {
    errors.push(
      `baselineGeneratedAt mismatch: approval=${approval.baselineGeneratedAt} baselineFile=${baseline.generatedAt}`
    );
  }
  const currentKeys = new Set(currentPlan.map(changeKey));
  const baselineKeys = new Set((baseline.proposed || []).map(changeKey));
  for (const k of baselineKeys) {
    if (!currentKeys.has(k)) {
      errors.push(`Plan drifted vs reviewed baseline — missing/changed proposed row: ${k}`);
    }
  }
  for (const k of currentKeys) {
    if (!baselineKeys.has(k)) {
      errors.push(`Plan drifted vs reviewed baseline — new proposed row not in baseline: ${k}`);
    }
  }
  return errors;
}

export function validateApprovalAgainstPlan(
  approval: ApprovalArtifact,
  plan: ProposedChange[],
  opts: { hostIsProduction: boolean; productionFlag: boolean }
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!approval.backupConfirmed) {
    errors.push('backupConfirmed must be true');
  }
  if (!approval.baselineGeneratedAt) {
    errors.push('baselineGeneratedAt required (must match dry-run generatedAt)');
  }
  if (!Array.isArray(approval.changes) || approval.changes.length === 0) {
    errors.push('changes[] must list exact approved field updates');
  }
  if (opts.hostIsProduction) {
    if (approval.productionConfirm !== 'I_CONFIRM_PRODUCTION_WRITE') {
      errors.push('productionConfirm must be exactly I_CONFIRM_PRODUCTION_WRITE for production hosts');
    }
    if (!opts.productionFlag) {
      errors.push('Pass --i-confirm-production on the CLI for production hosts');
    }
  }

  const planKey = new Map(plan.map((p) => [changeKey(p), p]));
  const seen = new Set<string>();
  for (const ch of approval.changes || []) {
    if (ch.field !== 'city_id' && ch.field !== 'district_id') {
      errors.push(`Invalid field "${(ch as any).field}" — only city_id|district_id allowed`);
      continue;
    }
    if (typeof ch.venueId !== 'number' || !Number.isFinite(ch.venueId)) {
      errors.push(`Invalid venueId in approval: ${ch.venueId}`);
      continue;
    }
    if (typeof ch.to !== 'number' || !Number.isFinite(ch.to)) {
      errors.push(`Invalid target id for venue #${ch.venueId} ${ch.field}: ${ch.to}`);
      continue;
    }
    const key = changeKey(ch);
    if (seen.has(key)) {
      errors.push(`Duplicate approved row: ${key}`);
    }
    seen.add(key);
    if (!planKey.has(key)) {
      errors.push(
        `Approved change not in current plan (extra/stale/changed): venue ${ch.venueId} ${ch.field} ${ch.from}→${ch.to}`
      );
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Ensure live DB still matches the approved `from` baseline for each change */
export function detectStaleBaseline(
  approvalChanges: ApprovalArtifact['changes'],
  liveVenues: VenueRow[]
): string[] {
  const byId = new Map(liveVenues.map((v) => [v.id, v]));
  const errors: string[] = [];
  for (const ch of approvalChanges) {
    const v = byId.get(ch.venueId);
    if (!v) {
      errors.push(`Venue #${ch.venueId} missing in live DB`);
      continue;
    }
    const live = ch.field === 'city_id' ? v.city_id : v.district_id;
    const liveN = live == null ? null : Number(live);
    const fromN = ch.from == null ? null : Number(ch.from);
    if (liveN !== fromN) {
      errors.push(
        `Stale baseline venue #${ch.venueId} ${ch.field}: live=${liveN} approved.from=${fromN}`
      );
    }
  }
  return errors;
}
