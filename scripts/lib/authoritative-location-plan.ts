/**
 * Pure planning helpers for authoritative venue location repair SQL.
 * District for Mumbai-family cities requires address evidence — never city text alone.
 */

export type CityRow = { id: number; name: string; district_id: number | null };
export type DistrictRow = { id: number; name: string; code: string };
export type VenueSnap = {
  id: number;
  name: string;
  city: string;
  address: string;
  city_id: number | null;
  district_id: number | null;
  verification_status: string;
};

export type FieldUpdate = {
  venueId: number;
  field: 'city_id' | 'district_id';
  from: number | null;
  to: number;
  reason: string;
};

export type PlanResult = {
  updates: FieldUpdate[];
  unresolved: string[];
  finalByVenue: Record<
    number,
    { city_id: number | null; district_id: number | null; verification_status: string }
  >;
};

export function norm(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveUniqueCity(
  cityText: string,
  cities: CityRow[]
): { ok: true; city: CityRow } | { ok: false; reason: string } {
  const matches = cities.filter((c) => norm(c.name) === norm(cityText));
  if (matches.length === 0) {
    return { ok: false, reason: `No unique cities row for "${cityText}"` };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      reason: `Ambiguous city "${cityText}" matched ${matches.length} rows — refuse first-match`,
    };
  }
  return { ok: true, city: matches[0] };
}

export function resolveUniqueDistrict(
  name: string,
  districts: DistrictRow[]
): { ok: true; district: DistrictRow } | { ok: false; reason: string } {
  const matches = districts.filter((d) => norm(d.name) === norm(name));
  if (matches.length !== 1) {
    return {
      ok: false,
      reason: `District "${name}" matched ${matches.length} rows (need exactly 1)`,
    };
  }
  return { ok: true, district: matches[0] };
}

export function isMumbaiFamilyCityText(cityText: string): boolean {
  return norm(cityText) === 'mumbai';
}

export function addressSupportsMumbaiCity(address: string): boolean {
  return /nariman\s*point|ncpa|dadar|fort\b|colaba|churchgate|girgaon|cuffe\s*parade/i.test(
    address || ''
  );
}

export function addressSupportsPune(address: string, cityText: string): boolean {
  return /\bpune\b|पुणे|camp|sadashiv|bibwewadi|chinchwad|pimpri/i.test(
    `${cityText} ${address}`
  );
}

export function cityDistrictCompatible(city: CityRow, districtId: number | null): boolean {
  if (districtId == null) return true;
  if (city.district_id == null) return true;
  return Number(city.district_id) === Number(districtId);
}

export function evidencedDistrictName(v: VenueSnap): string | null {
  if (isMumbaiFamilyCityText(v.city)) {
    if (addressSupportsMumbaiCity(v.address)) return 'Mumbai City';
    return null;
  }
  if (addressSupportsPune(v.address, v.city) || norm(v.city) === 'pune') {
    return 'Pune';
  }
  return null;
}

export function buildAuthoritativeLocationPlan(opts: {
  venues: VenueSnap[];
  cities: CityRow[];
  districts: DistrictRow[];
  authoritativeIds: number[];
}): PlanResult {
  const updates: FieldUpdate[] = [];
  const unresolved: string[] = [];
  const finalByVenue: PlanResult['finalByVenue'] = {};
  const byId = new Map(opts.venues.map((v) => [Number(v.id), v]));

  for (const id of opts.authoritativeIds) {
    const v = byId.get(Number(id));
    if (!v) {
      unresolved.push(`Missing authoritative venue #${id} in live DB`);
      continue;
    }

    const venueUpdates: FieldUpdate[] = [];
    const venueIssues: string[] = [];
    let nextCityId = v.city_id == null ? null : Number(v.city_id);
    let nextDistrictId = v.district_id == null ? null : Number(v.district_id);

    const distName = evidencedDistrictName(v);
    if (distName) {
      const distRes = resolveUniqueDistrict(distName, opts.districts);
      if (!distRes.ok) {
        venueIssues.push(`#${v.id} ${distRes.reason}`);
      } else if (nextDistrictId !== Number(distRes.district.id)) {
        venueUpdates.push({
          venueId: v.id,
          field: 'district_id',
          from: v.district_id,
          to: distRes.district.id,
          reason: `Address evidence → ${distName} (districts.id=${distRes.district.id})`,
        });
        nextDistrictId = distRes.district.id;
      }
    } else if (isMumbaiFamilyCityText(v.city) && nextDistrictId == null) {
      venueIssues.push(
        `#${v.id} Cannot set district from city text "Mumbai" alone — need locality evidence`
      );
    }

    const cityRes = resolveUniqueCity(v.city, opts.cities);
    if (!cityRes.ok) {
      venueIssues.push(`#${v.id} ${cityRes.reason}`);
    } else if (isMumbaiFamilyCityText(v.city) && nextDistrictId == null) {
      venueIssues.push(
        `#${v.id} Skip city_id until Mumbai City vs Suburban district is evidenced`
      );
    } else if (!cityDistrictCompatible(cityRes.city, nextDistrictId)) {
      venueIssues.push(
        `#${v.id} Refuse city_id=${cityRes.city.id} (${cityRes.city.name}): catalog district_id=${cityRes.city.district_id} incompatible with venue district_id=${nextDistrictId}`
      );
    } else if (nextCityId !== Number(cityRes.city.id)) {
      venueUpdates.push({
        venueId: v.id,
        field: 'city_id',
        from: v.city_id,
        to: cityRes.city.id,
        reason: `Unique cities.id=${cityRes.city.id} (${cityRes.city.name}); compatible with district_id=${nextDistrictId}`,
      });
      nextCityId = cityRes.city.id;
    }

    if (nextCityId != null && nextDistrictId != null) {
      const cityRow = opts.cities.find((c) => Number(c.id) === Number(nextCityId));
      if (cityRow && !cityDistrictCompatible(cityRow, nextDistrictId)) {
        venueIssues.push(
          `#${v.id} Final pair city_id=${nextCityId} / district_id=${nextDistrictId} incompatible with cities.district_id=${cityRow.district_id}`
        );
      }
    }

    if (venueIssues.length) {
      unresolved.push(...venueIssues);
      // Keep current values when blocked — do not apply partial conflicting updates
      finalByVenue[v.id] = {
        city_id: v.city_id == null ? null : Number(v.city_id),
        district_id: v.district_id == null ? null : Number(v.district_id),
        verification_status: v.verification_status,
      };
    } else {
      updates.push(...venueUpdates);
      finalByVenue[v.id] = {
        city_id: nextCityId,
        district_id: nextDistrictId,
        verification_status: v.verification_status,
      };
    }
  }

  return { updates, unresolved, finalByVenue };
}

export function renderAuthoritativeRepairSql(opts: {
  authoritativeIds: number[];
  venues: VenueSnap[];
  updates: FieldUpdate[];
  finalByVenue: PlanResult['finalByVenue'];
  generatedAt: string;
}): string {
  const ids = opts.authoritativeIds.join(',');
  const lines: string[] = [
    '-- AUTHORITATIVE THEATRE LOCATION REPAIR',
    `-- generatedAt: ${opts.generatedAt}`,
    `-- venue IDs: ${ids}`,
    '-- Changes ONLY venues.city_id / venues.district_id.',
    '-- Does NOT change names, verification_status, events, orders, tickets, payments, scans.',
    '-- Default: ROLLBACK. Change final ROLLBACK to COMMIT only after owner approval.',
    '',
    'BEGIN;',
    '',
    '-- ===== PRECONDITIONS (exact before values) =====',
    'DO $$',
    'BEGIN',
  ];

  for (const v of opts.venues) {
    const cityPred = v.city_id == null ? 'city_id IS NULL' : `city_id = ${Number(v.city_id)}`;
    const distPred =
      v.district_id == null ? 'district_id IS NULL' : `district_id = ${Number(v.district_id)}`;
    const status = v.verification_status.replace(/'/g, "''");
    lines.push(
      `  IF NOT EXISTS (`,
      `    SELECT 1 FROM venues`,
      `    WHERE id = ${v.id}`,
      `      AND ${cityPred}`,
      `      AND ${distPred}`,
      `      AND verification_status = '${status}'`,
      `  ) THEN`,
      `    RAISE EXCEPTION 'Precondition failed for venue #%', ${v.id};`,
      `  END IF;`
    );
  }

  lines.push(
    `  IF (SELECT COUNT(*)::int FROM venues WHERE id IN (${ids})) <> ${opts.authoritativeIds.length} THEN`,
    `    RAISE EXCEPTION 'Authoritative venue count mismatch';`,
    `  END IF;`,
    'END $$;',
    '',
    '-- ===== UPDATES (idempotent WHERE matches from-value) =====',
    ''
  );

  for (const u of opts.updates) {
    const fromPred =
      u.from == null ? `${u.field} IS NULL` : `${u.field} IS NOT DISTINCT FROM ${u.from}`;
    lines.push(
      `-- venue #${u.venueId} ${u.field}: ${u.from} → ${u.to} | ${u.reason}`,
      `UPDATE venues`,
      `SET ${u.field} = ${u.to}`,
      `WHERE id = ${u.venueId}`,
      `  AND ${fromPred}`,
      `  AND id IN (${ids});`,
      ''
    );
  }

  lines.push('-- ===== POSTCONDITIONS =====', 'DO $$', 'BEGIN');

  for (const id of opts.authoritativeIds) {
    const fin = opts.finalByVenue[id];
    const v = opts.venues.find((x) => Number(x.id) === Number(id));
    if (!fin || !v) continue;
    const cityPred = fin.city_id == null ? 'city_id IS NULL' : `city_id = ${fin.city_id}`;
    const distPred =
      fin.district_id == null ? 'district_id IS NULL' : `district_id = ${fin.district_id}`;
    const status = v.verification_status.replace(/'/g, "''");
    lines.push(
      `  IF NOT EXISTS (`,
      `    SELECT 1 FROM venues`,
      `    WHERE id = ${id}`,
      `      AND ${cityPred}`,
      `      AND ${distPred}`,
      `      AND verification_status = '${status}'`,
      `  ) THEN`,
      `    RAISE EXCEPTION 'Postcondition failed for venue #%', ${id};`,
      `  END IF;`
    );
  }

  lines.push(
    `  IF EXISTS (`,
    `    SELECT 1`,
    `    FROM venues v`,
    `    JOIN cities c ON c.id = v.city_id`,
    `    WHERE v.id IN (${ids})`,
    `      AND v.city_id IS NOT NULL`,
    `      AND v.district_id IS NOT NULL`,
    `      AND c.district_id IS NOT NULL`,
    `      AND c.district_id IS DISTINCT FROM v.district_id`,
    `  ) THEN`,
    `    RAISE EXCEPTION 'City/district catalog mismatch among authoritative venues';`,
    `  END IF;`,
    'END $$;',
    '',
    'ROLLBACK; -- Owner: change to COMMIT after review',
    ''
  );

  return lines.join('\n');
}
