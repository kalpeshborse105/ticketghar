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
  email?: string;
  phone?: string;
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
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,

  setAuth: async (user, token) => {
    await AsyncStorage.multiSet([
      ['@mahaticket_user', JSON.stringify(user)],
      ['@mahaticket_session_token', token],
      ['@tg_user', JSON.stringify(user)],
      ['@tg_session_token', token],
    ]);
    set({ user, token, isAuthenticated: true });
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
        set({ user: JSON.parse(userStr), token, isAuthenticated: true });
      }
    } catch {}
    set({ loading: false });
  },

  updateUser: (updates) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, ...updates };
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

  fetchEvents: async (city, category) => {
    const c = city || get().selectedCity;
    set({ loading: true, error: null });
    try {
      const data = await api.getEvents({ city: c, category });
      const unique = (data.events || []).filter(
        (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
      );
      set({ events: unique, lastFetchedCity: c, loading: false, error: null });
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
