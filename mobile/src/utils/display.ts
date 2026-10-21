/**
 * Display helpers — English-first labels with Marathi fallback
 */
import { useUIStore } from '../store';

export function displayTitle(
  item?: { title?: string | null; titleMr?: string | null } | null,
  overrideLang?: string
): string {
  if (!item) return 'Event';
  const lang = overrideLang || useUIStore.getState().language;
  if (lang === 'mr') {
    return item.titleMr || item.title || 'कार्यक्रम';
  }
  return item.title || item.titleMr || 'Event';
}

export function displayDescription(
  item?: { description?: string | null; descriptionMr?: string | null } | null,
  overrideLang?: string
): string {
  if (!item) return '';
  const lang = overrideLang || useUIStore.getState().language;
  if (lang === 'mr') {
    return item.descriptionMr || item.description || '';
  }
  return item.description || item.descriptionMr || '';
}

export function displayVenueName(
  venue?: { name?: string | null; nameMr?: string | null } | null,
  overrideLang?: string
): string {
  if (!venue) return '';
  const lang = overrideLang || useUIStore.getState().language;
  if (lang === 'mr') {
    return venue.nameMr || venue.name || '';
  }
  return venue.name || venue.nameMr || '';
}

/** Prefer absolute HTTP(S) poster; resolve relative paths against API origin */
export function resolveMediaUrl(
  raw?: string | null,
  apiBase?: string | null
): string | null {
  if (!raw) return null;
  const u = String(raw).trim();
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  if (u.startsWith('/') && apiBase) {
    return `${apiBase.replace(/\/$/, '')}${u}`;
  }
  return null;
}

export function resolvePosterUrl(
  posterUrl?: string | null,
  bannerUrl?: string | null,
  apiBase?: string | null
): string | null {
  return (
    resolveMediaUrl(posterUrl, apiBase) ||
    resolveMediaUrl(bannerUrl, apiBase)
  );
}

const CITY_MAP_MR: Record<string, string> = {
  All: 'सर्व महाराष्ट्र',
  Pune: 'पुणे',
  Mumbai: 'मुंबई',
  Nashik: 'नाशिक',
  Kolhapur: 'कोल्हापूर',
  Nagpur: 'नागपूर',
  Thane: 'ठाणे',
  Aurangabad: 'छत्रपती संभाजीनगर',
  'Chhatrapati Sambhajinagar': 'छत्रपती संभाजीनगर',
  Satara: 'सातारा',
  Sangli: 'सांगली',
  Solapur: 'सोलापूर',
  NaviMumbai: 'नवी मुंबई',
  'Navi Mumbai': 'नवी मुंबई',
};

export function displayCity(city?: string | null, overrideLang?: string): string {
  if (!city) return '';
  const lang = overrideLang || useUIStore.getState().language;
  if (lang === 'mr') {
    return CITY_MAP_MR[city] || city;
  }
  return city === 'All' ? 'All Maharashtra' : city;
}
