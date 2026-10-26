/**
 * Build a simple sectioned theatre layout from total capacity.
 * Admin: enter total seats + seats/row → Gold / Silver / Balcony auto rows.
 */

export type AutoLayoutTier = 'gold' | 'silver' | 'standard';

export type AutoLayoutSectionSpec = {
  name: string;
  nameMr: string;
  tier: AutoLayoutTier;
  basePrice: number; // rupees
  /** Fraction of total seats (must sum ≈ 1) */
  share: number;
};

export const DEFAULT_SECTION_SPECS: AutoLayoutSectionSpec[] = [
  { name: 'Gold', nameMr: 'गोल्ड', tier: 'gold', basePrice: 500, share: 0.2 },
  { name: 'Silver', nameMr: 'सिल्व्हर', tier: 'silver', basePrice: 350, share: 0.5 },
  { name: 'Balcony', nameMr: 'बाल्कनी', tier: 'standard', basePrice: 250, share: 0.3 },
];

export type BuiltSeat = {
  seatNumber: number;
  tier: AutoLayoutTier;
  isAccessible: number;
  isBlocked: number;
};

export type BuiltRow = {
  rowLabel: string;
  aisleAfter: number[];
  middleGap: { enabled: boolean; afterSeat: number };
  seats: BuiltSeat[];
};

export type BuiltSection = {
  name: string;
  nameMr: string;
  basePrice: number;
  tier: AutoLayoutTier;
  rows: BuiltRow[];
};

function rowLabel(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return `${first}${second}`;
}

function buildRows(seatCount: number, seatsPerRow: number, tier: AutoLayoutTier): BuiltRow[] {
  const per = Math.max(1, Math.floor(seatsPerRow));
  const rows: BuiltRow[] = [];
  let remaining = Math.max(0, Math.floor(seatCount));
  let r = 0;
  while (remaining > 0) {
    const n = Math.min(per, remaining);
    const after = Math.max(1, Math.ceil(n / 2));
    rows.push({
      rowLabel: rowLabel(r),
      aisleAfter: [],
      middleGap: { enabled: n >= 4, afterSeat: Math.min(after, n - 1) },
      seats: Array.from({ length: n }).map((_, i) => ({
        seatNumber: i + 1,
        tier,
        isAccessible: i < 2 ? 1 : 0,
        isBlocked: 0,
      })),
    });
    remaining -= n;
    r += 1;
  }
  return rows;
}

/**
 * Allocate exact `totalSeats` across section shares; last section absorbs rounding.
 */
export function buildAutoTheatreLayout(opts: {
  totalSeats: number;
  seatsPerRow: number;
  specs?: AutoLayoutSectionSpec[];
}): { sections: BuiltSection[]; totalSeats: number } {
  const total = Math.max(1, Math.floor(opts.totalSeats));
  const perRow = Math.max(1, Math.floor(opts.seatsPerRow));
  const specs = opts.specs?.length ? opts.specs : DEFAULT_SECTION_SPECS;

  const shares = specs.map((s) => Math.max(0, s.share));
  const shareSum = shares.reduce((a, b) => a + b, 0) || 1;
  const counts = shares.map((s) => Math.floor((total * s) / shareSum));
  let allocated = counts.reduce((a, b) => a + b, 0);
  // Give remainder to largest share section
  let rem = total - allocated;
  const largestIdx = shares.indexOf(Math.max(...shares));
  counts[largestIdx] += rem;

  const sections: BuiltSection[] = specs.map((spec, i) => ({
    name: spec.name,
    nameMr: spec.nameMr,
    basePrice: spec.basePrice,
    tier: spec.tier,
    rows: buildRows(counts[i], perRow, spec.tier),
  }));

  const actual = sections.reduce(
    (acc, sec) => acc + sec.rows.reduce((a, r) => a + r.seats.length, 0),
    0
  );

  return { sections, totalSeats: actual };
}
