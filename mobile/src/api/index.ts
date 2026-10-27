/**
 * MahaTicket API Layer (महाटिकिट)
 * Authoritative path: React Native → Next.js `/api/*` → PostgreSQL (same as web).
 * No direct Supabase REST for catalog, booking, reviews, or tickets.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URL Resolution (Dev server fallback) ───────────────────────────────

// Production API — official domain (not vercel.app)
const PROD_API_URL = 'https://mahaticket.kalpkrutinfotech.com';
const DEV_URLS = [
  PROD_API_URL,
  'http://192.168.31.154:3000',
  'http://10.0.2.2:3000',
];
const STORAGE_KEY = '@mahaticket_api_base';

let resolvedBase: string | null = null;
let _couponsCache: any[] | null = null;
let _couponsCacheAt = 0;
const COUPONS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveApiBase(): Promise<string> {
  if (resolvedBase) return resolvedBase;

  const stored =
    (await AsyncStorage.getItem(STORAGE_KEY).catch(() => null)) ||
    (await AsyncStorage.getItem('@tg_api_base').catch(() => null));

  if (stored && /vercel\.app/i.test(stored)) {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => null);
    await AsyncStorage.removeItem('@tg_api_base').catch(() => null);
  }

  const storedOk =
    stored &&
      !/vercel\.app/i.test(stored) &&
      stored.replace(/\/$/, '') !== PROD_API_URL
      ? stored.replace(/\/$/, '')
      : null;

  if (storedOk) {
    resolvedBase = storedOk;
    fetch(`${storedOk}/api/health`, {
      signal: typeof (AbortSignal as any).timeout === 'function' ? (AbortSignal as any).timeout(1500) : undefined,
    })
      .then((res) => {
        if (!res.ok) {
          resolvedBase = PROD_API_URL;
          AsyncStorage.setItem(STORAGE_KEY, PROD_API_URL).catch(() => null);
        }
      })
      .catch(() => {
        resolvedBase = PROD_API_URL;
      });
    return storedOk;
  }

  // Dev / Metro builds: prefer LAN so phone matches localhost admin data.
  // Release APK: use production so catalog matches the live site (deploy required for API changes).
  if (__DEV__) {
    const localCandidates = [
      'http://10.0.2.2:3000',
      'http://192.168.31.154:3000',
      'http://127.0.0.1:3000',
    ];
    for (const url of localCandidates) {
      try {
        const localRes = await fetch(`${url}/api/health`, {
          signal:
            typeof (AbortSignal as any).timeout === 'function'
              ? (AbortSignal as any).timeout(900)
              : undefined,
        });
        if (localRes.ok) {
          resolvedBase = url;
          await AsyncStorage.setItem(STORAGE_KEY, url).catch(() => null);
          return resolvedBase;
        }
      } catch {
        // try next
      }
    }
  }

  resolvedBase = PROD_API_URL;
  AsyncStorage.setItem(STORAGE_KEY, PROD_API_URL).catch(() => null);
  return PROD_API_URL;
}

export function getApiBase() {
  return resolvedBase || DEV_URLS[0];
}

/** Absolute media URL for posters stored as /uploads/... or full https */
export function absoluteMediaUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const u = String(raw).trim();
  if (!u || u === 'null' || u === 'undefined') return null;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  const base = getApiBase().replace(/\/$/, '');
  if (u.startsWith('/')) return `${base}${u}`;
  return `${base}/${u}`;
}

/** Return empty if DB poster/banner is missing; components render neutral placeholder */
export function fallbackPosterUrl(eventId?: number | string | null): string {
  return '';
}

/** Ensure every event has normalized absolute HTTP(S) posterUrl & bannerUrl with stable Picsum fallback */
export function normalizeEvent<T extends Partial<EventItem> & Record<string, any>>(raw: T): EventItem {
  const id = raw?.id ?? 0;
  const posterUrl =
    absoluteMediaUrl(raw?.posterUrl ?? raw?.poster_url) ||
    absoluteMediaUrl(raw?.bannerUrl ?? raw?.banner_url) ||
    fallbackPosterUrl(id);
  const bannerUrl =
    absoluteMediaUrl(raw?.bannerUrl ?? raw?.banner_url) ||
    posterUrl;
  const base = {
    ...(raw as unknown as EventItem),
    posterUrl,
    bannerUrl,
    homeSessionId: raw?.homeSessionId ?? (raw as any)?.home_session_id ?? null,
    showTimeStr: raw?.showTimeStr ?? (raw as any)?.show_time_str ?? null,
  } as EventItem & { homeSessionId?: number | null; showTimeStr?: string | null };
  const { homeSession, hasBookableSessions, nextBookable } = pickHomeSession(
    base.sessions,
    base.homeSessionId
  );
  const bookablePrices = (nextBookable?.ticketTypes || [])
    .filter((t) => Number(t.availableQuota || 0) > 0)
    .map((t) => Number(t.price || 0))
    .filter((p) => p > 0);
  // Prefer server Asia/Kolkata showDateStr when present
  const serverShow = base.showDateStr || null;
  return {
    ...base,
    homeSessionId: base.homeSessionId ?? homeSession?.id ?? null,
    showDateStr: serverShow
      ? serverShow
      : homeSession
        ? formatCardDate(homeSession.sessionStartTime)
        : null,
    showTimeStr: base.showTimeStr || null,
    hasBookableSessions:
      typeof base.hasBookableSessions === 'boolean'
        ? base.hasBookableSessions || hasBookableSessions
        : hasBookableSessions,
    minPrice: bookablePrices.length > 0 ? Math.min(...bookablePrices) : base.minPrice,
  };
}

export async function setApiBase(url: string) {
  resolvedBase = url;
  await AsyncStorage.setItem(STORAGE_KEY, url);
}

// ─── HTTP Client for Local API ───────────────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token =
      (await AsyncStorage.getItem('@tg_session_token')) ||
      (await AsyncStorage.getItem('@mahaticket_session_token'));
    // Only send real HMAC tokens — never fabricated mt-tok-* leftovers
    if (token && token.includes('.') && !token.startsWith('mt-tok') && !token.startsWith('mt-token')) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch { }
  return {};
}

async function request<T>(
  path: string,
  init?: RequestInit & { timeout?: number; correlationId?: string; signal?: AbortSignal }
): Promise<T> {
  const correlationId =
    init?.correlationId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();
  const base = await resolveApiBase();
  const ctrl = new AbortController();
  const timeout = init?.timeout ?? 15000;
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const authHeaders = await getAuthHeader();

  if (init?.signal) {
    if (init.signal.aborted) {
      clearTimeout(timer);
      throw new ApiError('Request cancelled', 499, { correlationId, cancelled: true });
    }
    init.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-App-Platform': 'android',
        'X-App-Version': '1.0.26',
        'X-Correlation-Id': correlationId,
        ...authHeaders,
        ...(init?.headers || {}),
      },
    });
    clearTimeout(timer);
    const elapsedMs = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = (data as any)?.error || `HTTP ${res.status}`;
      const details = (data as any)?.details;
      throw new ApiError(
        details ? `${errMsg}: ${details}` : errMsg,
        res.status,
        { ...data, correlationId, elapsedMs }
      );
    }
    return data as T;
  } catch (err: any) {
    clearTimeout(timer);
    const elapsedMs = Date.now() - startTime;
    const isAborted = err?.name === 'AbortError' || init?.signal?.aborted;
    if (err instanceof ApiError) throw err;
    if (isAborted) {
      throw new ApiError('Request timed out', 408, { correlationId, elapsedMs, aborted: true });
    }
    throw new ApiError(`Network error: ${err?.message}`, 0, { correlationId, elapsedMs });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 0,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type EventCategory =
  | 'plays'
  | 'movies'
  | 'music'
  | 'comedy'
  | 'cultural'
  | 'workshops'
  | 'sports'
  | 'festivals'
  | 'family'
  | 'business'
  | 'all';

export interface CastMember {
  name: string;
  nameMr: string;
  role: string;
  roleMr: string;
  avatarUrl?: string | null;
}

export interface EventItem {
  id: number;
  title: string;
  titleMr: string;
  slug: string;
  category: string;
  categoryMr: string;
  language: string;
  ageGuidance?: string;
  durationMinutes?: number;
  description?: string;
  descriptionMr?: string;
  posterUrl: string;
  bannerUrl?: string | null;
  status: string;
  featured?: number;
  isPromoted?: boolean;
  isInformational?: boolean; // For events like 'Mamachya Govyala Jauya' (TicketAlay reference)
  interestedCount?: number;
  minPrice?: number | null;
  rating?: number | null;
  ratingCount?: number | null;
  ratingCountStr?: string | null;
  showDateStr?: string | null;
  showTimeStr?: string | null;
  homeSessionId?: number | null;
  hasBookableSessions?: boolean;
  trailerUrl?: string | null;
  cast?: string | null;
  castCrewList?: CastMember[] | null;
  tag?: string | null;
  venue?: VenueItem | null;
  sessions?: SessionItem[] | null;
  organizer?: { id?: number; name?: string; companyName?: string } | null;
}

export interface VenueItem {
  id: number;
  name: string;
  nameMr: string;
  address: string;
  city: string;
  state: string;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  facilities?: string | null;
  totalCapacity: number;
  hasSeatLayout: number;
}

export interface SessionItem {
  id: number;
  eventId: number;
  sessionStartTime: string;
  sessionEndTime: string;
  status: string;
  ticketTypes?: TicketTypeItem[];
  availableInventoryCount?: number | null;
  hasSeatInventory?: boolean | null;
  isSoldOut?: boolean;
}

export interface TicketTypeItem {
  id: number;
  name: string;
  nameMr: string;
  price: number; // paise
  totalQuota: number;
  availableQuota: number;
  isSeated: number;
}

function isAllCitiesValue(city?: string | null): boolean {
  const value = String(city || '').trim().toLowerCase();
  if (!value) return false;
  return value.includes('all') || value.includes('महाराष्ट्र');
}

export function sessionUsesSeatMap(
  session: Pick<SessionItem, 'ticketTypes'> | null | undefined
): boolean {
  return (session?.ticketTypes || []).some((ticketType) => Number(ticketType?.isSeated) === 1);
}

export function getSessionAvailableCount(
  session: Pick<SessionItem, 'ticketTypes' | 'availableInventoryCount'> | null | undefined
): number {
  if (typeof session?.availableInventoryCount === 'number') {
    return Math.max(0, session.availableInventoryCount);
  }
  return Math.max(
    0,
    (session?.ticketTypes || []).reduce(
      (sum, ticketType) => sum + Math.max(0, Number(ticketType?.availableQuota || 0)),
      0
    )
  );
}

export function isSessionSoldOut(session: SessionItem | null | undefined): boolean {
  if (!session) return false;
  if (typeof session.isSoldOut === 'boolean') return session.isSoldOut;
  return getSessionAvailableCount(session) <= 0;
}

export function hasBookableInventory(session: SessionItem | null | undefined): boolean {
  return isUpcomingSession(session) && !isSessionSoldOut(session);
}

/** Short card date matching what Event Detail will book next */
export function formatCardDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function sessionHasInventorySignal(session: SessionItem): boolean {
  return (
    typeof session.availableInventoryCount === 'number' ||
    typeof session.isSoldOut === 'boolean' ||
    (Array.isArray(session.ticketTypes) && session.ticketTypes.length > 0)
  );
}

/** Same next-session rule as Home cards + Event Detail + web homeSessionId */
export function pickHomeSession(
  sessions: SessionItem[] | null | undefined,
  preferredId?: number | null
): {
  nextBookable: SessionItem | null;
  nextUpcoming: SessionItem | null;
  homeSession: SessionItem | null;
  hasBookableSessions: boolean;
  hasInventoryData: boolean;
} {
  const upcoming = filterUpcomingSessions(sessions).sort(
    (a, b) =>
      new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
  );
  const hasInventoryData = upcoming.some(sessionHasInventorySignal);
  const preferred =
    preferredId != null
      ? upcoming.find((s) => Number(s.id) === Number(preferredId)) || null
      : null;
  const nextBookable = hasInventoryData
    ? upcoming.find(
      (s) => getSessionAvailableCount(s) > 0 && s.status !== 'sold_out' && !s.isSoldOut
    ) || null
    : upcoming[0] || null;
  const nextUpcoming = upcoming[0] || null;
  return {
    nextBookable,
    nextUpcoming,
    homeSession: preferred || nextBookable || nextUpcoming,
    hasBookableSessions: hasInventoryData ? !!nextBookable : upcoming.length > 0,
    hasInventoryData,
  };
}

export function getEventCardDateLabel(
  event: Pick<EventItem, 'sessions' | 'showDateStr' | 'hasBookableSessions'> & {
    homeSessionId?: number | null;
    showTimeStr?: string | null;
  },
  language: 'mr' | 'en' = 'mr'
): string {
  // Prefer server-formatted canonical fields (Asia/Kolkata)
  if (event.hasBookableSessions && event.showDateStr) {
    return event.showTimeStr ? `${event.showDateStr} • ${event.showTimeStr}` : event.showDateStr;
  }
  const { homeSession, hasBookableSessions, nextUpcoming, hasInventoryData } = pickHomeSession(
    event.sessions,
    (event as any).homeSessionId
  );
  if (hasBookableSessions && homeSession) {
    return formatCardDate(homeSession.sessionStartTime);
  }
  if (typeof event.hasBookableSessions === 'boolean' && event.hasBookableSessions && event.showDateStr) {
    return event.showDateStr;
  }
  // Only show Sold Out when inventory signals exist (or API flagged it)
  if (
    (hasInventoryData || event.hasBookableSessions === false) &&
    nextUpcoming &&
    !hasBookableSessions
  ) {
    return language === 'mr' ? 'हाऊसफुल (Sold Out)' : 'Sold Out';
  }
  if (event.showDateStr) return event.showDateStr;
  return language === 'mr' ? 'आगामी प्रयोग • तारीख लवकरच' : 'Upcoming • Dates soon';
}

export interface SeatItem {
  seatId: number;
  sectionId: number;
  rowLabel: string;
  seatNumber: number;
  seatCode: string;
  price: number; // paise
  status: 'available' | 'held' | 'booked' | 'blocked' | 'selected';
  tier?: string | null;
  sectionName?: string | null;
  sectionNameMr?: string | null;
  ticketTypeName?: string | null;
  ticketTypeNameMr?: string | null;
}

export interface SeatLayoutConfig {
  sections?: Array<{
    name: string;
    nameMr: string;
    rows?: Array<{
      rowLabel: string;
      aisleAfter?: number[];
    }>;
  }>;
}

export interface HoldResult {
  holdToken: string;
  hold: {
    faceValueTotal: number; // paise
    holdExpiresAt: string; // ISO
  };
}

export interface OrderItem {
  id: number;
  orderNumber: string;
  eventId: number;
  sessionId: number;
  ticketCount: number;
  ticketFaceValueTotal: number;
  platformFeeTotal: number;
  taxTotal: number;
  gatewayCostEstimate: number;
  discountTotal: number;
  grandTotal: number;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string | null;
  createdAt: string;
  event?: EventItem;
  session?: SessionItem;
  tickets?: TicketDetailItem[];
  /** Short-lived server token for authorized PDF download */
  pdfDownloadToken?: string;
}

export interface TicketDetailItem {
  id: number;
  ticketCode: string;
  orderId: number;
  sessionId: number;
  seatCode: string;
  attendeeName?: string;
  faceValue: number;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  qrPayload: string;
  qrDataUrl?: string;
  createdAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  city?: string | null;
}

export interface CouponResult {
  valid: boolean;
  couponCode?: string;
  discountType?: 'percent' | 'flat';
  discountValue?: number;
  discountAmount?: number; // paise
  message?: string;
}

export interface PricingBreakdown {
  ticketCount: number;
  ticketFaceValueTotal: number;
  platformFeeTotal: number;
  taxTotal: number;
  gatewayCostEstimate: number;
  discountTotal: number;
  grandTotal: number;
  appliedCoupon?: string | null;
}

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  orderDbId: number;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/** Parse cast_crew DB text — may be JSON array or comma-separated names (never show raw JSON). */
export function parseCastCrew(raw: unknown): CastMember[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((m: any, i: number) => {
        if (typeof m === 'string') {
          const name = m.trim();
          if (!name || name.startsWith('{') || name.startsWith('[')) return null;
          return {
            name,
            nameMr: name,
            role: i === 0 ? 'Lead' : 'Cast',
            roleMr: i === 0 ? 'मुख्य भूमिका' : 'कलाकार',
          };
        }
        const name = String(m?.nameMr || m?.name || '').trim();
        if (!name) return null;
        return {
          name,
          nameMr: String(m?.nameMr || m?.name || name).trim(),
          role: String(m?.role || 'Cast'),
          roleMr: String(m?.roleMr || m?.role || 'कलाकार'),
          avatarUrl: absoluteMediaUrl(m?.avatarUrl || m?.avatar_url),
        };
      })
      .filter(Boolean) as CastMember[];
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return parseCastCrew(JSON.parse(trimmed));
      } catch {
        // fall through — strip JSON-looking fragments
        return [];
      }
    }
    return trimmed
      .split(',')
      .map((name, i) => {
        const n = name.trim();
        if (!n || n.includes('"role"') || n.includes('{')) return null;
        return {
          name: n,
          nameMr: n,
          role: i === 0 ? 'Lead' : 'Cast',
          roleMr: i === 0 ? 'मुख्य भूमिका' : 'कलाकार',
        };
      })
      .filter(Boolean) as CastMember[];
  }
  return [];
}

/** Staff roles that match DB `users.role` (not only legacy mobile `admin`). */
export type AppStaffRole =
  | 'organizer'
  | 'admin'
  | 'super_admin'
  | 'scanner'
  | 'manager'
  | 'operations'
  | 'finance';

export function normalizeAppRole(role?: string | null): string {
  return String(role || 'customer').trim().toLowerCase();
}

/** Super-admin and legacy admin both unlock admin UI. */
export function isAdminRole(role?: string | null): boolean {
  const r = normalizeAppRole(role);
  return r === 'admin' || r === 'super_admin';
}

/** Gate scanner access: organizers, scanners, ops, and admins. */
export function canScanTickets(role?: string | null): boolean {
  const r = normalizeAppRole(role);
  return (
    r === 'organizer' ||
    r === 'scanner' ||
    r === 'manager' ||
    r === 'operations' ||
    r === 'admin' ||
    r === 'super_admin'
  );
}

export function isOrganizerOrStaff(role?: string | null): boolean {
  return canScanTickets(role) || normalizeAppRole(role) === 'finance';
}

/** Session is bookable only if active and not long expired. */
export function isUpcomingSession(
  session: { sessionStartTime?: string; sessionEndTime?: string; status?: string } | null | undefined
): boolean {
  if (!session?.sessionStartTime) return false;
  if (session.status === 'cancelled' || session.status === 'completed') return false;
  const t = new Date(session.sessionStartTime).getTime();
  if (Number.isNaN(t)) return false;
  if (session.sessionEndTime) {
    const endT = new Date(session.sessionEndTime).getTime();
    if (!Number.isNaN(endT) && endT < Date.now()) return false;
  }
  return t > Date.now() - 30 * 60 * 1000;
}

export function filterUpcomingSessions<T extends { sessionStartTime?: string; status?: string }>(
  sessions: T[] | null | undefined
): T[] {
  return (sessions || []).filter(isUpcomingSession);
}

/**
 * Gate sessions: include live / in-progress shows (not only future start times).
 * Booking uses `filterUpcomingSessions`; scanners must not drop today's started show.
 */
export function isScannableSession(
  session: { sessionStartTime?: string; sessionEndTime?: string; status?: string } | null | undefined
): boolean {
  if (!session?.sessionStartTime) return false;
  if (session.status === 'cancelled') return false;
  const now = Date.now();
  const startT = new Date(session.sessionStartTime).getTime();
  if (Number.isNaN(startT)) return false;

  if (session.sessionEndTime) {
    const endT = new Date(session.sessionEndTime).getTime();
    if (!Number.isNaN(endT)) {
      // 2h grace after scheduled end for late exits / intermission
      return now <= endT + 2 * 60 * 60 * 1000;
    }
  }
  // No end time: allow from 4h before start through 8h after start
  return now >= startT - 4 * 60 * 60 * 1000 && now <= startT + 8 * 60 * 60 * 1000;
}

export function filterScannableSessions<
  T extends { sessionStartTime?: string; sessionEndTime?: string; status?: string },
>(sessions: T[] | null | undefined): T[] {
  const list = (sessions || []).filter(isScannableSession);
  return list.length ? list : (sessions || []).filter((s) => s.status !== 'cancelled');
}

export const getFutureIso = (dayOffset: number, hour: number, min: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

// ─── Static MahaTicket Theatre & Events Database ─────────────────────────────
// Real curated data for instant 0ms launch & offline cache (including TicketAlay & TicketKhidakee reference shows)

export const STATIC_MAHATICKET_EVENTS: EventItem[] = [];

const CACHE_EVENTS_KEY = '@mahaticket_cached_events';

// In-memory cache for instant 0ms access
let inMemoryEvents: EventItem[] | null = null;

/**
 * Catalog must come from the shared Next.js API (same DB as web).
 * Direct Supabase REST mapping invented phantom fields and diverged from web —
 * intentionally removed. Offline: disk/memory cache of last successful API payload only.
 */

// ─── API Methods ─────────────────────────────────────────────────────────────

// Fast In-Memory Query Caching (Instant screen loads, zero network delay on revisit)
const eventsQueryCache = new Map<string, { data: EventItem[]; expires: number }>();
const singleEventCache = new Map<number, { data: EventItem; expires: number }>();

export const api = {
  // Health
  health: () => request<{ status: string }>('/api/health'),

  // Events — authoritative backend API only (same catalog as web)
  getEvents: async (params?: {
    city?: string;
    category?: string;
    search?: string;
    limit?: number;
    /** Scanner / admin: include past showtimes */
    includeEnded?: boolean;
  }): Promise<{ events: EventItem[] }> => {
    const parts: string[] = [];
    if (params?.city && !isAllCitiesValue(params.city)) parts.push(`city=${encodeURIComponent(params.city)}`);
    if (params?.category && params.category !== 'all') parts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.search?.trim()) parts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params?.limit) parts.push(`limit=${encodeURIComponent(String(params.limit))}`);
    if (params?.includeEnded) parts.push('includeEnded=1');
    const cacheKey = parts.join('&');

    // Instant return if queried recently (12s TTL)
    const now = Date.now();
    const cached = eventsQueryCache.get(cacheKey);
    if (cached && cached.expires > now) {
      return { events: cached.data };
    }

    try {
      const res = await request<{ events: EventItem[] }>(`/api/events${cacheKey ? `?${cacheKey}` : ''}`);
      if (Array.isArray(res?.events)) {
        const mapped = res.events.map(normalizeEvent);
        inMemoryEvents = mapped;
        eventsQueryCache.set(cacheKey, { data: mapped, expires: now + 12000 });
        AsyncStorage.setItem(CACHE_EVENTS_KEY, JSON.stringify(mapped)).catch(() => null);
        return { events: mapped };
      }
    } catch {
      /* fall through to last-known API cache — never invent via Supabase */
    }

    let baseList: EventItem[] = inMemoryEvents || [];

    if (!inMemoryEvents) {
      try {
        const stored = await AsyncStorage.getItem(CACHE_EVENTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            inMemoryEvents = parsed;
            baseList = parsed;
          }
        }
      } catch { }
    }

    let mapped = baseList.map(normalizeEvent);

    if (params?.city && !isAllCitiesValue(params.city)) {
      const cityLower = params.city.toLowerCase();
      const cityFiltered = mapped.filter(
        (e) => !e.venue?.city || e.venue?.city?.toLowerCase() === cityLower
      );
      if (cityFiltered.length > 0) {
        mapped = cityFiltered;
      }
    }

    if (params?.category && params.category !== 'all') {
      const catLower = params.category.toLowerCase();
      mapped = mapped.filter(
        (e) =>
          e.category.toLowerCase() === catLower ||
          e.categoryMr.toLowerCase() === catLower
      );
    }

    if (params?.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      mapped = mapped.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.titleMr.toLowerCase().includes(q) ||
          e.venue?.name?.toLowerCase().includes(q) ||
          e.venue?.city?.toLowerCase().includes(q)
      );
    }

    if (params?.limit && params.limit > 0) {
      mapped = mapped.slice(0, params.limit);
    }

    return { events: mapped };
  },

  /**
   * Booking-critical event detail — canonical production API only.
   * No silent Supabase / stale-cache booking decisions.
   */
  getEvent: async (id: number): Promise<{ event: EventItem }> => {
    const now = Date.now();
    const cached = singleEventCache.get(id);
    if (cached && cached.expires > now) {
      return { event: cached.data };
    }

    const res = await request<{ event: EventItem }>(`/api/events/${id}`);
    if (!res?.event?.id) {
      throw new Error(
        'कार्यक्रम लोड करता आला नाही. कृपया पुन्हा प्रयत्न करा. (Could not load event — retry)'
      );
    }
    const norm = normalizeEvent(res.event);
    singleEventCache.set(id, { data: norm, expires: now + 12000 });
    return { event: norm };
  },

  // Venues — prefer shared API (same DB as web)
  getVenues: async (city?: string): Promise<{ venues: VenueItem[] }> => {
    return request<{ venues: VenueItem[] }>(
      city && !isAllCitiesValue(city)
        ? `/api/venues?city=${encodeURIComponent(city)}`
        : '/api/venues'
    );
  },

  // Announcements — same backend as web (no hardcoded promo fallbacks)
  getAnnouncements: async (city?: string): Promise<{ announcements: Announcement[] }> => {
    try {
      const q =
        city && !isAllCitiesValue(city) ? `?city=${encodeURIComponent(city)}` : '';
      const res = await request<{ announcements: any[] }>(`/api/announcements${q}`);
      const rows = Array.isArray(res?.announcements) ? res.announcements : [];
      return {
        announcements: rows.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          imageUrl: a.imageUrl || a.image_url || undefined,
          ctaLabel: a.ctaLabel || a.cta_label || undefined,
          ctaUrl: a.ctaUrl || a.cta_url || undefined,
          city: a.city || undefined,
        })),
      };
    } catch {
      return { announcements: [] };
    }
  },

  // Sessions & Seats — same as web: GET /api/sessions/:id/seats (?fresh=1 for live holds)
  getSessionSeats: async (
    sessionId: number,
    opts?: { fresh?: boolean; timeoutMs?: number; signal?: AbortSignal; correlationId?: string }
  ): Promise<{
    seats: SeatItem[];
    sections: any[];
    layoutConfig?: SeatLayoutConfig;
    traceId?: string;
    latencyMs?: number;
  }> => {
    if (!sessionId || Number.isNaN(Number(sessionId))) {
      throw new ApiError('Session not found', 404);
    }
    const q = opts?.fresh ? '?fresh=1' : '';
    const timeout = opts?.timeoutMs ?? (opts?.fresh ? 14000 : 10000);
    const correlationId = opts?.correlationId || `seat_${sessionId}_${Date.now()}`;
    try {
      const data = await request<{
        seats: SeatItem[];
        sections: any[];
        layoutConfig?: SeatLayoutConfig;
        venue?: any;
        traceId?: string;
        latencyMs?: number;
        error?: string;
      }>(`/api/sessions/${sessionId}/seats${q}`, {
        timeout,
        signal: opts?.signal,
        correlationId,
      });
      if (!data || data.error) {
        throw new ApiError(data?.error || 'Failed to load seat layout', 400, data);
      }
      return {
        seats: Array.isArray(data.seats) ? data.seats : [],
        sections: Array.isArray(data.sections) ? data.sections : [],
        layoutConfig: data.layoutConfig || data.venue?.layoutConfig || undefined,
        traceId: data.traceId,
        latencyMs: data.latencyMs,
      };
    } catch (e: any) {
      if (e?.status === 499 || e?.message === 'Request cancelled') {
        throw e;
      }
      if (e?.status === 404 || /session not found/i.test(String(e?.message || ''))) {
        throw new ApiError('Session not found', 404, e?.data);
      }
      const msg = String(e?.message || '');
      if (/timed out|timeout/i.test(msg) || e?.status === 408) {
        throw new ApiError(
          'Seat map load is slow. Please tap Retry seats.',
          408,
          e?.data
        );
      }
      throw e instanceof ApiError ? e : new ApiError(msg || 'Failed to load seat layout', e?.status || 500, e?.data);
    }
  },

  // Hold — same payload as web SeatMapModal
  hold: async (body: {
    sessionId: number;
    seatIds: number[];
    /** @deprecated Ignored by server — ownership is the returned holdToken */
    userIdStr?: string;
  }): Promise<HoldResult> => {
    try {
      const res = await request<any>('/api/bookings/hold', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: body.sessionId,
          seatIds: body.seatIds,
        }),
        timeout: 45000,
      });
      const token = res?.holdToken || res?.hold?.holdToken;
      if (token) {
        return {
          holdToken: token,
          hold: {
            faceValueTotal:
              res.hold?.faceValueTotal ??
              res.faceValueTotal ??
              res.faceValue ??
              0,
            holdExpiresAt:
              res.hold?.holdExpiresAt ||
              res.holdExpiresAt ||
              new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
        };
      }
      throw new Error(res?.error || 'Seat hold failed');
    } catch (e: any) {
      const raw = String(e?.message || e?.data?.error || '');
      if (/timed out|timeout|AbortError|408/i.test(raw)) {
        throw new Error(
          'नेटवर्क हळू आहे — आसन आरक्षण वेळ संपली नाही. कृपया पुन्हा "पुढे जा" दाबा.\n(Network slow — hold timer still active. Tap Proceed again.)'
        );
      }
      if (/currently held|held by|आरक्षित|another/i.test(raw)) {
        throw new Error(
          'निवडलेले आसन सध्या दुसऱ्या ग्राहकाकडे आरक्षित आहे. कृपया इतर उपलब्ध आसन निवडा.\n(Seat held by another user — choose different seats.)'
        );
      }
      throw new Error(
        raw ||
        'Selected seats could not be held. They may have been taken — please refresh the map.'
      );
    }
  },

  releaseHold: async (params: {
    sessionId: number;
    holdToken: string;
    seatIds?: number[];
  }) => {
    return await request<{
      success?: boolean;
      releasedCount?: number;
      message?: string;
      error?: string;
    }>('/api/bookings/release', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 12000,
    });
  },

  // Coupons — same as web CheckoutDrawer: GET/POST /api/coupons
  getCoupons: async () => {
    try {
      if (
        _couponsCache &&
        Date.now() - _couponsCacheAt < COUPONS_CACHE_TTL_MS &&
        _couponsCache.length > 0
      ) {
        return { coupons: _couponsCache };
      }
      const res = await request<{ coupons?: any[]; error?: string }>('/api/coupons', {
        timeout: 8000,
      });
      const list = Array.isArray(res?.coupons) ? res.coupons : [];
      const coupons = list.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType || c.discount_type,
        discountValue: c.discountValue ?? c.discount_value,
        minOrderValue: c.minOrderValue ?? c.min_order_value,
        maxDiscount: c.maxDiscount ?? c.max_discount,
        description:
          (c.discountType || c.discount_type) === 'percentage'
            ? `${(c.discountValue ?? c.discount_value) / 100}% off up to ₹${(c.maxDiscount ?? c.max_discount) / 100}`
            : `Flat ₹${(c.discountValue ?? c.discount_value) / 100} off`,
      }));
      _couponsCache = coupons;
      _couponsCacheAt = Date.now();
      return { coupons };
    } catch {
      return { coupons: _couponsCache || [] };
    }
  },

  applyCoupon: async (
    code: string,
    amountPaise: number
  ): Promise<CouponResult> => {
    try {
      const res = await request<any>('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim(), amount: amountPaise }),
      });
      if (!res?.valid) {
        return {
          valid: false,
          message: res?.error || res?.message || 'Invalid or expired coupon code',
        };
      }
      return {
        valid: true,
        couponCode: res.code || code.trim().toUpperCase(),
        discountAmount: res.discount ?? 0,
        message: res.message || 'Coupon applied successfully!',
      };
    } catch (e: any) {
      return {
        valid: false,
        message: e?.data?.error || e?.message || 'Invalid or expired coupon code',
      };
    }
  },

  // Orders / Payment (Razorpay)
  createRazorpayOrder: async (body: {
    sessionId: number;
    seatIds: number[];
    couponCode?: string | null;
    holdToken?: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    idempotencyKey?: string;
    correlationId?: string;
  }) => {
    const correlationId = body.correlationId || `ord_${body.sessionId}_${Date.now()}`;
    try {
      const res = await request<any>('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify(body),
        timeout: 45000,
        correlationId,
      });
      if (res?.orderId && res?.keyId) {
        return res;
      }
      throw new ApiError(
        res?.error ||
        'Payment order creation failed — please select seats again.',
        400,
        res
      );
    } catch (e: any) {
      const detail = String(e?.data?.details || e?.data?.error || e?.message || '');
      if (/authenti/i.test(detail)) {
        throw new ApiError(
          'Razorpay server keys invalid (Authentication failed). Production needs matching RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.\n\nसर्व्हरवरील Razorpay की चुकीच्या आहेत — पेमेंट सुरू होऊ शकत नाही.',
          401,
          e?.data
        );
      }
      if (e instanceof ApiError) throw e;
      throw new ApiError(String(detail || 'Payment order failed'), e?.status || 500, e?.data);
    }
  },

  verifyPayment: async (body: any, opts?: { correlationId?: string }) => {
    const correlationId = opts?.correlationId || `ver_${body.sessionId}_${Date.now()}`;
    const res = await request<any>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      timeout: 30000,
      correlationId,
    });

    // Check if reconciliation is required (e.g. late payment, conflict)
    if (res?.reconciliationRequired) {
      return res;
    }

    if (res && (res.success || res.orderNumber || res.order)) {
      const orderPayload = res.order || res;
      // Only cache authoritative orders with server-generated tickets into My Tickets
      if (
        (orderPayload.orderStatus === 'confirmed' || orderPayload.paymentStatus === 'captured') &&
        Array.isArray(orderPayload.tickets) &&
        orderPayload.tickets.length > 0
      ) {
        try {
          const myStr = await AsyncStorage.getItem('@tg_my_orders');
          const myOrders = myStr ? JSON.parse(myStr) : [];
          const orderKey = String(orderPayload.orderNumber || orderPayload.id);
          const filtered = Array.isArray(myOrders)
            ? myOrders.filter((o: any) => String(o.orderNumber || o.id) !== orderKey)
            : [];
          filtered.unshift(orderPayload);
          await AsyncStorage.setItem('@tg_my_orders', JSON.stringify(filtered.slice(0, 30)));
        } catch { }
      }
      eventsQueryCache.clear();
      return res;
    }
    throw new ApiError(res?.error || 'Payment verification failed', 400, res);
  },

  /**
   * @deprecated Use `verifyPayment` after Razorpay — same canonical path as web.
   * Kept for rare legacy callers; maps onto `/api/payments/verify` when payment IDs present.
   */
  confirmBooking: async (body: {
    sessionId: number;
    eventId: number;
    seatIds: number[];
    userName: string;
    userEmail: string;
    userPhone: string;
    couponCode?: string | null;
    paymentDetails?: any;
  }) => {
    const pd = body.paymentDetails || {};
    if (pd.razorpay_payment_id || pd.razorpayPaymentId) {
      return api.verifyPayment({
        sessionId: body.sessionId,
        eventId: body.eventId,
        seatIds: body.seatIds,
        couponCode: body.couponCode,
        userName: body.userName,
        userEmail: body.userEmail,
        userPhone: body.userPhone,
        razorpay_order_id: pd.razorpay_order_id || pd.razorpayOrderId,
        razorpay_payment_id: pd.razorpay_payment_id || pd.razorpayPaymentId,
        razorpay_signature: pd.razorpay_signature || pd.razorpaySignature,
      });
    }
    throw new ApiError(
      'Use verifyPayment after Razorpay success. Legacy bookings/confirm is not used by checkout.',
      400
    );
  },

  // User Profile
  getProfile: async (): Promise<{ user?: any; token?: string }> => {
    return request<{ user?: any; token?: string }>('/api/auth/flow/session');
  },

  // Orders / Tickets
  getMyOrders: async (): Promise<{ orders: OrderItem[] }> => {
    return api.getMyTickets();
  },

  getOrder: async (orderNumber: string): Promise<{ order: OrderItem }> => {
    return request<{ order: OrderItem }>(
      `/api/orders?orderNumber=${encodeURIComponent(orderNumber)}`
    );
  },

  /**
   * Authenticated My Tickets — server session / Bearer only.
   * Does not accept email/phone as authorization and does not return cache as proof of ownership.
   */
  getMyTickets: async (_userEmail?: string, _userPhone?: string): Promise<{ orders: OrderItem[] }> => {
    const res = await request<{ orders: OrderItem[] }>('/api/orders');
    const orders = Array.isArray(res?.orders) ? res.orders : [];
    return { orders };
  },

  // Live UI Home Sections Customization (Admin controlled)
  getHomeSections: () =>
    request<{ success: boolean; sections: any[] }>('/api/sections'),

  // Gate Scanner — scoped to organizer event + session (no demo accept)
  verifyTicketScan: async (
    ticketCodeOrPayload: string,
    scope?: {
      targetEventId?: number;
      targetSessionId?: number;
      scannerOrganizerId?: number;
      gateName?: string;
      scannerUserId?: number | string;
    }
  ): Promise<{
    valid: boolean;
    status: 'valid' | 'already_used' | 'invalid';
    message: string;
    ticket?: any;
    order?: any;
    scanResult?: string;
  }> => {
    let cleanCode = ticketCodeOrPayload.trim();
    if (cleanCode.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.ticketCode || parsed.code || cleanCode;
      } catch { }
    }

    if (!scope?.targetEventId && !scope?.targetSessionId) {
      return {
        valid: false,
        status: 'invalid',
        message:
          'कृपया स्कॅन करण्यापूर्वी कार्यक्रम व शो निवडा (Select event & showtime first).',
      };
    }

    const serverRes = await request<any>('/api/scanner/verify', {
      method: 'POST',
      body: JSON.stringify({
        ticketCodeOrPayload: cleanCode,
        gateName: scope?.gateName || 'Gate 1',
        scannerDevice: 'MahaTicket Android Scanner',
        scannerUserId: scope?.scannerUserId || null,
        targetEventId: scope?.targetEventId || null,
        targetSessionId: scope?.targetSessionId || null,
        scannerOrganizerId: scope?.scannerOrganizerId || null,
        requireScope: true,
      }),
      timeout: 12000,
    });

    if (serverRes && typeof serverRes.valid === 'boolean') {
      const scanResult = String(serverRes.scanResult || '');
      const status = serverRes.valid
        ? 'valid'
        : scanResult === 'ALREADY_USED'
          ? 'already_used'
          : 'invalid';

      let message =
        serverRes.message || (serverRes.valid ? 'प्रवेश मंजूर!' : 'अवैध तिकीट!');
      if (!serverRes.valid && scanResult === 'WRONG_EVENT') {
        message =
          serverRes.message ||
          'हे तिकीट निवडलेल्या कार्यक्रमाचे नाही. योग्य कार्यक्रम निवडा (Wrong event).';
      } else if (!serverRes.valid && scanResult === 'WRONG_SESSION') {
        message =
          serverRes.message ||
          'हे तिकीट निवडलेल्या शो वेळेशी जुळत नाही. योग्य शो निवडा (Wrong showtime).';
      } else if (!serverRes.valid && scanResult === 'WRONG_ORGANIZER') {
        message =
          serverRes.message ||
          'हे तिकीट तुमच्या आयोजक कार्यक्षेत्राबाहेर आहे (Unauthorized organizer).';
      }

      return {
        valid: serverRes.valid,
        status,
        message,
        ticket: serverRes.ticket
          ? {
            ticketCode: serverRes.ticket.code || cleanCode,
            seatCode: serverRes.ticket.seat || serverRes.ticket.seats,
            attendeeName: serverRes.ticket.attendee || serverRes.guest?.name,
            email: serverRes.ticket.email || serverRes.guest?.email,
            phone: serverRes.ticket.phone || serverRes.guest?.phone,
            grandTotal: serverRes.ticket.grandTotal ?? serverRes.guest?.grandTotal,
            paymentStatus: serverRes.ticket.paymentStatus || serverRes.guest?.paymentStatus,
            orderNumber: serverRes.ticket.orderNumber || serverRes.guest?.orderNumber,
            eventTitle: serverRes.ticket.eventMr || serverRes.ticket.event,
            showtime: serverRes.ticket.showtime,
            showtimeLabel: serverRes.ticket.showtimeLabel,
            venue: serverRes.ticket.venue,
          }
          : undefined,
        order: serverRes.order,
        guest: serverRes.guest,
      };
    }

    return {
      valid: false,
      status: 'invalid',
      message:
        serverRes?.error ||
        'अवैध तिकीट! प्रणालीमध्ये नोंद आढळली नाही (Invalid or Counterfeit Ticket)',
    };
  },

  saveReminder: async (body: {
    eventId: number;
    title?: string;
    deviceToken?: string | null;
  }): Promise<{ success: boolean; stored: boolean }> => {
    try {
      return await request<{ success: boolean; stored: boolean }>('/api/reminders', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch {
      return { success: true, stored: false };
    }
  },

  // Reviews & Ratings
  getEventReviews: async (eventId: number): Promise<{
    reviews: Array<{
      id: number;
      author: string;
      email: string;
      city: string;
      rating: number;
      date: string;
      comment: string;
      verified: boolean;
    }>;
    totalCount: number;
    averageRating: number;
    breakdown: { five: number; four: number; three: number; two: number; one: number };
  }> => {
    // Same backend as web — never invent reviews via Supabase or hardcoded samples
    try {
      const res = await request<any>(`/api/events/${eventId}/reviews`);
      if (res && typeof res.totalCount === 'number') {
        return res;
      }
    } catch { }
    return {
      reviews: [],
      totalCount: 0,
      averageRating: 0,
      breakdown: { five: 0, four: 0, three: 0, two: 0, one: 0 },
    };
  },

  submitEventReview: async (
    eventId: number,
    data: {
      rating: number;
      comment: string;
      userName: string;
      userEmail: string;
      city?: string;
    }
  ): Promise<{ success: boolean; message: string; review?: any }> => {
    try {
      const res = await request<any>(`/api/events/${eventId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res?.error) {
        return { success: false, message: res.error };
      }
      if (res?.success || res?.review) {
        return {
          success: true,
          message: res.message || 'आपले परीक्षण यशस्वीपणे नोंदवले गेले!',
          review: res.review,
        };
      }
      return { success: false, message: res?.error || 'Review submission failed' };
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('आधीच') || err?.message?.includes('already')) {
        return {
          success: false,
          message: 'तुम्ही या कार्यक्रमाचे परीक्षण आधीच नोंदवले आहे (Already reviewed).',
        };
      }
      if (err?.status === 401) {
        return {
          success: false,
          message: 'परीक्षण नोंदवण्यासाठी कृपया लॉगिन करा (Login required).',
        };
      }
      return {
        success: false,
        message: err?.message || 'Review submission failed. Please try again.',
      };
    }
  },

  updateProfile: async (data: {
    uid?: string;
    email?: string;
    name?: string;
    fullName?: string;
    phone?: string;
    phoneNumber?: string;
    age?: number | null;
    avatarUrl?: string;
    city?: string;
  }): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
      const payload = {
        uid: data.uid,
        email: data.email,
        fullName: data.fullName || data.name || 'User',
        phoneNumber: data.phoneNumber || data.phone,
        age: data.age,
        avatarUrl: data.avatarUrl,
        city: data.city,
      };
      const res = await request<any>('/api/auth/profile/upsert', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res.success) {
        return { success: true, user: res.user };
      }
      return { success: false, error: res?.error || 'Profile update failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  // Email-based Auth (same as web CheckoutDrawer)
  checkEmail: async (
    email: string
  ): Promise<{ exists?: boolean; hasPassword?: boolean; success?: boolean }> => {
    return request<any>('/api/auth/flow/check-email', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      timeout: 15000,
    });
  },

  sendEmailOtp: async (email: string): Promise<{ success: boolean; message: string; devOtp?: string }> => {
    const res = await request<any>('/api/auth/flow/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      timeout: 20000,
    });
    if (!res || res.error) {
      throw new Error(res?.error || 'OTP पाठवण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    }
    return {
      success: true,
      message: res.message || '६-अंकी पडताळणी कोड आपल्या ईमेलवर पाठवला आहे.',
      devOtp: res.devOtp || res.otp,
    };
  },

  verifyEmailOtp: async (
    email: string,
    otp: string
  ): Promise<{
    success: boolean;
    user?: any;
    token?: string;
    message?: string;
    needsPasswordSetup?: boolean;
  }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const res = await request<any>('/api/auth/flow/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
      timeout: 15000,
    });
    if (res && res.success && res.user) {
      return {
        success: true,
        user: res.user,
        // Signed HMAC token when server is updated; empty until deploy
        token: typeof res.token === 'string' ? res.token : '',
        message: res.message || 'यशस्वी लॉगिन झाले!',
        needsPasswordSetup: !!res.needsPasswordSetup,
      };
    }
    throw new Error(res?.error || res?.message || 'अवैध OTP कोड किंवा मुदत संपली आहे.');
  },

  setEmailPassword: async (
    email: string,
    password: string,
    sessionToken?: string
  ): Promise<{ success: boolean; user?: any; token?: string; message?: string }> => {
    const headers: Record<string, string> = {};
    if (sessionToken && sessionToken.includes('.')) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    const res = await request<any>('/api/auth/flow/set-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ password }),
      timeout: 15000,
    });
    if (res && (res.success || res.user)) {
      return {
        success: true,
        user: res.user,
        token: typeof res.token === 'string' ? res.token : '',
        message: res.message || 'Password saved',
      };
    }
    throw new Error(res?.error || 'पासवर्ड जतन करता आला नाही.');
  },

  loginWithEmailPassword: async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: any; token?: string; message?: string }> => {
    const res = await request<any>('/api/auth/flow/login-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (res && res.success && res.user) {
      return {
        success: true,
        user: res.user,
        token: typeof res.token === 'string' ? res.token : '',
        message: res.message,
      };
    }
    throw new Error(res?.error || 'लॉगिन अयशस्वी झाले');
  },

  // Legacy Phone Auth fallback
  sendOtp: (phone: string) =>
    request<{ success: boolean; message?: string }>('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string) =>
    request<{ success: boolean; token?: string; user?: any; message?: string }>(
      '/api/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ phone, otp }) }
    ),

  logout: async (): Promise<{ success: boolean }> => {
    // Canonical session clear (cookie + Supabase) — same as web flow logout
    try {
      return await request<{ success: boolean }>('/api/auth/flow/logout', {
        method: 'POST',
      });
    } catch {
      try {
        return await request<{ success: boolean }>('/api/auth/logout', {
          method: 'POST',
        });
      } catch {
        return { success: true };
      }
    }
  },

  // Notifications
  getNotifications: () =>
    request<{ notifications: any[] }>('/api/notifications'),

  // Cities
  getCities: () =>
    request<{
      cities: string[];
      catalog?: Array<{ id: number; name: string; nameMr?: string; isPopular?: number }>;
    }>('/api/cities'),

  // TikitMitra AI Assistant
  askTikitMitra: async (body: {
    message: string;
    history?: { sender: 'user' | 'agent' | 'model'; text: string }[];
    language?: 'mr' | 'en';
    actionPayload?: Record<string, any>;
  }): Promise<{
    success: boolean;
    reply: string;
    action?: {
      type: string;
      label: string;
      payload?: Record<string, any>;
    };
    options?: Array<{
      label: string;
      value: string;
      type?: string;
      payload?: Record<string, any>;
    }>;
    source?: string;
    error?: string;
  }> => {
    return request<any>('/api/tikitmitra/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      timeout: 25000,
    });
  },

  // Ticket Email Delivery
  sendTicketEmail: async (
    ticketCode: string,
    email?: string,
    pdfDownloadToken?: string
  ): Promise<{ success: boolean; sent?: boolean; message?: string; error?: string }> => {
    const res = await request<any>(`/api/tickets/${encodeURIComponent(ticketCode)}/email`, {
      method: 'POST',
      body: JSON.stringify({ email, pdfDownloadToken }),
      timeout: 15000,
    });
    return {
      ...res,
      success: !!(res?.success || res?.sent),
      sent: !!(res?.sent || res?.success),
    };
  },
};

// ─── Formatters ──────────────────────────────────────────────────────────────

/** Convert paise to rupees string: 50000 → ₹500 */
export function paise(p: number | null | undefined): string {
  if (!p) return '₹0';
  return `₹${Math.round(p / 100).toLocaleString('en-IN')}`;
}

/** Format ISO date for display in IST */
export function formatShow(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function parseToISTDate(raw?: string | null): Date | null {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
  const clean = raw.trim();
  if (clean === '—' || clean === 'null' || clean === 'undefined') return null;
  let normalized = clean;
  if (!normalized.includes('T') && normalized.includes(' ')) {
    normalized = normalized.replace(' ', 'T');
  }
  if (!normalized.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(normalized)) {
    normalized = `${normalized}+05:30`;
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return 'तारीख उपलब्ध नाही';
  const d = parseToISTDate(iso);
  if (!d) return 'तारीख उपलब्ध नाही';
  try {
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'तारीख उपलब्ध नाही';
  }
}

export function formatTime(iso?: string | null): string {
  if (!iso) return 'वेळ उपलब्ध नाही';
  const d = parseToISTDate(iso);
  if (!d) return 'वेळ उपलब्ध नाही';
  try {
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'वेळ उपलब्ध नाही';
  }
}

/** Duration: 120 → "2h 0m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Rating: normalize to 5-star scale */
export function normalizeRating(rating: number): number {
  return rating > 5 ? parseFloat((rating / 2).toFixed(1)) : rating;
}

/** Marathi digit mapper: 123 -> १२३ */
export function toMarathiDigits(val: string | number): string {
  const map: Record<string, string> = {
    '0': '०',
    '1': '१',
    '2': '२',
    '3': '३',
    '4': '४',
    '5': '५',
    '6': '६',
    '7': '७',
    '8': '८',
    '9': '९',
  };
  return String(val).replace(/[0-9]/g, (d) => map[d] || d);
}
