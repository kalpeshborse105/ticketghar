import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
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
import { COLORS, RADIUS, SHADOWS } from '../theme';
import {
  api,
  SeatItem,
  filterUpcomingSessions,
  formatDate,
  formatShow,
  formatTime,
} from '../api';
import { useCartStore, useAuthStore } from '../store';
import { Button } from '../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POLL_INTERVAL = 10000;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_RE = /[A-Za-z]/;
const TEXT_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const MARATHI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
export function toMarathiDigits(val: number | string): string {
  return String(val).replace(/[0-9]/g, (d) => MARATHI_DIGITS[Number(d)] ?? d);
}

function formatMarathiShowDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return 'शनि २२ ऑक्टो • संध्या. ०५:००';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'शनि २२ ऑक्टो • संध्या. ०५:००';
    const dayNames = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
    const monthNames = [
      'जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून',
      'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें',
    ];
    const dayOfWeek = dayNames[d.getDay()];
    const dateNum = d.getDate();
    const month = monthNames[d.getMonth()];

    const hours = d.getHours();
    const mins = d.getMinutes();
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
    return 'शनि २२ ऑक्टो • संध्या. ०५:००';
  }
}

const sessionSeatsCache = new Map<
  number,
  { seats: SeatItem[]; sections: any[]; layoutConfig: any; time: number }
>();

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
 * Realistic 3D Auditorium Seat Component (BookMyShow ReDesign style)
 * Renders backrest, side armrests, and seat cushion
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
    const armrestWidth = Math.max(3, Math.round(size * 0.11));
    const armrestHeight = Math.round(size * 0.56);
    const cushionRadius = Math.round(size * 0.24);

    return (
      <Pressable
        onPress={() => onPress(seat)}
        disabled={isBooked}
        hitSlop={{ top: 3, bottom: 3, left: 2, right: 2 }}
        style={({ pressed }) => [
          styles.realSeatOuter,
          { width: size + 4, height: size + 4 },
          pressed && !isBooked && { transform: [{ scale: 0.9 }] },
        ]}
      >
        {/* Top Curved Headrest / Backrest Rim */}
        <View
          style={[
            styles.realSeatHeadrest,
            {
              width: size * 0.72,
              height: Math.max(3.5, Math.round(size * 0.13)),
            },
            isSelected
              ? styles.realSeatHeadrestSelected
              : isBooked
                ? styles.realSeatHeadrestBooked
                : styles.realSeatHeadrestAvailable,
          ]}
        />

        {/* Main Seat Body with Left/Right Armrests */}
        <View style={styles.realSeatBodyRow}>
          {/* Left Armrest */}
          <View
            style={[
              styles.realSeatArmrest,
              { width: armrestWidth, height: armrestHeight },
              isSelected
                ? styles.realSeatArmrestSelected
                : isBooked
                  ? styles.realSeatArmrestBooked
                  : styles.realSeatArmrestAvailable,
            ]}
          />

          {/* Center Seat Cushion */}
          <View
            style={[
              styles.realSeatCushion,
              {
                width: size - armrestWidth * 1.4,
                height: size * 0.78,
                borderRadius: cushionRadius,
              },
              isSelected
                ? styles.realSeatCushionSelected
                : isBooked
                  ? styles.realSeatCushionBooked
                  : styles.realSeatCushionAvailable,
            ]}
          >
            {isSelected ? (
              <Icon name="check-bold" size={Math.max(11, Math.round(size * 0.42))} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.realSeatNumber,
                  { fontSize: Math.max(9, Math.round(size * 0.33)) },
                  isBooked ? styles.realSeatNumberBooked : styles.realSeatNumberAvailable,
                ]}
                numberOfLines={1}
              >
                {seat.seatNumber}
              </Text>
            )}
          </View>

          {/* Right Armrest */}
          <View
            style={[
              styles.realSeatArmrest,
              { width: armrestWidth, height: armrestHeight },
              isSelected
                ? styles.realSeatArmrestSelected
                : isBooked
                  ? styles.realSeatArmrestBooked
                  : styles.realSeatArmrestAvailable,
            ]}
          />
        </View>
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
  const [zoomedIn, setZoomedIn] = useState(false);

  // Reservation countdown timer: 10 minutes (599s)
  const [secondsLeft, setSecondsLeft] = useState(599);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 599));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTimer = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${toMarathiDigits(String(m).padStart(2, '0'))}:${toMarathiDigits(
      String(s).padStart(2, '0')
    )} मि.`;
  }, [secondsLeft]);

  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const selectedRef = useRef<number[]>([]);
  selectedRef.current = selected;

  const handleBackPress = useCallback(() => {
    if (selected.length > 0) {
      Alert.alert(
        'सीट निवड रद्द करायची का?',
        'तुम्ही निवडलेली आसने परत उपलब्ध होतील. बाहेर पडायचे आहे का? (Your selected seats will be released back to the auditorium map.)',
        [
          { text: 'नाही (Cancel)', style: 'cancel' },
          {
            text: 'होय, (Release)',
            style: 'destructive',
            onPress: () => {
              setSelected([]);
              navigation.goBack();
            },
          },
        ]
      );
      return true;
    }
    navigation.goBack();
    return true;
  }, [navigation, selected.length]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  useEffect(() => {
    if (!sessions.length && eventId) {
      api
        .getEvent(eventId)
        .then((d) => {
          const upcoming = filterUpcomingSessions(d.event?.sessions);
          setSessions(upcoming);
          if (upcoming.length && !upcoming.some((s) => s.id === sessionId)) {
            setSessionId(upcoming[0].id);
          }
        })
        .catch(() => null);
    }
  }, [eventId, sessionId, sessions.length]);

  const activeSession =
    sessions.find((s) => s.id === sessionId) || routeSelectedSession || sessions[0];
  const sessionStartTime = activeSession?.sessionStartTime || routeSelectedSession?.sessionStartTime;

  const fetchSeats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await api.getSessionSeats(sessionId);
      const liveSeats = data.seats || [];
      const selectedIds = selectedRef.current;

      setSeats(
        liveSeats.map((seat) => ({
          ...seat,
          status: selectedIds.includes(seat.seatId) ? ('selected' as any) : seat.status,
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
        setError('No seats available for this show right now.');
      }
    } catch {
      // Background poll failure is silent
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError('No upcoming show selected.');
      return;
    }

    let cancelled = false;
    const cached = sessionSeatsCache.get(sessionId);

    if (cached && Date.now() - cached.time < 60000) {
      setSeats(cached.seats);
      setSectionsData(cached.sections || []);
      setLayoutConfig(cached.layoutConfig || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setSelected([]);
    setError(null);

    api
      .getSessionSeats(sessionId)
      .then((data) => {
        if (cancelled) return;
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
      .catch((e) => {
        if (!cancelled && !cached) {
          setError(e.message || 'Seat map unavailable.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    pollRef.current = setInterval(fetchSeats, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [fetchSeats, sessionId]);

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
          const rowKey = seat.rowLabel || '?';
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
  const subtotal = useMemo(
    () => selectedSeats.reduce((total, seat) => total + Number(seat.price || 0), 0),
    [selectedSeats]
  );

  const priceRangeLabel = useMemo(() => {
    const prices = sectionViews.map((s) => Math.round(s.price / 100)).filter((p) => p > 0);
    if (!prices.length) return '₹३००/५००';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `₹${toMarathiDigits(min)}`;
    return `₹${toMarathiDigits(min)}/${toMarathiDigits(max)}`;
  }, [sectionViews]);

  const maxSeatsAcrossRows = useMemo(() => {
    return Math.max(
      1,
      ...sectionViews.flatMap((section) =>
        section.rows.map((row) => row.seats.length + row.aisleAfter.length)
      )
    );
  }, [sectionViews]);

  const seatCellSize = useMemo(() => {
    if (zoomedIn) return 34;
    const usableWidth = SCREEN_WIDTH - 76;
    return Math.max(26, Math.min(31, Math.floor(usableWidth / Math.min(maxSeatsAcrossRows + 2, 11))));
  }, [maxSeatsAcrossRows, zoomedIn]);

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
    if (!selected.length) return;
    try {
      setHolding(true);
      const userIdStr = user?.id ? String(user.id) : `guest-app-${Date.now()}`;
      const hold = await api.hold({ sessionId, seatIds: selected, userIdStr });
      const lockedFace = hold.hold.faceValueTotal > 0 ? hold.hold.faceValueTotal : subtotal;

      setHold({
        holdToken: hold.holdToken,
        expiresAt: hold.hold.holdExpiresAt,
        eventId,
        sessionId,
        seatIds: selected,
        seatCodes: selectedSeats.map((seat) => seat.seatCode),
        faceValue: lockedFace,
      });

      navigation.navigate('Checkout', {
        holdToken: hold.holdToken,
        faceValue: lockedFace,
        seatCodes: selectedSeats.map((seat) => seat.seatCode),
        seatIds: selected,
        expiresAt: hold.hold.holdExpiresAt,
        addons: {},
        addonTotal: 0,
        partySize: selected.length,
        eventId,
        sessionId,
        eventTitle,
        posterUrl,
        sessionMeta: sessionStartTime ? formatShow(sessionStartTime) : routeSessionMeta,
      });
    } catch (e: any) {
      setError(e.message || 'Selected seats are no longer available. Please refresh the map.');
      fetchSeats();
      setSelected([]);
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
    return 'प्रसाद ओक • मुक्ता बर्वे';
  }, [cast, routeEvent]);

  const fullVenueLine = useMemo(() => {
    const name = venueName || routeEvent?.venue?.name || 'बाळ गंधर्व रंगमंदिर';
    const addr = venueAddress || routeEvent?.venue?.address || 'JM Road, पुणे';
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
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.navSearchInitial}>S.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navActionIcon}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                'MahaTicket Help & Support',
                'नाट्यगृह आसन आरक्षण व तिकीट सहाय्यासाठी संपर्क: contact.mahaticket@gmail.com किंवा WhatsApp 8888888888',
                [{ text: 'ठीक आहे' }]
              );
            }}
          >
            <Icon name="help-circle-outline" size={22} color="#334155" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navAvatarBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Profile')}
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
              <Text style={styles.dateTimeText} numberOfLines={1}>
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
                    onPress={() => setSessionId(s.id)}
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

        {/* ── 3. Reservation Hold Countdown Timer Banner (UNCHANGED) ── */}
        <View style={styles.timerBannerWrap}>
          <View style={styles.timerBanner}>
            <View style={styles.timerLeft}>
              <Text style={styles.timerClockEmoji}>⏱️</Text>
              <Text style={styles.timerLabelText}>तिकिटे राखीव राहतील:</Text>
            </View>
            <Text style={styles.timerCountdownText}>{formattedTimer}</Text>
          </View>
        </View>

        {/* ── 4. Modern Seat Legend & Zoom Control Bar ── */}
        <View style={styles.legendCardBar}>
          <View style={styles.legendItemsGroup}>
            {/* Available Mini Chair */}
            <View style={styles.legendItem}>
              <View style={styles.legendMiniSeatAvail}>
                <View style={styles.legendMiniSeatTopAvail} />
              </View>
              <Text style={styles.legendText}>उपलब्ध ({priceRangeLabel})</Text>
            </View>

            {/* Selected Mini Chair */}
            <View style={styles.legendItem}>
              <View style={styles.legendMiniSeatSelected}>
                <Icon name="check-bold" size={9} color="#FFFFFF" />
              </View>
              <Text style={[styles.legendText, styles.legendTextBold]}>निवडलेले</Text>
            </View>

            {/* Reserved Mini Chair */}
            <View style={styles.legendItem}>
              <View style={styles.legendMiniSeatBooked} />
              <Text style={styles.legendText}>आरक्षित</Text>
            </View>
          </View>

          {/* Zoom Toggle Pill */}
          <TouchableOpacity
            onPress={() => setZoomedIn((z) => !z)}
            activeOpacity={0.8}
            style={[styles.zoomToggleBtn, zoomedIn && styles.zoomToggleBtnActive]}
          >
            <Icon
              name={zoomedIn ? 'magnify-minus-outline' : 'magnify-plus-outline'}
              size={14}
              color={zoomedIn ? '#FFFFFF' : '#EA580C'}
            />
            <Text style={[styles.zoomToggleText, zoomedIn && { color: '#FFFFFF' }]}>
              {zoomedIn ? '1.25x' : '1x'}
            </Text>
          </TouchableOpacity>
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
          <View style={styles.generalAdmissionBox}>
            <View style={styles.gaIconCircle}>
              <Icon name="ticket-confirmation" size={36} color="#EA580C" />
            </View>
            <Text style={styles.gaHeading}>थेट प्रवेश पास (Open Entry)</Text>
            <Text style={styles.gaSubText}>
              या कार्यक्रमासाठी थेट खुली जागा / प्रवेश आहे. आपले तिकीट सुरक्षित करण्यासाठी खालील बटनावर टॅप करा.
            </Text>
            <TouchableOpacity
              style={styles.gaProceedBtn}
              onPress={() => {
                const tt = (activeSession?.ticketTypes && activeSession.ticketTypes[0]) || {
                  price: 25000,
                  name: 'Entry Pass',
                };
                const fVal = tt.price || 25000;
                navigation.navigate('Checkout', {
                  holdToken: `ga_pass_${Date.now()}`,
                  faceValue: fVal,
                  seatCodes: ['GA-PASS-1'],
                  seatIds: [1],
                  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                  addonTotal: 0,
                  eventId: eventId,
                  sessionId: sessionId,
                  eventTitle: eventTitle,
                  posterUrl: posterUrl,
                  sessionMeta: sessionStartTime ? formatShow(sessionStartTime) : routeSessionMeta,
                  venueName: venueName,
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.gaProceedBtnText}>तिकीट खरेदी करा (Book Pass) →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.seatingPlanContainer}>
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

            {/* ── Auditorium Tier Section Cards ── */}
            {sectionViews.map((section) => {
              const needsHorizontalScroll =
                zoomedIn ||
                section.rows.some((r) => r.seats.length + r.aisleAfter.length > 9);

              const renderRowsGrid = (
                <View style={styles.sectionSeatsGrid}>
                  {section.rows.map((row) => {
                    const aisleIndex = Math.floor(row.seats.length / 2);
                    return (
                      <View key={`${section.key}-${row.label}`} style={styles.seatRowWrapper}>
                        {/* Left Row Pill Badge */}
                        <View style={styles.rowLabelPill}>
                          <Text style={styles.rowLabelBadgeText}>{row.label}</Text>
                        </View>

                        {/* Center Realistic Chairs Track */}
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

                                {showAisle ? (
                                  <View style={styles.aisleWalkway}>
                                    <View style={styles.aisleDash} />
                                    <View style={styles.aisleDash} />
                                  </View>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </View>

                        {/* Right Row Pill Badge */}
                        <View style={styles.rowLabelPill}>
                          <Text style={styles.rowLabelBadgeText}>{row.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );

              return (
                <View key={section.key} style={styles.sectionCard}>
                  {/* Tier Header with Name, Available Count & Price Pill */}
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

                  {/* Smooth Horizontal Scroll for Wide Rows */}
                  {needsHorizontalScroll ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalSeatScrollContent}
                    >
                      {renderRowsGrid}
                    </ScrollView>
                  ) : (
                    renderRowsGrid
                  )}
                </View>
              );
            })}

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
                  ? `${toMarathiDigits(selected.length)} आसने निवडली (${selectedSeats
                    .map((s) => s.seatCode)
                    .join(', ')})`
                  : 'आसने निवडा'}
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
              (!selected.length || holding) && styles.proceedButtonDisabled,
            ]}
            disabled={!selected.length || holding}
            onPress={finishHold}
            activeOpacity={0.85}
          >
            {holding ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.proceedBtnInner}>
                <Text style={styles.proceedButtonText}>पुढे जा</Text>
                <Icon name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  },
  castText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
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
    marginHorizontal: 16,
    marginTop: 10,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
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
  zoomToggleBtn: {
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
  zoomToggleBtnActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  zoomToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },

  // 5. Stage Screen & Auditorium Seating Plan
  seatingPlanContainer: {
    marginTop: 6,
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
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 12,
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

  // Seats Grid
  sectionSeatsGrid: {
    alignItems: 'center',
    gap: 8,
  },
  seatRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rowLabelPill: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#475569',
  },
  seatsTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    flex: 1,
  },

  // Realistic 3D Theater Armchair Styles
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
    width: 14,
    height: 22,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  aisleDash: {
    width: 1.5,
    height: 5,
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
    paddingHorizontal: 16,
    paddingTop: 10,
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
  },
  pricingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalPriceAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  gstNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: '#EA580C',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
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
});