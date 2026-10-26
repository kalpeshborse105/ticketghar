import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOWS } from '../theme';
import {
  api,
  SeatItem,
  filterUpcomingSessions,
  formatDate,
  formatShow,
  formatTime,
  paise,
} from '../api';
import { useCartStore, useAuthStore, useUIStore } from '../store';
import { Button, MTPopupModal } from '../components';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_MIN_SCALE = 0.65;
const MAP_MAX_SCALE = 2.75;
/** Live hold sync — same spirit as web fresh seat refresh */
const POLL_INTERVAL = 8000;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_RE = /[A-Za-z]/;
const TEXT_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const MARATHI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
export function toMarathiDigits(val: number | string): string {
  return String(val).replace(/[0-9]/g, (d) => MARATHI_DIGITS[Number(d)] ?? d);
}

function parseToISTDate(raw?: string | Date | null): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const clean = String(raw).trim();
  if (!clean || clean === 'null' || clean === 'undefined' || clean === '—') return null;
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

function formatMarathiShowDateTime(dateStr?: string | Date | null): string {
  const d = parseToISTDate(dateStr);
  if (!d) return 'तारीख व वेळ उपलब्ध नाही';
  try {
    const dayNames = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
    const monthNames = [
      'जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून',
      'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें',
    ];

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    });

    const parts = formatter.formatToParts(d);
    let monthIdx = d.getMonth();
    let dateNum = d.getDate();
    let hours = d.getHours();
    let mins = d.getMinutes();
    let weekdayStr = '';

    parts.forEach((p) => {
      if (p.type === 'month') monthIdx = parseInt(p.value, 10) - 1;
      if (p.type === 'day') dateNum = parseInt(p.value, 10);
      if (p.type === 'hour') hours = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') mins = parseInt(p.value, 10);
      if (p.type === 'weekday') weekdayStr = p.value;
    });

    const weekdayMap: Record<string, string> = {
      Sun: 'रवि', Mon: 'सोम', Tue: 'मंगळ', Wed: 'बुध', Thu: 'गुरु', Fri: 'शुक्र', Sat: 'शनि',
    };
    const dayOfWeek = weekdayMap[weekdayStr] || dayNames[d.getDay()] || 'शनि';
    const month = monthNames[monthIdx] || 'ऑक्टो';

    let period = 'सकाळी';
    if (hours >= 12 && hours < 16) period = 'दुपारी';
    else if (hours >= 16 && hours < 20) period = 'संध्या.';
    else if (hours >= 20 || hours < 5) period = 'रात्री';

    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const timeFormatted = `${period} ${toMarathiDigits(
      String(displayHour).padStart(2, '0')
    )}:${toMarathiDigits(String(mins).padStart(2, '0'))}`;

    return `${dayOfWeek} ${toMarathiDigits(dateNum)} ${month} • ${timeFormatted}`;
  } catch {
    return 'तारीख व वेळ उपलब्ध नाही';
  }
}

const sessionSeatsCache = new Map<
  number,
  { seats: SeatItem[]; sections: any[]; layoutConfig: any; time: number }
>();

export function clearSessionSeatsCache(sessionId?: number) {
  if (sessionId) {
    sessionSeatsCache.delete(sessionId);
  } else {
    sessionSeatsCache.clear();
  }
}

type SectionView = {
  key: string;
  sectionId: number | null;
  primaryLabel: string;
  secondaryLabel: string | null;
  price: number;
  seats: SeatItem[];
  availableCount: number;
  rows: Array<{
    label: string;
    seats: SeatItem[];
    aisleAfter: number[];
  }>;
  layoutIndex: number | null;
  sourceIndex: number;
  color: string;
  iconName: string;
};

/**
 * BookMyShow-style compact seat — fixed box size so full theatre fits on screen.
 */
const RealisticSeatIcon = React.memo(
  ({
    seat,
    size,
    isSelected,
    isBooked,
    onPress,
  }: {
    seat: SeatItem;
    size: number;
    isSelected: boolean;
    isBooked: boolean;
    onPress: (seat: SeatItem) => void;
  }) => {
    const num = String(seat.seatNumber ?? seat.seatCode?.replace(/\D/g, '') ?? '');
    const fontSize = size >= 20 ? 10 : size >= 16 ? 9 : 8;

    return (
      <Pressable
        onPress={() => onPress(seat)}
        disabled={isBooked}
        hitSlop={{ top: 2, bottom: 2, left: 1, right: 1 }}
        style={({ pressed }) => [
          styles.bmsSeatBox,
          {
            width: size,
            height: size,
            borderRadius: Math.max(3, Math.round(size * 0.18)),
          },
          isSelected
            ? styles.bmsSeatSelected
            : isBooked
              ? styles.bmsSeatBooked
              : styles.bmsSeatAvailable,
          pressed && !isBooked && { opacity: 0.85, transform: [{ scale: 0.94 }] },
        ]}
      >
        {isSelected ? (
          <Icon name="check-bold" size={Math.max(9, size * 0.42)} color="#FFFFFF" />
        ) : isBooked ? null : (
          <Text style={[styles.bmsSeatNum, { fontSize, color: '#15803D' }]} numberOfLines={1}>
            {num}
          </Text>
        )}
      </Pressable>
    );
  }
);

export default function SeatSelectionScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const {
    eventId,
    sessionId: initSession,
    eventTitle,
    posterUrl,
    venueName,
    venueAddress,
    category,
    cast,
    sessionMeta: routeSessionMeta,
    allSessions,
    selectedSession: routeSelectedSession,
    event: routeEvent,
  } = route.params || {};

  const setHold = useCartStore((s) => s.setHold);
  const user = useAuthStore((s) => s.user);
  const language = useUIStore((s) => s.language);

  const [sessionId, setSessionId] = useState<number>(initSession);
  const [sessions, setSessions] = useState<any[]>(() => {
    const list = filterUpcomingSessions(allSessions || []);
    if (routeSelectedSession && !list.some((s: any) => s.id === routeSelectedSession.id)) {
      list.unshift(routeSelectedSession);
    }
    return list;
  });
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [sectionsData, setSectionsData] = useState<any[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<any>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapScale = useSharedValue(1);
  const mapSavedScale = useSharedValue(1);
  const mapTX = useSharedValue(0);
  const mapTY = useSharedValue(0);
  const mapSavedTX = useSharedValue(0);
  const mapSavedTY = useSharedValue(0);

  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const selectedRef = useRef<number[]>([]);
  selectedRef.current = selected;
  const abortCtrlRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);

  const handleBackPress = useCallback(() => {
    if (showDiscardModal) {
      setShowDiscardModal(false);
      return true;
    }
    if (showHelpModal) {
      setShowHelpModal(false);
      return true;
    }
    if (errorModalMsg) {
      setErrorModalMsg(null);
      return true;
    }
    if (selected.length > 0) {
      setShowDiscardModal(true);
      return true;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('EventDetail', { eventId, sessionId });
    }
    return true;
  }, [
    navigation,
    selected.length,
    showDiscardModal,
    showHelpModal,
    errorModalMsg,
    eventId,
    sessionId,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  useEffect(() => {
    if (!sessions.length && eventId) {
      api
        .getEvent(eventId)
        .then((d) => {
          const list = Array.isArray(d.event?.sessions) ? d.event.sessions : [];
          setSessions(list);
          if (sessionId && !list.some((s: any) => s.id === sessionId)) {
            setError(
              'निवडलेला प्रयोग या कार्यक्रमासाठी उपलब्ध नाही. कृपया मागे जाऊन वैध प्रयोग निवडा.\n(Selected show is not available for this event. Please go back and pick a show.)'
            );
          }
        })
        .catch(() => null);
    }
  }, [eventId, sessionId, sessions.length]);

  // Authoritative session: strictly the selected sessionId. Never silently substitute sessions[0].
  const activeSession =
    sessions.find((s) => s.id === sessionId) ||
    (routeSelectedSession?.id === sessionId ? routeSelectedSession : null);
  const sessionStartTime =
    activeSession?.sessionStartTime ||
    (routeSelectedSession?.id === sessionId ? routeSelectedSession.sessionStartTime : null);

  const fetchSeats = useCallback(async (fresh = true) => {
    if (!sessionId || isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const data = await api.getSessionSeats(sessionId, {
        fresh,
        timeoutMs: fresh ? 18000 : 22000,
      });
      const liveSeats = data.seats || [];
      const selectedIds = selectedRef.current;

      // Prune local selection if another user held/booked the seat (strict like web)
      const stillFree = selectedIds.filter((id) => {
        const match = liveSeats.find((s) => s.seatId === id);
        return match && match.status === 'available';
      });
      if (stillFree.length !== selectedIds.length) {
        const lost = selectedIds.length - stillFree.length;
        setSelected(stillFree);
        setError(
          lost > 0
            ? `निवडलेली ${lost} आसने दुसऱ्या ग्राहकाने आरक्षित केली. कृपया इतर आसने निवडा.\n(Some seats were just held by another user — pick different seats.)`
            : null
        );
        if (stillFree.length === 0) {
          // All selected seats became unavailable
        }
      }

      // Never paint held/booked seats as "selected" — that hid conflicts before
      setSeats(
        liveSeats.map((seat) => ({
          ...seat,
          status:
            stillFree.includes(seat.seatId) && seat.status === 'available'
              ? ('selected' as any)
              : seat.status,
        }))
      );
      setSectionsData(Array.isArray(data.sections) ? data.sections : []);
      setLayoutConfig(data.layoutConfig || null);

      sessionSeatsCache.set(sessionId, {
        seats: liveSeats,
        sections: data.sections || [],
        layoutConfig: data.layoutConfig || null,
        time: Date.now(),
      });

      if (!liveSeats.length) {
        setError('या प्रयोगासाठी कोणतीही आसने उपलब्ध नाहीत. (No seats available for this show.)');
      }
    } catch {
      // Background poll failure is silent — never treat network abort as hold expiry
    } finally {
      isFetchingRef.current = false;
    }
  }, [sessionId]);

  const loadSeats = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      setError('कोणताही प्रयोग निवडलेला नाही. कृपया मागे जाऊन प्रयोग निवडा. (No show selected. Please go back and select a show.)');
      return;
    }

    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    abortCtrlRef.current = new AbortController();
    const signal = abortCtrlRef.current.signal;

    const cached = sessionSeatsCache.get(sessionId);

    // Show cached map provisionally so UI is not stuck on spinner, but revalidate immediately
    if (cached && Date.now() - cached.time < 15000) {
      setSeats(cached.seats);
      setSectionsData(cached.sections || []);
      setLayoutConfig(cached.layoutConfig || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setSelected([]);
    setError(null);

    try {
      isFetchingRef.current = true;
      const data = await api.getSessionSeats(sessionId, {
        fresh: true,
        timeoutMs: 22000,
        signal,
      });
      if (signal.aborted) return;
      const liveSeats = data.seats || [];
      setSeats(liveSeats);
      setSectionsData(Array.isArray(data.sections) ? data.sections : []);
      setLayoutConfig(data.layoutConfig || null);
      sessionSeatsCache.set(sessionId, {
        seats: liveSeats,
        sections: data.sections || [],
        layoutConfig: data.layoutConfig || null,
        time: Date.now(),
      });
      if (!liveSeats.length) {
        setError('या प्रयोगासाठी कोणतीही आसने उपलब्ध नाहीत. (No seats available for this show.)');
      } else {
        setError(null);
      }
    } catch (e: any) {
      if (signal.aborted || e?.status === 499) return;
      const msg = String(e?.message || '');
      if (e?.status === 404 || /session not found/i.test(msg)) {
        setError(
          'हा प्रयोग उपलब्ध नाही. कृपया मागे जाऊन वैध प्रयोग निवडा.\n(This show session was not found. Please go back and pick a show.)'
        );
      } else if (!cached) {
        if (/timed out|timeout|slow|network/i.test(msg)) {
          setError(
            'आसन नकाशा लोड होण्यास वेळ लागत आहे. कृपया "पुन्हा प्रयत्न करा" दाबा. (Seat map load is slow. Tap Retry seats.)'
          );
        } else if (/held|आरक्षित|taken/i.test(msg)) {
          setError(
            'हे आसन नुकतेच दुसऱ्या ग्राहकाने आरक्षित केले आहे. कृपया दुसरे आसन निवडा.'
          );
        } else {
          setError('आसनांची माहिती लोड झाली नाही. कृपया पुन्हा प्रयत्न करा.');
        }
      }
    } finally {
      isFetchingRef.current = false;
      if (!signal.aborted) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSeats();
  }, [loadSeats]);

  // Refresh seat availability automatically whenever returning to this screen
  useFocusEffect(
    useCallback(() => {
      fetchSeats(true);
      const poll = setInterval(() => fetchSeats(true), POLL_INTERVAL);
      return () => {
        clearInterval(poll);
      };
    }, [fetchSeats])
  );

  const sectionViews = useMemo<SectionView[]>(() => {
    const layoutSections = Array.isArray(layoutConfig?.sections) ? layoutConfig.sections : [];
    const layoutLookup = new Map<
      string,
      { index: number; rowAisles: Map<string, number[]> }
    >();

    layoutSections.forEach((layoutSection: any, index: number) => {
      const rowAisles = new Map<string, number[]>();
      (layoutSection?.rows || []).forEach((row: any) => {
        const key = normalizeValue(row?.rowLabel);
        if (key) {
          const aisles = Array.isArray(row?.aisleAfter)
            ? row.aisleAfter
              .map((value: any) => Number(value))
              .filter((value: number) => Number.isFinite(value) && value > 0)
            : [];
          if (row?.middleGap?.enabled && Number(row.middleGap.afterSeat) > 0) {
            const mg = Number(row.middleGap.afterSeat);
            if (!aisles.includes(mg)) aisles.push(mg);
          }
          rowAisles.set(key, aisles.sort((a: number, b: number) => a - b));
        }
      });

      getLookupKeys(layoutSection?.name, layoutSection?.nameMr).forEach((key) => {
        if (!layoutLookup.has(key)) {
          layoutLookup.set(key, { index, rowAisles });
        }
      });
    });

    const sectionMap = new Map<
      string,
      {
        key: string;
        sectionId: number | null;
        name?: string | null;
        nameMr?: string | null;
        price: number;
        sourceIndex: number;
        seats: SeatItem[];
      }
    >();

    (sectionsData || []).forEach((section: any, index: number) => {
      const key =
        section?.id != null
          ? `section:${section.id}`
          : `name:${normalizeValue(
            section?.name || section?.ticketTypeName || section?.nameMr || `section-${index}`
          )}`;
      sectionMap.set(key, {
        key,
        sectionId: typeof section?.id === 'number' ? section.id : null,
        name: section?.ticketTypeName || section?.name || null,
        nameMr: section?.ticketTypeNameMr || section?.nameMr || null,
        price: Number(section?.price || section?.basePrice || 0),
        sourceIndex: index,
        seats: [],
      });
    });

    seats.forEach((seat) => {
      const key =
        seat.sectionId != null
          ? `section:${seat.sectionId}`
          : `name:${normalizeValue(
            seat.sectionName || seat.ticketTypeName || seat.tier || seat.seatCode
          )}`;

      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          key,
          sectionId: seat.sectionId ?? null,
          name: seat.sectionName || seat.ticketTypeName || seat.tier || 'Section',
          nameMr: seat.sectionNameMr || seat.ticketTypeNameMr || null,
          price: Number(seat.price || 0),
          sourceIndex: sectionMap.size,
          seats: [],
        });
      }

      const section = sectionMap.get(key)!;
      section.seats.push(seat);
      if (!section.price && seat.price) {
        section.price = seat.price;
      }
      if (!section.name && (seat.sectionName || seat.ticketTypeName || seat.tier)) {
        section.name = seat.sectionName || seat.ticketTypeName || seat.tier;
      }
      if (!section.nameMr && (seat.sectionNameMr || seat.ticketTypeNameMr)) {
        section.nameMr = seat.sectionNameMr || seat.ticketTypeNameMr;
      }
    });

    const sortedSections = Array.from(sectionMap.values())
      .filter((section) => section.seats.length > 0)
      .map((section) => {
        const titles = resolveSectionTitles(section.name, section.nameMr);
        const layoutMeta =
          getLookupKeys(
            section.name,
            section.nameMr,
            titles.primaryLabel,
            titles.secondaryLabel
          )
            .map((key) => layoutLookup.get(key))
            .find(Boolean) || null;

        const rowMap = new Map<string, SeatItem[]>();
        section.seats.forEach((seat) => {
          let rowKey = seat.rowLabel || '?';
          if (rowKey.includes('-')) {
            rowKey = rowKey.split('-').pop() || rowKey;
          }
          if (!rowMap.has(rowKey)) rowMap.set(rowKey, []);
          rowMap.get(rowKey)!.push(seat);
        });

        const rows = Array.from(rowMap.entries())
          .sort((a, b) => {
            const layoutRows = layoutMeta?.rowAisles;
            const aIndex = layoutRows?.has(normalizeValue(a[0]))
              ? Array.from(layoutRows.keys()).indexOf(normalizeValue(a[0]))
              : -1;
            const bIndex = layoutRows?.has(normalizeValue(b[0]))
              ? Array.from(layoutRows.keys()).indexOf(normalizeValue(b[0]))
              : -1;
            if (aIndex >= 0 || bIndex >= 0) {
              if (aIndex < 0) return 1;
              if (bIndex < 0) return -1;
              return aIndex - bIndex;
            }
            return TEXT_COLLATOR.compare(a[0], b[0]);
          })
          .map(([label, rowSeats]) => ({
            label,
            seats: rowSeats.slice().sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber)),
            aisleAfter: layoutMeta?.rowAisles.get(normalizeValue(label)) || [],
          }));

        const availableCount = section.seats.filter(
          (s) => s.status !== 'booked' && s.status !== 'held' && s.status !== 'blocked'
        ).length;

        const lowerTitle = ((section.name || '') + ' ' + (section.nameMr || '')).toLowerCase();
        let iconName = 'seat-recline-extra';
        if (lowerTitle.includes('balcony') || lowerTitle.includes('बाल्कनी')) {
          iconName = 'stairs-up';
        } else if (
          lowerTitle.includes('stall a') ||
          lowerTitle.includes('प्रथम') ||
          lowerTitle.includes('first') ||
          lowerTitle.includes('vip')
        ) {
          iconName = 'crown-outline';
        } else if (
          lowerTitle.includes('stall b') ||
          lowerTitle.includes('द्वितीय') ||
          lowerTitle.includes('second')
        ) {
          iconName = 'seat-outline';
        }

        return {
          key: section.key,
          sectionId: section.sectionId,
          primaryLabel: titles.primaryLabel,
          secondaryLabel: titles.secondaryLabel,
          price:
            section.price ||
            Math.max(...section.seats.map((seat) => Number(seat.price || 0)), 0),
          seats: section.seats,
          availableCount,
          rows,
          layoutIndex: layoutMeta?.index ?? null,
          sourceIndex: section.sourceIndex,
          color: '#EA580C',
          iconName,
        };
      })
      .sort((a, b) => {
        if (a.layoutIndex != null || b.layoutIndex != null) {
          if (a.layoutIndex == null) return 1;
          if (b.layoutIndex == null) return -1;
          if (a.layoutIndex !== b.layoutIndex) return a.layoutIndex - b.layoutIndex;
        }
        if (b.price !== a.price) return b.price - a.price;
        return a.sourceIndex - b.sourceIndex;
      });

    return sortedSections;
  }, [layoutConfig, seats, sectionsData]);

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selected.includes(seat.seatId)),
    [seats, selected]
  );
  const subtotal = useMemo(() => {
    const sectionFallback = sectionViews[0]?.price || 0;
    return selectedSeats.reduce((total, seat) => {
      const price = Number(seat.price || 0);
      if (price > 0) return total + price;
      const fromSection =
        sectionViews.find((s) => s.sectionId === seat.sectionId)?.price || sectionFallback;
      return total + Number(fromSection || 0);
    }, 0);
  }, [selectedSeats, sectionViews]);

  const priceRangeLabel = useMemo(() => {
    const prices = sectionViews.map((s) => Math.round(s.price / 100)).filter((p) => p > 0);
    if (!prices.length) return '₹३००/५००';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `₹${toMarathiDigits(min)}`;
    return `₹${toMarathiDigits(min)}/${toMarathiDigits(max)}`;
  }, [sectionViews]);

  const { maxSeatsInRow, maxAislesInRow } = useMemo(() => {
    let maxSeats = 1;
    let maxAisles = 0;
    sectionViews.forEach((section) => {
      section.rows.forEach((row) => {
        maxSeats = Math.max(maxSeats, row.seats.length);
        const aisles =
          row.aisleAfter.length ||
          (row.seats.length >= 6 ? 1 : 0);
        maxAisles = Math.max(maxAisles, aisles);
      });
    });
    return { maxSeatsInRow: maxSeats, maxAislesInRow: maxAisles };
  }, [sectionViews]);

  // Comfortable tap target size with smooth horizontal scroll for wide theatre rows
  const seatCellSize = useMemo(() => {
    const usable = SCREEN_WIDTH - 48;
    const fitted = Math.floor(usable / Math.max(maxSeatsInRow, 1));
    return Math.max(24, Math.min(30, fitted));
  }, [maxSeatsInRow]);

  useEffect(() => {
    mapScale.value = withTiming(1, { duration: 180 });
    mapSavedScale.value = 1;
    mapTX.value = withTiming(0, { duration: 180 });
    mapTY.value = withTiming(0, { duration: 180 });
    mapSavedTX.value = 0;
    mapSavedTY.value = 0;
  }, [sessionId, maxSeatsInRow, seatCellSize]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((e) => {
          const next = Math.min(
            MAP_MAX_SCALE,
            Math.max(MAP_MIN_SCALE, mapSavedScale.value * e.scale)
          );
          mapScale.value = next;
        })
        .onEnd(() => {
          mapSavedScale.value = mapScale.value;
          // Snap only when nearly 100% — keep intentional zoom-out / zoom-in
          if (mapScale.value >= 0.98 && mapScale.value <= 1.02) {
            mapScale.value = withTiming(1);
            mapSavedScale.value = 1;
            mapTX.value = withTiming(0);
            mapTY.value = withTiming(0);
            mapSavedTX.value = 0;
            mapSavedTY.value = 0;
          }
        }),
    []
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .averageTouches(true)
        .minDistance(12)
        .onUpdate((e) => {
          const nearOne = mapSavedScale.value >= 0.98 && mapSavedScale.value <= 1.02;
          if (nearOne) return;
          mapTX.value = mapSavedTX.value + e.translationX;
          mapTY.value = mapSavedTY.value + e.translationY;
        })
        .onEnd(() => {
          mapSavedTX.value = mapTX.value;
          mapSavedTY.value = mapTY.value;
        }),
    []
  );

  const mapGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [pinchGesture, panGesture]
  );

  const mapAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mapTX.value },
      { translateY: mapTY.value },
      { scale: mapScale.value },
    ],
  }));

  const toggle = useCallback(
    (seat: SeatItem) => {
      if (seat.status === 'booked' || seat.status === 'held' || seat.status === 'blocked') return;
      setError(null);

      setSelected((prev) => {
        if (prev.includes(seat.seatId)) {
          return prev.filter((id) => id !== seat.seatId);
        }
        if (prev.length >= 5) {
          setError('एका वेळी जास्तीत जास्त ५ आसने निवडता येतात (Max 5 seats per booking).');
          return prev;
        }
        return [...prev, seat.seatId];
      });

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 85, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 85, useNativeDriver: true }),
      ]).start();
    },
    [pulseAnim]
  );

  const finishHold = async () => {
    if (!selected.length || holding) return;
    if (!sessionId || !sessionStartTime) {
      setError('शोची तारीख व वेळ उपलब्ध नाही. कृपया सत्र पुन्हा निवडा (Showtime not available. Please reselect session).');
      return;
    }
    try {
      setHolding(true);
      setError(null);
      let guestId = '';
      try {
        guestId = (await AsyncStorage.getItem('@mahaticket_guest_device_id')) || '';
        if (!guestId) {
          guestId = `guest-app-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
          await AsyncStorage.setItem('@mahaticket_guest_device_id', guestId);
        }
      } catch {
        guestId = 'guest-app';
      }
      const userIdStr = user?.id ? String(user.id) : guestId;

      // Server hold is mandatory — never invent a local holdToken (prevents orphaned seats)
      const hold = await api.hold({ sessionId, seatIds: selected, userIdStr });
      if (!hold?.holdToken) {
        throw new Error('Seat hold failed. Please try again.');
      }
      const holdToken = hold.holdToken;
      const expiresAt =
        hold.hold?.holdExpiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const lockedFace =
        hold.hold?.faceValueTotal > 0 ? hold.hold.faceValueTotal : subtotal;

      setHold({
        holdToken,
        expiresAt,
        eventId,
        sessionId,
        seatIds: selected,
        seatCodes: selectedSeats.map((seat) => seat.seatCode),
        faceValue: lockedFace,
      });

      navigation.navigate('Checkout', {
        holdToken,
        faceValue: lockedFace,
        seatCodes: selectedSeats.map((seat) => seat.seatCode),
        seatIds: selected,
        expiresAt,
        addons: {},
        addonTotal: 0,
        partySize: selected.length,
        eventId,
        sessionId,
        eventTitle,
        posterUrl,
        venueName: venueName || routeEvent?.venue?.name,
        sessionStartTime: sessionStartTime || null,
        sessionMeta: sessionStartTime ? formatShow(sessionStartTime) : routeSessionMeta,
      });
    } catch (e: any) {
      const msg =
        e.message ||
        'निवडलेली आसने या शोसाठी उपलब्ध नाहीत. कृपया इतर आसने निवडा.';
      const isNetwork =
        /नेटवर्क|network|slow|timeout|timed out|पुन्हा "पुढे जा"/i.test(msg);
      const isConflict = /दुसऱ्या|held|आरक्षित|another/i.test(msg);

      setError(msg);
      setErrorModalMsg(msg);
      // Refresh live map so held seats show grey immediately
      fetchSeats(true);

      // Only clear selection on real conflict — keep seats on network timeout (timer still valid)
      if (isConflict && !isNetwork) {
        setSelected([]);
      }
    } finally {
      setHolding(false);
    }
  };

  const categoryLabel = useMemo(() => {
    const cat = (category || routeEvent?.category || '').toLowerCase();
    if (cat.includes('movie') || cat.includes('cinema')) return 'चित्रपट';
    if (cat.includes('comedy')) return 'कॉमेडी';
    if (cat.includes('music')) return 'संगीत';
    return 'नाटक';
  }, [category, routeEvent?.category]);

  const castLine = useMemo(() => {
    if (cast) return cast;
    if (routeEvent?.cast) return routeEvent.cast;
    if (routeEvent?.artist) return routeEvent.artist;
    return '';
  }, [cast, routeEvent]);

  const fullVenueLine = useMemo(() => {
    const name = venueName || routeEvent?.venue?.name || '';
    const addr = venueAddress || routeEvent?.venue?.address || '';
    if (!name && !addr) return 'नाट्यगृह माहिती लवकरच (Venue TBA)';
    if (!addr) return name;
    if (!name) return addr;
    if (name.includes(addr)) return name;
    return `${name}, ${addr}`;
  }, [venueName, venueAddress, routeEvent]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── 1. Top Navigation Bar (UNCHANGED) ── */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.navBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.brandTitleRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandLogoText}>MahaTicket</Text>
          </View>
        </View>

        <View style={styles.navRightActions}>
          <TouchableOpacity
            style={styles.navActionIcon}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => setShowHelpModal(true)}
          >
            <Icon name="help-circle-outline" size={22} color="#334155" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navAvatarBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              try {
                navigation.navigate('Profile');
              } catch {
                navigation.navigate('Main', { screen: 'Profile' });
              }
            }}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
                }}
                style={styles.avatarImg}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: (selected.length > 0 ? 156 : 118) + (insets.bottom || 16),
        }}
      >
        {/* ── 2. Top Ticket Preview Card (UNCHANGED) ── */}
        <View style={styles.eventPreviewCard}>
          <View style={styles.posterWrapper}>
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.posterImg} resizeMode="cover" />
            ) : (
              <View style={styles.posterFallback}>
                <Icon name="theater" size={22} color="#EA580C" />
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
            </View>
          </View>

          <View style={styles.eventDetailsBlock}>
            <View style={styles.fastFillingRow}>
              <View style={styles.greenLiveDot} />
              <Text style={styles.fastFillingText}>जलद भरणारे (FAST FILLING)</Text>
            </View>

            <Text style={styles.eventTitleText} numberOfLines={1}>
              {eventTitle || 'नियम व अटी लागू'}
            </Text>

            {/* <Text style={styles.castText} numberOfLines={1}>
              {castLine}
            </Text> */}

            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeCalendarIcon}>📅</Text>
              <Text
                style={[
                  styles.dateTimeText,
                  !sessionStartTime && { color: '#EF4444', fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {formatMarathiShowDateTime(sessionStartTime)}
              </Text>
            </View>

            <View style={styles.venueRow}>
              <Text style={styles.venuePinIcon}>📍</Text>
              <Text style={styles.venueText} numberOfLines={2}>
                {fullVenueLine}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Multiple Showtimes Switcher ── */}
        {sessions.length > 1 ? (
          <View style={styles.sessionsBarWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionsScrollContent}
            >
              {sessions.map((s) => {
                const isActive = s.id === sessionId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      if (s.id === sessionId) return;
                      setSelected([]);
                      setError(null);
                      setErrorModalMsg(null);
                      setSessionId(s.id);
                    }}
                    activeOpacity={0.8}
                    style={[styles.sessionChip, isActive && styles.sessionChipActive]}
                  >
                    <Icon
                      name="clock-outline"
                      size={11}
                      color={isActive ? '#FFFFFF' : '#EA580C'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.sessionChipText, isActive && styles.sessionChipTextActive]}>
                      {s.sessionStartTime
                        ? `${formatDate(s.sessionStartTime)} • ${formatTime(s.sessionStartTime)}`
                        : 'Show'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}


        {/* ── 4. Seat legend (BMS-style — no zoom text UI) ── */}
        <View style={styles.legendCardBar}>
          <View style={styles.legendItemsGroup}>
            <View style={styles.legendItem}>
              <View style={styles.legendMiniSeatAvail}>
                <View style={styles.legendMiniSeatTopAvail} />
              </View>
              <Text style={styles.legendText}>
                {language === 'mr'
                  ? `उपलब्ध ${toMarathiDigits(seats.filter((s) => s.status === 'available').length)} आसने (${priceRangeLabel})`
                  : `${seats.filter((s) => s.status === 'available').length} seats available (${priceRangeLabel})`}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendMiniSeatSelected}>
                <Icon name="check-bold" size={9} color="#FFFFFF" />
              </View>
              <Text style={[styles.legendText, styles.legendTextBold]}>निवडलेले</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendMiniSeatBooked} />
              <Text style={styles.legendText}>आरक्षित</Text>
            </View>
          </View>
        </View>

        {/* Error notification banner if any */}
        {error ? (
          <View style={styles.alertBanner}>
            <Icon name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {/* ── 5. Modern BookMyShow ReDesign Auditorium Map ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>Loading auditorium seats from database...</Text>
          </View>
        ) : !sessions.length ? (
          <View style={styles.loadingBox}>
            <Icon name="calendar-remove" size={44} color={COLORS.textMuted} />
            <Text style={styles.loadingText}>No upcoming shows available.</Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 12 }} />
          </View>
        ) : !sectionViews.length ? (
          <View style={styles.loadingBox}>
            <Icon name="seat-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.loadingText}>
              {error || 'Seat layout not available for this show. Please refresh or pick another time.'}
            </Text>
            <Button
              title="Retry seats"
              onPress={() => {
                setError(null);
                setLoading(true);
                api
                  .getSessionSeats(sessionId, { fresh: true, timeoutMs: 22000 })
                  .then((data) => {
                    const liveSeats = data.seats || [];
                    setSeats(liveSeats);
                    setSectionsData(Array.isArray(data.sections) ? data.sections : []);
                    setLayoutConfig(data.layoutConfig || null);
                    sessionSeatsCache.set(sessionId, {
                      seats: liveSeats,
                      sections: data.sections || [],
                      layoutConfig: data.layoutConfig || null,
                      time: Date.now(),
                    });
                    if (!liveSeats.length) {
                      setError('No seats available for this show right now.');
                    }
                  })
                  .catch((e) => setError(e?.message || 'Seat map unavailable.'))
                  .finally(() => setLoading(false));
              }}
              style={{ marginTop: 12 }}
            />
            <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 8 }} />
          </View>
        ) : (
          <View style={styles.seatingPlanContainer}>
            <GestureDetector gesture={mapGesture}>
              <AnimatedRe.View style={[styles.theatreMapViewport, mapAnimStyle]}>
            {/* ── 3D Perspective Stage / Cinema Screen with Ambient Glow ── */}
            <View style={styles.stageTheaterBox}>
              <Svg width={SCREEN_WIDTH - 32} height={74} viewBox="0 0 340 74" fill="none">
                <Defs>
                  <LinearGradient id="stageConeGrad" x1="170" y1="6" x2="170" y2="72" gradientUnits="userSpaceOnUse">
                    <Stop offset="0%" stopColor="#EA580C" stopOpacity="0.28" />
                    <Stop offset="55%" stopColor="#FB923C" stopOpacity="0.09" />
                    <Stop offset="100%" stopColor="#FFF7ED" stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="screenBarGrad" x1="24" y1="14" x2="316" y2="14" gradientUnits="userSpaceOnUse">
                    <Stop offset="0%" stopColor="#FDBA74" stopOpacity="0.4" />
                    <Stop offset="20%" stopColor="#EA580C" stopOpacity="1" />
                    <Stop offset="50%" stopColor="#F97316" stopOpacity="1" />
                    <Stop offset="80%" stopColor="#EA580C" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#FDBA74" stopOpacity="0.4" />
                  </LinearGradient>
                </Defs>

                {/* Perspective Light Cone */}
                <Path
                  d="M 30,22 Q 170,-4 310,22 L 336,70 Q 170,50 4,70 Z"
                  fill="url(#stageConeGrad)"
                />

                {/* Outer Soft Glow Arc */}
                <Path
                  d="M 24,22 Q 170,-3 316,22"
                  stroke="#FED7AA"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity={0.55}
                />

                {/* Main 3D Screen Bezel Arc */}
                <Path
                  d="M 28,22 Q 170,-2 312,22"
                  stroke="url(#screenBarGrad)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />

                {/* Inner Highlight Rim */}
                <Path
                  d="M 48,25 Q 170,4 292,25"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              </Svg>

              <View style={styles.stageBadgeOverlay}>
                <View style={styles.stageNowPlayingPill}>
                  <Icon name="theater" size={12} color="#EA580C" />
                  <Text style={styles.stageTitleText}>रंगमंच / STAGE THIS WAY</Text>
                </View>
                <Text style={styles.stageSubtitleText}>
                  सर्व आसनांमधून स्पष्ट दृश्य (All eyes this way please)
                </Text>
              </View>
            </View>

            {/* ── Auditorium map: pinch/pan + BMS mini overview ── */}
            <View>
              {sectionViews.map((section) => {
                const renderRowsGrid = (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.sectionSeatsHorizontalScroll}
                  >
                    <View style={styles.sectionSeatsGrid}>
                      {section.rows.map((row) => {
                        const aisleIndex = Math.floor(row.seats.length / 2);
                        return (
                          <View key={`${section.key}-${row.label}`} style={styles.seatRowWrapper}>
                            <Text style={styles.rowLabelText}>{row.label}</Text>
                            <View style={styles.seatsTrack}>
                              {row.seats.map((seat, seatIdx) => {
                                const isSelected = selected.includes(seat.seatId);
                                const isBooked =
                                  seat.status === 'booked' ||
                                  seat.status === 'held' ||
                                  seat.status === 'blocked';
                                const showAisle =
                                  row.aisleAfter.includes(seatIdx + 1) ||
                                  (!row.aisleAfter.length &&
                                    row.seats.length >= 6 &&
                                    seatIdx === aisleIndex - 1);

                                return (
                                  <React.Fragment key={seat.seatId}>
                                    <RealisticSeatIcon
                                      seat={seat}
                                      size={seatCellSize}
                                      isSelected={isSelected}
                                      isBooked={isBooked}
                                      onPress={toggle}
                                    />
                                    {showAisle ? <View style={styles.aisleWalkway} /> : null}
                                  </React.Fragment>
                                );
                              })}
                            </View>
                            <Text style={styles.rowLabelTextRight}>{row.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                );

                return (
                  <View key={section.key} style={styles.sectionCard}>
                    <View style={styles.sectionCardHeader}>
                      <View style={styles.sectionTitleLeft}>
                        <View style={styles.sectionIconBox}>
                          <Icon name={section.iconName} size={16} color="#EA580C" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sectionTitleText} numberOfLines={1}>
                            {section.secondaryLabel || section.primaryLabel}{' '}
                            <Text style={styles.sectionSubLabel}>({section.primaryLabel})</Text>
                          </Text>
                          <View style={styles.sectionMetaRow}>
                            <View
                              style={[
                                styles.sectionAvailDot,
                                {
                                  backgroundColor:
                                    section.availableCount > 15
                                      ? '#16A34A'
                                      : section.availableCount > 0
                                        ? '#F59E0B'
                                        : '#94A3B8',
                                },
                              ]}
                            />
                            <Text style={styles.sectionAvailText}>
                              {section.availableCount > 0
                                ? `${toMarathiDigits(section.availableCount)} जागा उपलब्ध`
                                : 'हाऊसफुल (Sold Out)'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.sectionPricePill}>
                        <Text style={styles.sectionPricePillText}>
                          ₹{toMarathiDigits(Math.round(section.price / 100))}
                        </Text>
                        <Text style={styles.sectionPricePerSeat}>/ आसन</Text>
                      </View>
                    </View>

                    <View style={styles.sectionHeaderDivider} />
                    {renderRowsGrid}
                  </View>
                );
              })}
            </View>
              </AnimatedRe.View>
            </GestureDetector>

            {/* BMS-style mini overview map */}
            <View style={styles.miniMapCard} pointerEvents="box-none">
              <Text style={styles.miniMapTitle}>
                {language === 'mr' ? 'नकाशा' : 'Map'}
              </Text>
              <View style={styles.miniMapCanvas}>
                {sectionViews.slice(0, 4).map((section) => (
                  <View key={`mini-${section.key}`} style={styles.miniMapSection}>
                    {section.rows.slice(0, 6).map((row) => (
                      <View key={`mini-${section.key}-${row.label}`} style={styles.miniMapRow}>
                        {row.seats.slice(0, 14).map((seat) => {
                          const isSelected = selected.includes(seat.seatId);
                          const isBooked =
                            seat.status === 'booked' ||
                            seat.status === 'held' ||
                            seat.status === 'blocked';
                          return (
                            <View
                              key={seat.seatId}
                              style={[
                                styles.miniMapDot,
                                isSelected && styles.miniMapDotSelected,
                                isBooked && !isSelected && styles.miniMapDotBooked,
                              ]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => {
                  mapScale.value = withTiming(1);
                  mapSavedScale.value = 1;
                  mapTX.value = withTiming(0);
                  mapTY.value = withTiming(0);
                  mapSavedTX.value = 0;
                  mapSavedTY.value = 0;
                }}
                hitSlop={8}
              >
                <Text style={styles.miniMapReset}>
                  {language === 'mr' ? 'रीसेट · पिंच झूम' : 'Reset · pinch zoom'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── 6. Trust & Security Footer Badge ── */}
            <View style={styles.trustBadgeContainer}>
              <Icon name="shield-check-outline" size={15} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.trustBadgeText}>
                महाराष्ट्राचे अधिकृत थेट तिकीट आरक्षण • १००% सुरक्षित पेमेंट
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── 7. Modern Bottom Sticky Action Dock with Removable Seat Chips ── */}
      <View style={[styles.bottomStickyDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Selected Seat Chips Strip */}
        {selectedSeats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedChipsStrip}
          >
            {selectedSeats.map((s) => (
              <TouchableOpacity
                key={s.seatId}
                onPress={() => toggle(s)}
                activeOpacity={0.75}
                style={styles.selectedSeatChip}
              >
                <Icon name="seat" size={12} color="#EA580C" />
                <Text style={styles.selectedSeatChipCode}>{s.seatCode}</Text>
                <Text style={styles.selectedSeatChipPrice}>
                  ₹{toMarathiDigits(Math.round(Number(s.price || 0) / 100))}
                </Text>
                <Icon name="close-circle" size={13} color="#9A3412" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Floating error notification banner above bottom dock */}
        {error ? (
          <TouchableOpacity
            style={styles.floatingBottomAlert}
            activeOpacity={0.9}
            onPress={() => setError(null)}
          >
            <Icon name="alert-circle" size={15} color="#DC2626" />
            <Text style={styles.floatingAlertText} numberOfLines={2}>
              {error}
            </Text>
            <Icon name="close" size={14} color="#64748B" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.bottomDockMainRow}>
          <View style={styles.bottomDockLeft}>
            <View style={styles.selectedCountRow}>
              <View
                style={[
                  styles.liveIndicatorDot,
                  { backgroundColor: selected.length > 0 ? '#16A34A' : '#94A3B8' },
                ]}
              />
              <Text style={styles.selectedSeatsSummaryText} numberOfLines={1}>
                {selected.length > 0
                  ? `${toMarathiDigits(selected.length)} आसने निवडली`
                  : 'कोणतेही आसन निवडलेले नाही'}
              </Text>
            </View>

            <View style={styles.pricingSummaryRow}>
              <Text style={styles.totalPriceAmount}>
                ₹{toMarathiDigits(Math.round(subtotal / 100))}
              </Text>
              <Text style={styles.gstNoteText}> + कर (Taxes)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.proceedButton,
              // Match web: stay orange while holding; only grey when nothing selected or no showtime
              (!selected.length || !sessionStartTime) && styles.proceedButtonDisabled,
            ]}
            disabled={!selected.length || holding || !sessionStartTime}
            onPress={finishHold}
            activeOpacity={0.85}
          >
            {holding ? (
              <View style={styles.proceedBtnInner}>
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 6 }} />
                <Text style={styles.proceedButtonText}>आरक्षित करत आहे...</Text>
              </View>
            ) : (
              <View style={styles.proceedBtnInner}>
                <Text
                  style={[
                    styles.proceedButtonText,
                    (!selected.length || !sessionStartTime) && styles.proceedButtonTextDisabled,
                  ]}
                >
                  {!sessionStartTime
                    ? 'तारीख निवडा'
                    : selected.length > 0
                    ? 'पुढे जा'
                    : 'आसने निवडा'}
                </Text>
                <Icon
                  name={selected.length > 0 && sessionStartTime ? 'arrow-right' : 'seat-outline'}
                  size={16}
                  color={selected.length > 0 && sessionStartTime ? '#FFFFFF' : '#64748B'}
                  style={{ marginLeft: 5 }}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Discard Seat Selection Confirmation Modal ── */}
      <MTPopupModal
        visible={showDiscardModal}
        type="warning"
        title="बुकिंग रद्द करायची आहे का?"
        message="तुम्ही मागे गेल्यास तुमची निवडलेली तात्पुरती आसने रद्द केली जातील आणि कॅश/कुकीज क्लिअर केले जातील. (Your selected seats will be released.)"
        primaryButtonText="होय, रद्द करा (Release)"
        onPrimaryPress={async () => {
          setShowDiscardModal(false);
          const cart = useCartStore.getState();
          const token = cart.holdToken;
          const heldSeats =
            (cart.selectedSeatIds && cart.selectedSeatIds.length > 0
              ? cart.selectedSeatIds
              : selected) || [];
          try {
            if (sessionId && token && !String(token).startsWith('app-hold-') && heldSeats.length) {
              await api.releaseHold({
                sessionId,
                holdToken: token,
                seatIds: heldSeats,
              });
            }
          } catch {
            // Server TTL still expires holds; continue local cleanup
          }
          setSelected([]);
          cart.clearCart();
          sessionSeatsCache.delete(sessionId);
          navigation.goBack();
        }}
        secondaryButtonText="नाही, सुरू ठेवा (Cancel)"
        onSecondaryPress={() => setShowDiscardModal(false)}
        onRequestClose={() => setShowDiscardModal(false)}
      />


      {/* ── Error / Notice Modal ── */}
      <MTPopupModal
        visible={!!errorModalMsg}
        type="error"
        title="आसन आरक्षण सूचना"
        message={errorModalMsg || 'निवडलेली आसने या शोसाठी उपलब्ध नाहीत किंवा वेळ संपली आहे.'}
        primaryButtonText="समजले (OK)"
        onPrimaryPress={() => {
          setErrorModalMsg(null);
          fetchSeats();
        }}
        onRequestClose={() => {
          setErrorModalMsg(null);
          fetchSeats();
        }}
      />

      {/* ── Help & Support Modal ── */}
      <MTPopupModal
        visible={showHelpModal}
        type="help"
        title="MahaTicket ग्राहक सहाय्यता"
        message="नाट्यगृह आसन आरक्षण व तिकीट सहाय्यासाठी संपर्क: contact.mahaticket@gmail.com किंवा WhatsApp +91-7020210543"
        primaryButtonText="समजले (Close)"
        onPrimaryPress={() => setShowHelpModal(false)}
        onRequestClose={() => setShowHelpModal(false)}
      />
    </View>
  );
}

function splitParts(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[/|,()]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeValue(value?: string | null): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getLookupKeys(...values: Array<string | null | undefined>): string[] {
  const keys = new Set<string>();
  values.forEach((value) => {
    splitParts(value).forEach((part) => {
      const normalized = normalizeValue(part);
      if (normalized) keys.add(normalized);
    });
  });
  return Array.from(keys);
}

function resolveSectionTitles(name?: string | null, nameMr?: string | null) {
  const nameParts = splitParts(name);
  const secondaryParts = splitParts(nameMr);

  let primaryLabel =
    nameParts.find((part) => LATIN_RE.test(part)) ||
    secondaryParts.find((part) => LATIN_RE.test(part)) ||
    nameParts[0] ||
    secondaryParts[0] ||
    'Section';

  let secondaryLabel =
    nameParts.find(
      (part) =>
        DEVANAGARI_RE.test(part) &&
        normalizeValue(part) !== normalizeValue(primaryLabel)
    ) ||
    secondaryParts.find(
      (part) => normalizeValue(part) !== normalizeValue(primaryLabel)
    ) ||
    null;

  if (secondaryLabel && normalizeValue(secondaryLabel) === normalizeValue(primaryLabel)) {
    secondaryLabel = null;
  }

  if (!primaryLabel) primaryLabel = 'Section';
  return { primaryLabel, secondaryLabel };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. Top Navigation Bar (UNCHANGED)
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flex: 1,
    marginLeft: 6,
  },
  brandBadge: {
    alignSelf: 'flex-start',
  },
  brandLogoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navActionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSearchInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  navAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EA580C',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // 2. Event Preview Card (UNCHANGED)
  eventPreviewCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  posterWrapper: {
    width: 72,
    height: 94,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  posterImg: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
  },
  categoryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  eventDetailsBlock: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 2,
  },
  fastFillingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  fastFillingText: {
    color: '#16A34A',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  eventTitleText: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
    lineHeight: 24,
    includeFontPadding: true,
    paddingVertical: 2,
  },
  castText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 16,
    includeFontPadding: true,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  dateTimeCalendarIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  dateTimeText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
    includeFontPadding: true,
    paddingVertical: 1,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  venuePinIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  venueText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
    includeFontPadding: true,
    paddingVertical: 1,
  },

  // Showtimes switcher
  sessionsBarWrap: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  sessionsScrollContent: {
    gap: 8,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sessionChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  sessionChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
  },
  sessionChipTextActive: {
    color: '#FFFFFF',
  },

  // 3. Countdown Timer Banner (UNCHANGED)
  timerBannerWrap: {
    marginHorizontal: 12,
    marginTop: 6,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerClockEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  timerLabelText: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '800',
  },
  timerCountdownText: {
    color: '#9A3412',
    fontSize: 12.5,
    fontWeight: '900',
  },

  // 4. Modern Legend & Zoom Bar
  legendCardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendItemsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendMiniSeatAvail: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    alignItems: 'center',
    overflow: 'hidden',
  },
  legendMiniSeatTopAvail: {
    width: '70%',
    height: 3,
    backgroundColor: '#FB923C',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  legendMiniSeatSelected: {
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#EA580C',
    borderWidth: 1,
    borderColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendMiniSeatBooked: {
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  legendText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '700',
  },
  legendTextBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  pinchHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  pinchHintText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },
  theatreMapViewport: {
    width: '100%',
    alignItems: 'stretch',
  },
  miniMapCard: {
    position: 'absolute',
    right: 12,
    bottom: 56,
    width: 112,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 6,
    zIndex: 20,
    ...SHADOWS.sm,
  },
  miniMapTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  miniMapCanvas: {
    height: 78,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  miniMapSection: {
    alignItems: 'center',
    gap: 1,
  },
  miniMapRow: {
    flexDirection: 'row',
    gap: 1,
  },
  miniMapDot: {
    width: 3,
    height: 3,
    borderRadius: 0.5,
    backgroundColor: '#94A3B8',
  },
  miniMapDotSelected: {
    backgroundColor: '#EA580C',
  },
  miniMapDotBooked: {
    backgroundColor: '#CBD5E1',
  },
  miniMapReset: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
    color: '#EA580C',
    textAlign: 'center',
  },

  // 5. Stage Screen & Auditorium Seating Plan
  seatingPlanContainer: {
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  stageTheaterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    position: 'relative',
  },
  stageBadgeOverlay: {
    alignItems: 'center',
    marginTop: -38,
    paddingBottom: 6,
  },
  stageNowPlayingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    ...SHADOWS.sm,
  },
  stageTitleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.7,
  },
  stageSubtitleText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  sectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  sectionAvailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionAvailText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
  },
  sectionPricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionPricePillText: {
    color: '#EA580C',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionPricePerSeat: {
    color: '#9A3412',
    fontSize: 9.5,
    fontWeight: '700',
    marginLeft: 2,
  },
  sectionHeaderDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  horizontalSeatScrollContent: {
    paddingHorizontal: 4,
    minWidth: '100%',
    justifyContent: 'center',
  },

  sectionSeatsHorizontalScroll: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: '100%',
  },
  sectionSeatsGrid: {
    alignItems: 'center',
    gap: 4,
  },
  seatRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rowLabelText: {
    width: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    marginRight: 4,
  },
  rowLabelTextRight: {
    width: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    marginLeft: 4,
  },
  rowLabelPill: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
  },
  seatsTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 1,
    gap: 2,
  },

  // BMS compact seat boxes
  bmsSeatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  bmsSeatAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#16A34A',
  },
  bmsSeatSelected: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
  },
  bmsSeatBooked: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
  },
  bmsSeatNum: {
    fontWeight: '800',
  },

  // Realistic 3D Theater Armchair Styles (unused on map)
  realSeatOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  realSeatHeadrest: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    marginBottom: -1,
    zIndex: 2,
  },
  realSeatHeadrestAvailable: {
    backgroundColor: '#FB923C',
  },
  realSeatHeadrestSelected: {
    backgroundColor: '#9A3412',
  },
  realSeatHeadrestBooked: {
    backgroundColor: '#CBD5E1',
  },
  realSeatBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  realSeatArmrest: {
    borderRadius: 2,
    marginBottom: 2,
  },
  realSeatArmrestAvailable: {
    backgroundColor: '#94A3B8',
  },
  realSeatArmrestSelected: {
    backgroundColor: '#C2410C',
  },
  realSeatArmrestBooked: {
    backgroundColor: '#CBD5E1',
  },
  realSeatCushion: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -1,
    zIndex: 1,
  },
  realSeatCushionAvailable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#94A3B8',
    borderBottomWidth: 2.5,
    borderBottomColor: '#64748B',
  },
  realSeatCushionSelected: {
    backgroundColor: '#EA580C',
    borderWidth: 1.5,
    borderColor: '#C2410C',
    borderBottomWidth: 2.5,
    borderBottomColor: '#9A3412',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  realSeatCushionBooked: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    opacity: 0.75,
  },
  realSeatNumber: {
    fontWeight: '800',
  },
  realSeatNumberAvailable: {
    color: '#1E293B',
  },
  realSeatNumberBooked: {
    color: '#94A3B8',
  },

  aisleWalkway: {
    width: 8,
    height: 1,
  },
  aisleDash: {
    width: 1,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#CBD5E1',
  },

  // 6. Trust Badge
  trustBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    paddingHorizontal: 16,
  },
  trustBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },

  // 7. Bottom Sticky Dock
  bottomStickyDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingTop: 8,
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  selectedChipsStrip: {
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  selectedSeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selectedSeatChipCode: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  selectedSeatChipPrice: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  bottomDockMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomDockLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  selectedCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  selectedSeatsSummaryText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    lineHeight: 20,
    includeFontPadding: true,
    paddingVertical: 1,
  },
  pricingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalPriceAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
    includeFontPadding: true,
  },
  gstNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 96,
  },
  proceedButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 20,
    includeFontPadding: true,
    paddingVertical: 2,
  },
  proceedButtonTextDisabled: {
    color: '#64748B',
    fontWeight: '700',
  },

  // Fallback views
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.danger + '12',
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
  },
  alertText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  generalAdmissionBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...SHADOWS.sm,
  },
  gaIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  gaHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  gaSubText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  gaProceedBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...SHADOWS.md,
  },
  gaProceedBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  /* ── In-App Web-Parity Modals (Discard, Timeout, Error) ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalIconWrapWarn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  modalIconWrapTimer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
  },
  modalTitle: {
    fontSize: 17.5,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  modalBtnDiscard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnDiscardText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBtnPrimary: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  floatingBottomAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  floatingAlertText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
});