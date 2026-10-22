/**
 * Zustand Stores — MahaTicket (महाटिकिट)
 * Global state management for auth, events, cart, and UI.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, EventItem, EventCategory } from '../api';

// ─── Auth Store ──────────────────────────────────────────────────────────────

interface User {
  id: number | string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: 'customer' | 'organizer' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  syncUserProfile: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const normalizeUserName = (u: any): string => {
  if (u.fullName && u.fullName.trim() && !u.fullName.includes('@')) return u.fullName.trim();
  if (u.name && u.name.trim() && !u.name.includes('@')) return u.name.trim();
  if (u.email && u.email.includes('@')) {
    const prefix = u.email.split('@')[0];
    return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : '';
  }
  return u.fullName || u.name || '';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,

  setAuth: async (rawUser, token) => {
    const cleanName = normalizeUserName(rawUser);
    const cleanUser: User = {
      ...rawUser,
      name: cleanName,
      fullName: cleanName,
      phone: rawUser.phone || rawUser.phoneNumber,
      phoneNumber: rawUser.phoneNumber || rawUser.phone,
    };
    await AsyncStorage.multiSet([
      ['@mahaticket_user', JSON.stringify(cleanUser)],
      ['@mahaticket_session_token', token],
      ['@tg_user', JSON.stringify(cleanUser)],
      ['@tg_session_token', token],
    ]);
    set({ user: cleanUser, token, isAuthenticated: true });
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove([
      '@mahaticket_user',
      '@mahaticket_session_token',
      '@tg_user',
      '@tg_session_token',
    ]);
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      let [[, userStr], [, token]] = await AsyncStorage.multiGet([
        '@mahaticket_user',
        '@mahaticket_session_token',
      ]);
      if (!userStr || !token) {
        [[userStr], [token]] = await AsyncStorage.multiGet([
          '@tg_user',
          '@tg_session_token',
        ]);
      }
      if (userStr && token) {
        const parsed = JSON.parse(userStr);
        const cleanName = normalizeUserName(parsed);
        const cleanUser: User = {
          ...parsed,
          name: cleanName,
          fullName: cleanName,
          phone: parsed.phone || parsed.phoneNumber,
          phoneNumber: parsed.phoneNumber || parsed.phone,
        };
        set({ user: cleanUser, token, isAuthenticated: true });
        // Background sync with live server session to fetch latest name/phone
        get().syncUserProfile().catch(() => null);
      }
    } catch {}
    set({ loading: false });
  },

  syncUserProfile: async () => {
    try {
      const res = await api.getProfile().catch(() => null);
      if (res?.user) {
        const token = res.token || get().token || '';
        await get().setAuth(res.user, token);
      }
    } catch {}
  },

  updateUser: (updates) => {
    const user = get().user;
    if (!user) return;
    const merged = { ...user, ...updates };
    const cleanName = normalizeUserName(merged);
    const updated: User = {
      ...merged,
      name: cleanName,
      fullName: cleanName,
      phone: merged.phone || merged.phoneNumber,
      phoneNumber: merged.phoneNumber || merged.phone,
    };
    set({ user: updated });
    AsyncStorage.multiSet([
      ['@mahaticket_user', JSON.stringify(updated)],
      ['@tg_user', JSON.stringify(updated)],
    ]).catch(() => null);
  },
}));

// ─── Events Store ─────────────────────────────────────────────────────────────

interface EventsState {
  events: EventItem[];
  loading: boolean;
  error: string | null;
  selectedCity: string;
  selectedCategory: EventCategory;
  searchQuery: string;
  lastFetchedCity: string | null;

  setCity: (city: string) => void;
  setCategory: (cat: EventCategory) => void;
  setSearch: (q: string) => void;
  loadCachedEvents: () => Promise<void>;
  fetchEvents: (city?: string, category?: EventCategory) => Promise<void>;
  filteredEvents: () => EventItem[];
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loading: true,
  error: null,
  selectedCity: 'Pune',
  selectedCategory: 'all',
  searchQuery: '',
  lastFetchedCity: null,

  setCity: (city) => set({ selectedCity: city }),
  setCategory: (cat) => set({ selectedCategory: cat }),
  setSearch: (q) => set({ searchQuery: q }),

  loadCachedEvents: async () => {
    try {
      const cached = await AsyncStorage.getItem('@tg_cached_events');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ events: parsed, loading: false });
        }
      }
    } catch {}
  },

  fetchEvents: async (city, category) => {
    const c = city || get().selectedCity;
    const currentEvents = get().events;
    set({ loading: currentEvents.length === 0, error: null });
    try {
      const data = await api.getEvents({ city: c, category });
      const unique = (data.events || []).filter(
        (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
      );
      set({ events: unique, lastFetchedCity: c, loading: false, error: null });
      if (unique.length > 0) {
        AsyncStorage.setItem('@tg_cached_events', JSON.stringify(unique)).catch(() => null);
      }
    } catch (err: any) {
      set({ loading: false, error: err?.message || 'Failed to load events' });
    }
  },

  filteredEvents: () => {
    const { events, selectedCategory, searchQuery } = get();
    let list = events;
    if (selectedCategory !== 'all') {
      list = list.filter(
        (e) =>
          e.category?.toLowerCase() === selectedCategory ||
          e.categoryMr?.toLowerCase() === selectedCategory
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.titleMr?.includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.venue?.name?.toLowerCase().includes(q) ||
          e.venue?.city?.toLowerCase().includes(q)
      );
    }
    return list;
  },
}));

// ─── Cart / Booking Store ─────────────────────────────────────────────────────

export interface Addon {
  id: string;
  name: string;
  nameMr: string;
  emoji: string;
  pricePaise: number;
  qty: number;
}

interface CartState {
  // Hold info
  holdToken: string | null;
  holdExpiresAt: string | null;
  holdCountdown: number; // seconds remaining

  // Booking context
  eventId: number | null;
  sessionId: number | null;
  selectedSeatIds: number[];
  selectedSeatCodes: string[];
  faceValueTotal: number; // paise

  // Addons
  addons: Addon[];
  partySize: number;

  // Pricing
  couponCode: string | null;
  discountTotal: number;
  platformFeeTotal: number;
  taxTotal: number;
  grandTotal: number;

  // Razorpay
  razorpayOrderId: string | null;
  orderDbId: number | null;

  // Actions
  setHold: (params: {
    holdToken: string;
    expiresAt: string;
    eventId: number;
    sessionId: number;
    seatIds: number[];
    seatCodes: string[];
    faceValue: number;
  }) => void;
  setAddons: (addons: Addon[], partySize: number) => void;
  setCoupon: (code: string | null, discount: number) => void;
  setPricing: (fees: { platformFeeTotal: number; taxTotal: number; grandTotal: number }) => void;
  setRazorpayOrder: (id: string, dbId: number) => void;
  tickCountdown: () => void;
  clearCart: () => void;
}

const cartInitial = {
  holdToken: null,
  holdExpiresAt: null,
  holdCountdown: 0,
  eventId: null,
  sessionId: null,
  selectedSeatIds: [],
  selectedSeatCodes: [],
  faceValueTotal: 0,
  addons: [],
  partySize: 1,
  couponCode: null,
  discountTotal: 0,
  platformFeeTotal: 0,
  taxTotal: 0,
  grandTotal: 0,
  razorpayOrderId: null,
  orderDbId: null,
};

export const useCartStore = create<CartState>((set, get) => ({
  ...cartInitial,

  setHold: (params) => {
    const now = Date.now();
    const expiresMs = new Date(params.expiresAt).getTime();
    const countdown = Math.max(0, Math.round((expiresMs - now) / 1000));
    set({
      holdToken: params.holdToken,
      holdExpiresAt: params.expiresAt,
      holdCountdown: countdown,
      eventId: params.eventId,
      sessionId: params.sessionId,
      selectedSeatIds: params.seatIds,
      selectedSeatCodes: params.seatCodes,
      faceValueTotal: params.faceValue,
    });
  },

  setAddons: (addons, partySize) => set({ addons, partySize }),

  setCoupon: (code, discount) =>
    set({ couponCode: code, discountTotal: discount }),

  setPricing: (fees) =>
    set({
      platformFeeTotal: fees.platformFeeTotal,
      taxTotal: fees.taxTotal,
      grandTotal: fees.grandTotal,
    }),

  setRazorpayOrder: (id, dbId) =>
    set({ razorpayOrderId: id, orderDbId: dbId }),

  tickCountdown: () => {
    const { holdCountdown } = get();
    if (holdCountdown > 0) set({ holdCountdown: holdCountdown - 1 });
  },

  clearCart: () => set(cartInitial),
}));

// ─── UI Store ─────────────────────────────────────────────────────────────────

type Language = 'en' | 'mr';

interface UIState {
  language: Language;
  darkMode: boolean;
  onboardingDone: boolean;
  setLanguage: (lang: Language) => void;
  toggleDark: () => void;
  setOnboardingDone: () => void;
  loadUIPrefs: () => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  language: 'en',
  darkMode: false,
  onboardingDone: false,

  setLanguage: async (lang) => {
    set({ language: lang });
    AsyncStorage.setItem('@tg_lang', lang).catch(() => null);
  },

  toggleDark: () =>
    set((s) => {
      const next = !s.darkMode;
      AsyncStorage.setItem('@tg_dark', String(next)).catch(() => null);
      return { darkMode: next };
    }),

  setOnboardingDone: async () => {
    set({ onboardingDone: true });
    AsyncStorage.setItem('@tg_onboarding', '1').catch(() => null);
  },

  loadUIPrefs: async () => {
    try {
      const [[, lang], [, dark], [, onboarded]] = await AsyncStorage.multiGet([
        '@tg_lang',
        '@tg_dark',
        '@tg_onboarding',
      ]);
      set({
        language: (lang as Language) || 'en',
        // Light theme is default — only dark if user explicitly set true
        darkMode: dark === 'true',
        onboardingDone: onboarded === '1',
      });
    } catch {}
  },
}));
