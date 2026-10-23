import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { RADIUS, SHADOWS } from '../theme';
import {
  api,
  CastMember,
  EventItem,
  SessionItem,
  filterUpcomingSessions,
  formatShow,
  formatTime,
  parseCastCrew,
  absoluteMediaUrl,
  fallbackPosterUrl,
  getSessionAvailableCount,
  paise,
} from '../api';
import { LoadingLogo } from '../components';
import { displayDescription, displayTitle, displayVenueName } from '../utils/display';
import { useEventsStore, useAuthStore, useUIStore } from '../store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);
const REMINDERS_STORAGE_KEY = '@mt_reminders';

interface StoredReminder {
  eventId: number;
  title: string;
  createdAt: string;
}

interface DateGroup {
  dateKey: string;
  dayLabel: string;
  dayNumber: string;
  monthLabel: string;
  fullDateStr: string;
  sessions: SessionItem[];
}

/** Timezone-safe YYYY-MM-DD key in local device time (IST) */
function toLocalDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function EventDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { eventId, sessionId: routeSessionId } = route.params || {};
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const language = useUIStore((s) => s.language);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reviews & Rating state
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState({ averageRating: 4.8, totalCount: 108 });
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // In-line Email Login Modal state
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'otp'>('email');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Reminder / Interested state
  const [isInterested, setIsInterested] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const loadEventData = React.useCallback(() => {
    const cached = useEventsStore.getState().events.find((e) => e.id === Number(eventId));
    if (cached) {
      setEvent(cached);
      setLoading(false);
      const upcoming = filterUpcomingSessions(cached.sessions);
      if (upcoming.length) {
        const sorted = [...upcoming].sort(
          (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
        );
        const firstAvailable =
          sorted.find((s) => getSessionAvailableCount(s) > 0 && s.status !== 'sold_out' && !s.isSoldOut) ||
          sorted[0];
        setSelectedSession(firstAvailable);
        setSelectedDateKey(toLocalDateKey(firstAvailable.sessionStartTime));
      }
    } else {
      setLoading(true);
    }
    setError(null);

    api
      .getEvent(eventId)
      .then((d) => {
        setEvent(d.event);
        const upcoming = filterUpcomingSessions(d.event?.sessions);
        if (upcoming.length) {
          const sorted = [...upcoming].sort(
            (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
          );
          const homeId = (d.event as any)?.homeSessionId as number | null | undefined;
          const targetSessionId = routeSessionId || homeId;
          const firstAvailable =
            (targetSessionId && sorted.find((s) => Number(s.id) === Number(targetSessionId))) ||
            sorted.find((s) => getSessionAvailableCount(s) > 0 && s.status !== 'sold_out' && !s.isSoldOut) ||
            sorted[0];
          // Prefer detailed payload session (same id), never keep stale list-cache object
          setSelectedSession((prev) => {
            if (prev) {
              const match = sorted.find((s) => s.id === prev.id);
              if (match && getSessionAvailableCount(match) > 0 && match.status !== 'sold_out') {
                setSelectedDateKey(toLocalDateKey(match.sessionStartTime));
                return match;
              }
            }
            setSelectedDateKey(toLocalDateKey(firstAvailable.sessionStartTime));
            return firstAvailable;
          });
        } else {
          setSelectedSession(null);
          setSelectedDateKey('');
        }
      })
      .catch((e) => {
        if (!cached) setError(e.message);
      })
      .finally(() => setLoading(false));

    api
      .getEventReviews(Number(eventId))
      .then((res) => {
        if (res.reviews) setReviews(res.reviews);
        if (res.averageRating) {
          setRatingStats({
            averageRating: res.averageRating,
            totalCount: res.totalCount || res.reviews.length,
          });
        }
      })
      .catch(() => null);
  }, [eventId]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    AsyncStorage.getItem(REMINDERS_STORAGE_KEY)
      .then((res) => {
        if (res) {
          const list: StoredReminder[] = JSON.parse(res);
          setIsInterested(list.some((i) => Number(i.eventId) === Number(eventId)));
        }
      })
      .catch(() => null);
  }, [eventId]);

  const toggleReminder = async () => {
    try {
      const stored = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
      let list: StoredReminder[] = stored ? JSON.parse(stored) : [];
      if (isInterested) {
        list = list.filter((i) => Number(i.eventId) !== Number(eventId));
        setIsInterested(false);
        Toast.show({
          type: 'info',
          text1: 'रिमांडर काढला (Reminder Removed)',
          text2: 'तुम्हाला आता या कार्यक्रमाच्या सूचना मिळणार नाहीत.',
        });
      } else {
        list.push({
          eventId: Number(eventId),
          title: displayTitle(event),
          createdAt: new Date().toISOString(),
        });
        setIsInterested(true);
        Toast.show({
          type: 'success',
          text1: 'रिमांडर सेट झाला! 🔔',
          text2: 'तिकीट बुकिंग व पुढील शो वेळेची सूचना तुम्हाला मिळेल.',
        });
      }
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(list));
    } catch { }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      const shareUrl = `https://mahaticket.kalpkrutinfotech.com/events/${event.id}`;
      await Share.share({
        title: displayTitle(event),
        message: `🎭 महाटिकिट वरून "${displayTitle(event)}" तपासा आणि आपली तिकिटे बुक करा:\n${shareUrl}`,
        url: shareUrl,
      });
    } catch { }
  };

  const openVenueMap = (customVenueName?: string, customVenueAddress?: string) => {
    const v = event?.venue;
    const nameToUse = customVenueName || v?.nameMr || v?.name || 'Auditorium';
    const addrToUse = customVenueAddress || [v?.address, v?.city].filter(Boolean).join(', ');

    if (!customVenueName && v?.latitude && v?.longitude) {
      const label = encodeURIComponent(nameToUse);
      const nativeUrl =
        Platform.OS === 'ios'
          ? `maps:0,0?q=${label}@${v.latitude},${v.longitude}`
          : `geo:${v.latitude},${v.longitude}?q=${v.latitude},${v.longitude}(${label})`;

      Linking.openURL(nativeUrl).catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`
        ).catch(() => null);
      });
      return;
    }

    const query = encodeURIComponent([nameToUse, addrToUse].filter(Boolean).join(', '));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => null);
  };

  const userReview = useMemo(() => {
    if (!isAuthenticated || !user) return null;
    const userEmail = (user.email || '').trim().toLowerCase();
    const userName = (user.name || '').trim().toLowerCase();
    return reviews.find((r) => {
      const rEmail = (r.email || '').trim().toLowerCase();
      const rAuthor = (r.author || '').trim().toLowerCase();
      return (
        (userEmail && rEmail && rEmail === userEmail) ||
        (userName && rAuthor && rAuthor === userName) ||
        (userEmail && rAuthor && rAuthor === userEmail.split('@')[0])
      );
    });
  }, [reviews, isAuthenticated, user]);

  const handleSubmitReview = async () => {
    if (!userComment.trim()) {
      Toast.show({
        type: 'error',
        text1: 'कृपया प्रतिक्रिया लिहा',
        text2: 'आपले मत किंवा अनुभव प्रविष्ट करा.',
      });
      return;
    }

    if (!isAuthenticated || !user?.email) {
      setLoginModalVisible(true);
      return;
    }

    if (userReview) {
      Toast.show({
        type: 'info',
        text1: 'परीक्षण आधीच नोंदवले आहे',
        text2: 'तुम्ही या कार्यक्रमाचे परीक्षण आधीच नोंदवले आहे.',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await api.submitEventReview(Number(eventId), {
        rating: userRating,
        comment: userComment.trim(),
        userName: user.name || user.email.split('@')[0],
        userEmail: user.email,
        city: 'पुणे',
      });

      if (res.success) {
        Toast.show({
          type: 'success',
          text1: 'धन्यवाद! ⭐',
          text2: 'आपले परीक्षण यशस्वीपणे नोंदवले गेले.',
        });
        setUserComment('');
        setReviews((prev) => {
          const userEmailClean = (user.email || '').toLowerCase();
          const userNameClean = (user.name || user.email?.split('@')[0] || '').toLowerCase();
          const filtered = prev.filter(
            (r) =>
              r.email?.toLowerCase() !== userEmailClean &&
              r.author?.toLowerCase() !== userNameClean
          );
          return [
            {
              id: Date.now(),
              author: user.name || user.email?.split('@')[0] || 'मी',
              email: user.email,
              city: 'पुणे',
              rating: userRating,
              date: 'आत्ताच',
              comment: userComment.trim(),
              verified: true,
            },
            ...filtered,
          ];
        });
        setRatingStats((prev) => ({
          averageRating: Number(
            ((prev.averageRating * prev.totalCount + userRating) / (prev.totalCount + 1)).toFixed(1)
          ),
          totalCount: prev.totalCount + 1,
        }));
      } else {
        Toast.show({
          type: 'info',
          text1: 'सूचना',
          text2: res.message || 'परीक्षण नोंदवता आले नाही.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'त्रुटी आली',
        text2: err?.message || 'पुन्हा प्रयत्न करा',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleLoginSendOtp = async () => {
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLoginError('वैध ईमेल प्रविष्ट करा');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      await api.sendEmailOtp(cleanEmail);
      setLoginStep('otp');
    } catch {
      setLoginStep('otp');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginVerifyOtp = async () => {
    if (loginOtp.length !== 6) {
      setLoginError('६-अंकी कोड प्रविष्ट करा');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await api.verifyEmailOtp(loginEmail, loginOtp);
      if (res.success && res.user) {
        await setAuth(res.user, res.token && res.token.includes('.') ? res.token : '');
        setLoginModalVisible(false);
        Toast.show({
          type: 'success',
          text1: 'लॉगिन यशस्वी झाले!',
          text2: 'आता आपले परीक्षण नोंदवा.',
        });
      } else {
        setLoginError('अवैध OTP कोड. कृपया पुन्हा तपासा.');
      }
    } catch {
      setLoginError('पडताळणी अयशस्वी झाली.');
    } finally {
      setLoginLoading(false);
    }
  };

  const dateGroups: DateGroup[] = useMemo(() => {
    if (!event?.sessions) return [];
    const upcoming = filterUpcomingSessions(event.sessions);
    const sorted = [...upcoming].sort(
      (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );

    const map = new Map<string, SessionItem[]>();
    const now = new Date();
    const todayStr = toLocalDateKey(now);
    const tomorrowStr = toLocalDateKey(new Date(now.getTime() + 86400000));

    sorted.forEach((s) => {
      const dKey = toLocalDateKey(s.sessionStartTime);
      if (!dKey) return;
      if (!map.has(dKey)) map.set(dKey, []);
      map.get(dKey)!.push(s);
    });

    return Array.from(map.entries()).map(([dateKey, sessList]) => {
      const dObj = new Date(sessList[0].sessionStartTime);
      const locale = language === 'mr' ? 'mr-IN' : 'en-IN';
      let dayLabel = dObj.toLocaleDateString(locale, { weekday: 'short' });
      if (dateKey === todayStr) dayLabel = language === 'mr' ? 'आज' : 'Today';
      else if (dateKey === tomorrowStr) dayLabel = language === 'mr' ? 'उद्या' : 'Tom';

      const dayNumber = String(dObj.getDate()).padStart(2, '0');
      const monthLabel = dObj.toLocaleDateString(locale, { month: 'short' });
      const fullDateStr = dObj.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      return {
        dateKey,
        dayLabel,
        dayNumber,
        monthLabel,
        fullDateStr,
        sessions: sessList,
      };
    });
  }, [event?.sessions, language]);

  useEffect(() => {
    if (
      dateGroups.length > 0 &&
      (!selectedDateKey || !dateGroups.some((g) => g.dateKey === selectedDateKey))
    ) {
      // Prefer API homeSessionId when present
      const homeId = (event as any)?.homeSessionId;
      const homeGroup =
        (homeId &&
          dateGroups.find((g) => g.sessions.some((s) => Number(s.id) === Number(homeId)))) ||
        dateGroups[0];
      setSelectedDateKey(homeGroup.dateKey);
      if (
        !selectedSession ||
        !homeGroup.sessions.some((s: { id: number }) => s.id === selectedSession.id)
      ) {
        const preferred =
          (homeId &&
            homeGroup.sessions.find((s: { id: number }) => Number(s.id) === Number(homeId))) ||
          homeGroup.sessions.find(
            (s: { id: number; status?: string }) =>
              getSessionAvailableCount(s as any) > 0 && s.status !== 'sold_out'
          ) ||
          homeGroup.sessions[0];
        setSelectedSession(preferred);
      }
    }
  }, [dateGroups, selectedDateKey, selectedSession, event]);

  const hasUpcomingSchedule = dateGroups.length > 0;
  const activeDateGroup =
    dateGroups.find((g) => g.dateKey === selectedDateKey) || dateGroups[0];
  const activeDaySessions = activeDateGroup ? activeDateGroup.sessions : [];

  const activeDayVenues = useMemo(() => {
    const map = new Map<
      string,
      { venueName: string; venueAddress?: string; sessions: SessionItem[] }
    >();
    activeDaySessions.forEach((s) => {
      const v = (s as any).venue || event?.venue;
      const vName =
        language === 'mr'
          ? v?.nameMr || v?.name || 'नाट्यगृह'
          : v?.name || v?.nameMr || 'Auditorium';
      const vAddr = v?.address ? `${v.address}${v.city ? `, ${v.city}` : ''}` : '';
      if (!map.has(vName)) {
        map.set(vName, { venueName: vName, venueAddress: vAddr, sessions: [] });
      }
      map.get(vName)!.sessions.push(s);
    });
    return Array.from(map.values());
  }, [activeDaySessions, event?.venue, language]);

  const isSeatedEvent = useMemo(() => {
    if (!event) return true;
    if (event.venue && Number(event.venue.hasSeatLayout) === 0) return false;
    const allTicketTypes = (event.sessions || []).flatMap((s: any) => s.ticketTypes || []);
    if (allTicketTypes.length > 0 && allTicketTypes.every((tt: any) => Number(tt.isSeated) === 0)) {
      return false;
    }
    return true;
  }, [event]);

  const handleProceedToSeats = () => {
    if (!hasUpcomingSchedule || !selectedSession || !event) {
      Toast.show({
        type: 'info',
        text1: 'बुकिंग सध्या उपलब्ध नाही (Booking Unavailable)',
        text2: 'हा माहितीपर कार्यक्रम आहे किंवा पुढील शोच्या तारखा लवकरच जाहीर होतील.',
      });
      return;
    }

    const availableCount = getSessionAvailableCount(selectedSession);
    if (availableCount <= 0 || selectedSession.status === 'sold_out') {
      Toast.show({
        type: 'error',
        text1: 'हा शो हाऊसफुल आहे (Sold Out)',
        text2: 'कृपया दुसरी उपलब्ध वेळ किंवा तारीख निवडा.',
      });
      return;
    }

    // Same as web: always open seat map → hold → checkout (no fake GA seatIds)
    const castString =
      event?.castCrewList && event.castCrewList.length > 0
        ? event.castCrewList.slice(0, 3).map((c: any) => c.name).join(' • ')
        : ((event as any)?.artist || (event as any)?.director || '');

    navigation.navigate('SeatSelection', {
      eventId: event.id,
      sessionId: selectedSession.id,
      eventTitle: displayTitle(event),
      posterUrl: absoluteMediaUrl(event.posterUrl) || fallbackPosterUrl(event.id),
      venueName: displayVenueName(event.venue),
      venueAddress: event.venue?.address || '',
      category: event.category || 'drama',
      cast: castString,
      sessionMeta: formatShow(selectedSession.sessionStartTime),
      allSessions: event.sessions,
      selectedSession: selectedSession,
      event,
    });
  };

  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (event?.bannerUrl) list.push(absoluteMediaUrl(event.bannerUrl) || event.bannerUrl);
    if (event?.posterUrl) list.push(absoluteMediaUrl(event.posterUrl) || event.posterUrl);
    if (list.length === 0) list.push(fallbackPosterUrl(eventId));
    return Array.from(new Set(list));
  }, [event?.bannerUrl, event?.posterUrl, eventId]);

  const castList: CastMember[] = useMemo(() => {
    const list =
      event?.castCrewList && event.castCrewList.length > 0
        ? event.castCrewList
        : parseCastCrew(event?.cast);
    return list.filter((m) => m.name && !m.name.includes('"') && !m.name.startsWith('['));
  }, [event?.cast, event?.castCrewList]);

  const uniqueReviews = useMemo(() => {
    const seen = new Set<string>();
    return reviews.filter((r) => {
      const key = (r.email || r.author || String(r.id)).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [reviews]);

  const selectedSessionAvailableSeats = useMemo(() => {
    if (!selectedSession) return 0;
    return Math.max(0, getSessionAvailableCount(selectedSession));
  }, [selectedSession]);

  const selectedSessionSoldOut = useMemo(() => {
    if (!selectedSession) return false;
    return selectedSessionAvailableSeats <= 0 || selectedSession.status === 'sold_out';
  }, [selectedSession, selectedSessionAvailableSeats]);

  const minTicketPrice = useMemo(() => {
    if (selectedSessionSoldOut) return 0;
    if (
      selectedSession &&
      selectedSession.ticketTypes &&
      selectedSession.ticketTypes.length > 0
    ) {
      const valid = selectedSession.ticketTypes
        .map((t) => t.price)
        .filter((p) => typeof p === 'number' && p > 0);
      if (valid.length > 0) return Math.min(...valid);
    }
    const allPrices = (event?.sessions || [])
      .flatMap((s) => s.ticketTypes || [])
      .map((t) => t.price)
      .filter((p) => typeof p === 'number' && p > 0);
    if (allPrices.length > 0) return Math.min(...allPrices);
    if (event?.minPrice && event.minPrice > 0) return event.minPrice;
    return 0;
  }, [event?.minPrice, event?.sessions, selectedSession, selectedSessionSoldOut]);

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 120, HERO_HEIGHT - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <LoadingLogo fill />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.errorIconCircle}>
          <Icon name="alert-circle-outline" size={48} color="#EA580C" />
        </View>
        <Text style={styles.errorTitle}>माहिती लोड करता आली नाही</Text>
        <Text style={styles.errorSub}>
          {error || 'या कार्यक्रमाची माहिती सध्या उपलब्ध नाही. कृपया पुन्हा प्रयत्न करा.'}
        </Text>
        <View style={styles.errorActionRow}>
          <TouchableOpacity style={styles.secondaryBackBtn} onPress={handleBack}>
            <Text style={styles.secondaryBackBtnText}>मागे जा (Back)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryBtn} onPress={loadEventData}>
            <Icon name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>पुन्हा प्रयत्न करा</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Animated Sticky Top Navigation Bar */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyHeaderBg,
          {
            height: insets.top + 56,
            paddingTop: insets.top,
            opacity: headerBgOpacity,
          },
        ]}
      >
        <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
          {displayTitle(event)}
        </Text>
      </Animated.View>

      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} activeOpacity={0.8}>
          <Icon name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            onPress={toggleReminder}
            style={[styles.headerBtn, isInterested && styles.headerBtnActive]}
            activeOpacity={0.8}
          >
            <Icon
              name={isInterested ? 'bell-ring' : 'bell-outline'}
              size={20}
              color={isInterested ? '#EA580C' : '#0F172A'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn} activeOpacity={0.8}>
            <Icon name="share-variant-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 136 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* 1. HERO POSTER CAROUSEL */}
        <View style={styles.sliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / SCREEN_WIDTH);
              if (idx !== activeImageIndex) setActiveImageIndex(idx);
            }}
            scrollEventThrottle={16}
          >
            {galleryImages.map((uri, index) => (
              <View key={index} style={styles.slideItem}>
                <Image source={{ uri }} style={styles.slideImage} resizeMode="cover" />
                <View style={styles.slideOverlay} />
              </View>
            ))}
          </ScrollView>

          <View style={styles.heroBadgesRow}>
            <View style={styles.badgeOrange}>
              <Icon name="drama-masks" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.badgeOrangeText}>
                {event.categoryMr || event.category || 'मराठी नाटक'}
              </Text>
            </View>

            {hasUpcomingSchedule ? (
              <View style={styles.badgeStatusLive}>
                <View style={styles.livePulseDot} />
                <Text style={styles.badgeStatusLiveText}>
                  {language === 'mr' ? 'बुकिंग सुरू' : 'BOOKING OPEN'}
                </Text>
              </View>
            ) : (
              <View style={styles.badgeStatusInfo}>
                <Icon
                  name="information-outline"
                  size={13}
                  color="#92400E"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeStatusInfoText}>
                  {language === 'mr' ? 'लवकरच येत आहे' : 'UPCOMING'}
                </Text>
              </View>
            )}
          </View>

          {galleryImages.length > 1 && (
            <View style={styles.paginationDots}>
              {galleryImages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeImageIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* 2. TITLE, RATING & QUICK METADATA BAR */}
        <View style={styles.titleSection}>
          <Text style={styles.eventTitle}>{displayTitle(event)}</Text>
          {event.titleMr && event.title && event.title !== event.titleMr && (
            <Text style={styles.eventTitleSub}>{event.title}</Text>
          )}

          {/* Balanced 3-Column Quick Info Strip */}
          <View style={styles.quickMetaGrid}>
            <View style={styles.quickMetaItem}>
              <View style={styles.quickMetaIconCircle}>
                <Icon name="translate" size={15} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.quickMetaLabel}>
                  {language === 'mr' ? 'भाषा' : 'Language'}
                </Text>
                <Text style={styles.quickMetaValue}>
                  {event.language || (language === 'mr' ? 'मराठी' : 'Marathi')}
                </Text>
              </View>
            </View>

            <View style={styles.quickMetaDivider} />

            <View style={styles.quickMetaItem}>
              <View style={styles.quickMetaIconCircle}>
                <Icon name="clock-time-four-outline" size={15} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.quickMetaLabel}>
                  {language === 'mr' ? 'कालावधी' : 'Duration'}
                </Text>
                <Text style={styles.quickMetaValue}>
                  {event.durationMinutes
                    ? `${Math.floor(event.durationMinutes / 60)}h ${event.durationMinutes % 60
                    }m`
                    : '2h 15m'}
                </Text>
              </View>
            </View>

            <View style={styles.quickMetaDivider} />

            <View style={styles.quickMetaItem}>
              <View style={[styles.quickMetaIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Icon name="account-check-outline" size={15} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.quickMetaLabel}>
                  {language === 'mr' ? 'वयोगट' : 'Age Limit'}
                </Text>
                <Text style={styles.quickMetaValue}>{event.ageGuidance || 'U/A 5+'}</Text>
              </View>
            </View>
          </View>

          {/* Audience Rating + "Interested?" Interactive Card */}
          <View style={styles.ratingAndInterestCard}>
            <View style={styles.ratingLeftRow}>
              <View style={styles.starPill}>
                <Icon name="star" size={16} color="#FFB800" />
                <Text style={styles.starPillText}>
                  {ratingStats.averageRating.toFixed(1)}/5
                </Text>
              </View>
              <View style={styles.ratingInfoCol}>
                <Text style={styles.ratingHeading}>
                  {language === 'mr' ? 'प्रेक्षक पसंती' : 'Audience Rating'}
                </Text>
                <Text style={styles.ratingSub}>
                  {ratingStats.totalCount}+{' '}
                  {language === 'mr' ? 'नोंदवलेले अभिप्राय' : 'Verified Reviews'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleReminder}
              activeOpacity={0.8}
              style={[
                styles.interestedBtn,
                isInterested && styles.interestedBtnActive,
              ]}
            >
              <Icon
                name={isInterested ? 'thumb-up' : 'thumb-up-outline'}
                size={14}
                color={isInterested ? '#FFFFFF' : '#EA580C'}
              />
              <Text
                style={[
                  styles.interestedBtnText,
                  isInterested && styles.interestedBtnTextActive,
                ]}
              >
                {language === 'mr'
                  ? isInterested
                    ? 'पसंत केले ✓'
                    : 'उत्सुक आहात?'
                  : isInterested
                    ? 'Interested ✓'
                    : 'Interested?'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. SMART SCHEDULE OR INFORMATIVE / NO-BOOKING WARNING SECTION */}
        <View style={styles.sectionBlock}>
          {hasUpcomingSchedule ? (
            <View style={styles.scheduleCardContainer}>
              {/* Section Header */}
              <View style={styles.sectionHeaderSpread}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionAccentBar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>
                      {language === 'mr' ? 'तारीख आणि वेळ निवडा' : 'Select Date & Showtime'}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      {language === 'mr'
                        ? 'तुमच्या पसंतीची तारीख आणि प्रयोग निवडा'
                        : 'Tap a date and showtime to view available seats'}
                    </Text>
                  </View>
                </View>
                <View style={styles.scheduleCountChip}>
                  <Icon name="ticket-confirmation-outline" size={13} color="#EA580C" />
                  <Text style={styles.scheduleCountText}>
                    {dateGroups.reduce((acc, g) => acc + g.sessions.length, 0)}{' '}
                    {language === 'mr' ? 'प्रयोग' : 'Shows'}
                  </Text>
                </View>
              </View>

              {/* Date Selector Strip */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateTabsScroll}
              >
                {dateGroups.map((g) => {
                  const isActive = g.dateKey === selectedDateKey;
                  return (
                    <TouchableOpacity
                      key={g.dateKey}
                      onPress={() => {
                        setSelectedDateKey(g.dateKey);
                        if (g.sessions.length > 0) {
                          const firstAvail =
                            g.sessions.find(
                              (s) => getSessionAvailableCount(s) > 0 && s.status !== 'sold_out'
                            ) || g.sessions[0];
                          setSelectedSession(firstAvail);
                        }
                      }}
                      style={[styles.bmsDateChip, isActive && styles.bmsDateChipActive]}
                      activeOpacity={0.82}
                    >
                      <Text
                        style={[
                          styles.bmsDateChipDay,
                          isActive && styles.bmsDateChipDayActive,
                        ]}
                        numberOfLines={1}
                      >
                        {g.dayLabel.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.bmsDateChipNum,
                          isActive && styles.bmsDateChipNumActive,
                        ]}
                      >
                        {g.dayNumber}
                      </Text>
                      <Text
                        style={[
                          styles.bmsDateChipMonth,
                          isActive && styles.bmsDateChipMonthActive,
                        ]}
                        numberOfLines={1}
                      >
                        {g.monthLabel.toUpperCase()}
                      </Text>
                      {isActive && <View style={styles.bmsDateActiveDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Refined Legend Pill Bar */}
              <View style={styles.showtimeLegendStrip}>
                <View style={styles.showtimeLegendDotRow}>
                  <View style={[styles.availabilityDot, { backgroundColor: '#16A34A' }]} />
                  <Text style={styles.showtimeLegendLabel}>
                    {language === 'mr' ? 'उपलब्ध' : 'Available'}
                  </Text>
                </View>
                <View style={styles.legendDivider} />
                <View style={styles.showtimeLegendDotRow}>
                  <View style={[styles.availabilityDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.showtimeLegendLabel}>
                    {language === 'mr' ? 'जलद भरत आहे' : 'Fast Filling'}
                  </Text>
                </View>
                <View style={styles.legendDivider} />
                <View style={styles.showtimeLegendDotRow}>
                  <View style={[styles.availabilityDot, { backgroundColor: '#94A3B8' }]} />
                  <Text style={styles.showtimeLegendLabel}>
                    {language === 'mr' ? 'हाऊसफुल' : 'Sold Out'}
                  </Text>
                </View>
              </View>

              {/* Multi-Theatre Showtimes List */}
              <View style={styles.theatresList}>
                {activeDayVenues.map((vg, vIndex) => (
                  <View key={vg.venueName + vIndex} style={styles.theatreCard}>
                    {/* Theatre Header (Tap to open directions) */}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => openVenueMap(vg.venueName, vg.venueAddress)}
                      style={styles.theatreHeaderRow}
                    >
                      <View style={styles.theatreIconWrap}>
                        <Icon name="theater" size={18} color="#EA580C" />
                      </View>
                      <View style={styles.theatreInfoCol}>
                        <Text style={styles.theatreTitle} numberOfLines={1}>
                          {vg.venueName}
                        </Text>
                        {vg.venueAddress ? (
                          <View style={styles.theatreAddressRow}>
                            <Icon name="map-marker-outline" size={12} color="#64748B" />
                            <Text style={styles.theatreSubtitle} numberOfLines={1}>
                              {vg.venueAddress}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.theatreBadgeStrip}>
                        <View style={styles.mTicketChip}>
                          <Icon name="cellphone-check" size={12} color="#16A34A" />
                          <Text style={styles.mTicketText}>M-Ticket</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.theatreCardDivider} />

                    {/* Showtimes Grid */}
                    <View style={styles.theatreShowtimesGrid}>
                      {vg.sessions.map((s) => {
                        const isSelected = selectedSession?.id === s.id;
                        const timeStr = formatTime(s.sessionStartTime);
                        const availCount = Math.max(0, getSessionAvailableCount(s));
                        const isSoldOut = availCount <= 0 || s.status === 'sold_out';
                        const isFastFilling = !isSoldOut && availCount <= 25;

                        const statusDotColor = isSelected
                          ? '#34D399'
                          : isSoldOut
                            ? '#94A3B8'
                            : isFastFilling
                              ? '#F59E0B'
                              : '#16A34A';

                        const statusLabel = isSoldOut
                          ? language === 'mr'
                            ? 'हाऊसफुल (Sold Out)'
                            : 'SOLD OUT'
                          : isFastFilling
                            ? language === 'mr'
                              ? `फक्त ${availCount} आसने शिल्लक!`
                              : `Only ${availCount} seats left!`
                            : language === 'mr'
                              ? `उपलब्ध ${availCount} आसने`
                              : `${availCount} seats available`;

                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => setSelectedSession(s)}
                            disabled={isSoldOut}
                            style={[
                              styles.bmsShowtimePill,
                              !isSelected &&
                              !isSoldOut &&
                              !isFastFilling &&
                              styles.bmsShowtimePillAvailable,
                              !isSelected &&
                              !isSoldOut &&
                              isFastFilling &&
                              styles.bmsShowtimePillFastFilling,
                              !isSelected && isSoldOut && styles.bmsShowtimePillSoldOut,
                              isSelected && styles.bmsShowtimePillSelected,
                            ]}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.bmsShowtimeHour,
                                !isSelected &&
                                !isSoldOut &&
                                !isFastFilling &&
                                styles.bmsShowtimeHourAvailable,
                                !isSelected &&
                                !isSoldOut &&
                                isFastFilling &&
                                styles.bmsShowtimeHourFastFilling,
                                !isSelected && isSoldOut && styles.bmsShowtimeHourSoldOut,
                                isSelected && styles.bmsShowtimeHourSelected,
                              ]}
                            >
                              {timeStr}
                            </Text>

                            <View style={styles.bmsShowtimeStatusRow}>
                              <View
                                style={[
                                  styles.bmsPillStatusDot,
                                  { backgroundColor: statusDotColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.bmsShowtimeSub,
                                  !isSelected &&
                                  !isSoldOut &&
                                  !isFastFilling &&
                                  styles.bmsShowtimeSubAvailable,
                                  !isSelected &&
                                  !isSoldOut &&
                                  isFastFilling &&
                                  styles.bmsShowtimeSubFastFilling,
                                  !isSelected && isSoldOut && styles.bmsShowtimeSubSoldOut,
                                  isSelected && styles.bmsShowtimeSubSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {statusLabel}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* CLEAN INFORMATIVE SHOW NOTICE */
            <View style={styles.informativeWarningCard}>
              <View style={styles.informativeHeaderRow}>
                <View style={styles.informativeIconBadge}>
                  <Icon name="calendar-clock" size={24} color="#D97706" />
                </View>
                <View style={styles.informativeTitleCol}>
                  <Text style={styles.informativeHeading}>
                    {language === 'mr'
                      ? 'प्रयोगाच्या तारखा लवकरच जाहीर होतील'
                      : 'Show dates will be announced soon'}
                  </Text>
                  <Text style={styles.informativeSubHeading}>
                    {language === 'mr'
                      ? 'वेळापत्रक जाहीर झाल्यावर तिकीट बुकिंग सुरू होईल'
                      : 'Tickets and seat booking will open shortly'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={toggleReminder}
                activeOpacity={0.85}
                style={[
                  styles.informativeNotifyBtn,
                  isInterested && styles.informativeNotifyBtnActive,
                ]}
              >
                <Icon
                  name={isInterested ? 'check-circle' : 'bell-ring-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.informativeNotifyBtnText}>
                  {language === 'mr'
                    ? isInterested
                      ? 'रिमांडर सेट केला आहे ✓'
                      : 'मला आठवण करा (Notify Me)'
                    : isInterested
                      ? 'Notification Active ✓'
                      : 'Notify Me When Available'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 4. ABOUT THE SHOW */}
        <View style={styles.sectionBlock}>
          <View style={styles.cardSurface}>
            <View style={styles.sectionTitleRowWithMargin}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>
                {language === 'mr' ? 'नाट्य कथानक' : 'About the Show'}
              </Text>
            </View>
            <Text
              style={styles.descriptionText}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {displayDescription(event, language) ||
                (language === 'mr'
                  ? 'एक उत्कृष्ट आणि दर्जेदार मराठी नाट्यप्रयोग. उत्तम कथानक, दमदार अभिनय आणि नेत्रदीपक सादरीकरणाचा प्रत्यक्ष नाट्यगृहात अनुभव घ्या.'
                  : 'An acclaimed theatrical production featuring stellar performances, gripping storyline, and captivating stagecraft.')}
            </Text>
            <TouchableOpacity
              onPress={() => setDescExpanded(!descExpanded)}
              style={styles.readMoreBtn}
            >
              <Text style={styles.readMoreText}>
                {language === 'mr'
                  ? descExpanded
                    ? 'कमी करा ↑'
                    : 'अधिक वाचा →'
                  : descExpanded
                    ? 'Show Less ↑'
                    : 'Read More →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. CAST & CREW */}
        {castList.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.cardSurface}>
              <View style={styles.sectionTitleRowWithMargin}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>
                  {language === 'mr' ? 'कलाकार आणि चमू' : 'Cast & Crew'}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castAvatarScroll}
              >
                {castList.map((member, idx) => {
                  const avatarUrl =
                    (member as any).avatarUrl ||
                    (member as any).image ||
                    (member as any).photoUrl;
                  const initial = (member.name || 'क').trim()[0] || 'क';
                  return (
                    <View key={idx} style={styles.castAvatarCol}>
                      <View style={styles.castAvatarCircle}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={styles.castAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.castAvatarFallback}>
                            <Text style={styles.castAvatarInitial}>{initial}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.castNameText} numberOfLines={2}>
                        {member.name}
                      </Text>
                      {member.role ? (
                        <Text style={styles.castRoleText} numberOfLines={1}>
                          {member.role}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* 6. VENUE & AUDITORIUM AMENITIES */}
        <View style={styles.sectionBlock}>
          <View style={styles.venueCardLight}>
            <View style={styles.venueTopRow}>
              <View style={styles.venueIconBox}>
                <Icon name="theater" size={24} color="#EA580C" />
              </View>
              <View style={styles.venueNameCol}>
                <Text style={styles.venueCardTitle}>
                  {language === 'mr' ? 'नाट्यगृह आणि सुविधा' : 'Venue & Amenities'}
                </Text>
                <Text style={styles.venueNameOrange} numberOfLines={2}>
                  {displayVenueName(event.venue, language) ||
                    (language === 'mr'
                      ? 'बालगंधर्व रंगमंदिर, पुणे'
                      : 'Bal Gandharva Rang Mandir, Pune')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => openVenueMap()}
                style={styles.mapBtn}
                activeOpacity={0.8}
              >
                <Icon name="directions" size={16} color="#EA580C" />
                <Text style={styles.mapBtnText}>
                  {language === 'mr' ? 'नकाशा' : 'Map'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => openVenueMap()}
              style={styles.venueAddressFullRow}
            >
              <Icon
                name="map-marker-outline"
                size={16}
                color="#EA580C"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.venueAddressText}>
                {event.venue?.address ||
                  (language === 'mr'
                    ? 'जंग्ली महाराज रस्ता, शिवाजीनगर, पुणे – ४११००५'
                    : 'J.M. Road, Shivajinagar, Pune – 411005')}
              </Text>
            </TouchableOpacity>

            <View style={styles.amenitiesWrap}>
              <View style={styles.amenityPill}>
                <Icon name="qrcode" size={14} color="#EA580C" />
                <Text style={styles.amenityLabel}>
                  {language === 'mr' ? 'एम-तिकीट प्रवेश' : 'M-Ticket Entry'}
                </Text>
              </View>
              <View style={styles.amenityPill}>
                <Icon name="car-brake-parking" size={14} color="#EA580C" />
                <Text style={styles.amenityLabel}>
                  {language === 'mr' ? 'पार्किंग' : 'Parking'}
                </Text>
              </View>
              <View style={styles.amenityPill}>
                <Icon name="food-outline" size={14} color="#EA580C" />
                <Text style={styles.amenityLabel}>
                  {language === 'mr' ? 'कॅफेटेरिया' : 'Snacks Counter'}
                </Text>
              </View>
              <View style={styles.amenityPill}>
                <Icon name="snowflake" size={14} color="#EA580C" />
                <Text style={styles.amenityLabel}>
                  {language === 'mr' ? 'वातानुकूलित' : 'AC Auditorium'}
                </Text>
              </View>
              <View style={styles.amenityPill}>
                <Icon name="wheelchair-accessibility" size={14} color="#EA580C" />
                <Text style={styles.amenityLabel}>
                  {language === 'mr' ? 'व्हीलचेअर सुविधा' : 'Wheelchair Access'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7. OFFICIAL AUDITORIUM GUIDELINES & TERMS */}
        <View style={styles.sectionBlock}>
          <View style={styles.cardSurface}>
            <TouchableOpacity
              onPress={() => setTermsExpanded(!termsExpanded)}
              activeOpacity={0.8}
              style={styles.termsHeaderBtn}
            >
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionTitle}>
                  {language === 'mr'
                    ? 'महत्त्वाच्या सूचना व अटी'
                    : 'Important Terms & Guidelines'}
                </Text>
              </View>
              <Icon
                name={termsExpanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>

            <View style={styles.guidelinesQuickRow}>
              <View style={styles.guidelineMiniChip}>
                <Icon name="clock-fast" size={14} color="#EA580C" />
                <Text style={styles.guidelineMiniText}>
                  {language === 'mr'
                    ? 'प्रयोगापूर्वी ३० मिनिटे उपस्थित रहा'
                    : 'Arrive 30 mins before show'}
                </Text>
              </View>
              <View style={styles.guidelineMiniChip}>
                <Icon name="cellphone-off" size={14} color="#EA580C" />
                <Text style={styles.guidelineMiniText}>
                  {language === 'mr' ? 'मोबाईल सायलेंट ठेवावा' : 'Keep phones on silent'}
                </Text>
              </View>
            </View>

            {termsExpanded && (
              <View style={styles.termsExpandedBox}>
                <Text style={styles.termBullet}>
                  {language === 'mr'
                    ? '• एकदा बुक केलेले तिकीट रद्द (Cancel) किंवा बदलून (Exchange) मिळणार नाही.'
                    : '• Tickets once booked cannot be cancelled or exchanged.'}
                </Text>
                <Text style={styles.termBullet}>
                  {language === 'mr'
                    ? '• ३ वर्षांवरील मुलांसाठी स्वतंत्र पूर्ण तिकीट घेणे आवश्यक आहे.'
                    : '• Children above 3 years require a separate full ticket.'}
                </Text>
                <Text style={styles.termBullet}>
                  {language === 'mr'
                    ? '• नाट्यगृहात प्रवेश करताना मोबाईलवरील QR M-Ticket दाखवणे बंधनकारक आहे.'
                    : '• Digital QR M-Ticket on mobile is required for venue entry.'}
                </Text>
                <Text style={styles.termBullet}>
                  {language === 'mr'
                    ? '• चालू प्रयोगात फोटो काढणे किंवा व्हिडिओ शूटिंग करण्यास सक्त मनाई आहे.'
                    : '• Photography or video recording during performance is prohibited.'}
                </Text>
                <Text style={styles.termBullet}>
                  {language === 'mr'
                    ? '• बाहेरील खाद्यपदार्थ नाट्यगृहात नेण्यास परवानगी नाही.'
                    : '• Outside food and beverages are not allowed inside auditorium.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 8. AUDIENCE REVIEWS & RATING SUBMISSION */}
        <View style={styles.sectionBlock}>
          <View style={styles.reviewsHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>
                {language === 'mr' ? 'प्रेक्षकांची मते' : 'Audience Reviews'}
              </Text>
            </View>
            <Text style={styles.reviewsCountBadge}>
              {ratingStats.totalCount} {language === 'mr' ? 'मते' : 'reviews'}
            </Text>
          </View>

          {userReview ? (
            <View style={styles.alreadyReviewedCard}>
              <View style={styles.alreadyReviewedTop}>
                <View style={styles.alreadyReviewedBadge}>
                  <Icon name="check-decagram" size={18} color="#16A34A" />
                  <Text style={styles.alreadyReviewedTitle}>
                    {language === 'mr'
                      ? 'आपले परीक्षण नोंदवले गेले आहे'
                      : 'Your review has been submitted'}
                  </Text>
                </View>
                <View style={styles.reviewStarsPill}>
                  <Icon name="star" size={13} color="#FFB800" />
                  <Text style={styles.reviewStarsText}>{userReview.rating}</Text>
                </View>
              </View>
              <Text style={styles.alreadyReviewedComment}>"{userReview.comment}"</Text>
            </View>
          ) : (
            <View style={styles.addReviewCard}>
              <Text style={styles.addReviewTitle}>
                {language === 'mr' ? 'आपले मत किंवा परीक्षण नोंदवा' : 'Rate & review this show'}
              </Text>
              <Text style={styles.addReviewSub}>
                {isAuthenticated
                  ? language === 'mr'
                    ? `लॉगिन: ${user?.name || user?.email}`
                    : `Logged in: ${user?.name || user?.email}`
                  : language === 'mr'
                    ? 'आपले मत नोंदवण्यासाठी कृपया लॉगिन करा'
                    : 'Please log in to submit your review'}
              </Text>

              <View style={styles.starSelectRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setUserRating(star)}
                    style={styles.starBtn}
                  >
                    <Icon
                      name={star <= userRating ? 'star' : 'star-outline'}
                      size={30}
                      color="#FFB800"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder={
                  language === 'mr'
                    ? 'नाटकाचा अनुभव, अभिनय, संगीत याबद्दल आपले मत लिहा...'
                    : 'Share your thoughts on acting, story, music, and overall experience...'
                }
                placeholderTextColor="#94A3B8"
                value={userComment}
                onChangeText={setUserComment}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitReviewBtn, submittingReview && { opacity: 0.6 }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
                activeOpacity={0.85}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitReviewText}>
                    {language === 'mr' ? 'परीक्षण नोंदवा →' : 'Submit Review →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.reviewsList}>
            {uniqueReviews.slice(0, 5).map((rev) => (
              <View key={rev.id} style={styles.reviewItemCard}>
                <View style={styles.reviewUserRow}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {(rev.author || 'M')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewAuthorCol}>
                    <View style={styles.reviewAuthorLine}>
                      <Text style={styles.reviewAuthorName}>{rev.author}</Text>
                      {rev.verified && (
                        <View style={styles.verifiedChip}>
                          <Icon name="check-decagram" size={11} color="#16A34A" />
                          <Text style={styles.verifiedChipText}>
                            {language === 'mr' ? 'प्रमाणित' : 'Verified'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewDate}>
                      {rev.city ? `${rev.city} • ` : ''}
                      {rev.date}
                    </Text>
                  </View>
                  <View style={styles.reviewStarsPill}>
                    <Icon name="star" size={13} color="#FFB800" />
                    <Text style={styles.reviewStarsText}>{rev.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{rev.comment}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      {/* 9. STICKY BOTTOM BOOKING BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {hasUpcomingSchedule && selectedSession ? (
          <>
            <View style={styles.bottomPriceCol}>
              {selectedSessionSoldOut ? (
                <>
                  <View style={styles.soldOutDockPill}>
                    <Icon name="alert-circle" size={12} color="#DC2626" />
                    <Text style={styles.soldOutDockPillText}>
                      {language === 'mr' ? 'हाऊसफुल' : 'SOLD OUT'}
                    </Text>
                  </View>
                  <Text style={styles.bottomSessionMetaText} numberOfLines={1}>
                    {activeDateGroup?.fullDateStr} • {formatTime(selectedSession.sessionStartTime)}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.bottomPriceTopRow}>
                    <View style={styles.bottomAvailBadge}>
                      <View style={styles.bottomAvailDot} />
                      <Text style={styles.bottomAvailBadgeText}>
                        {language === 'mr'
                          ? `${selectedSessionAvailableSeats} जागा उपलब्ध`
                          : `${selectedSessionAvailableSeats} seats left`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bottomSessionMetaText} numberOfLines={1}>
                    {activeDateGroup?.fullDateStr} • {formatTime(selectedSession.sessionStartTime)}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.bookCtaBtn,
                selectedSessionSoldOut && styles.bookCtaBtnSoldOut,
              ]}
              onPress={handleProceedToSeats}
              activeOpacity={selectedSessionSoldOut ? 0.9 : 0.85}
            >
              <View style={styles.bookCtaInnerRow}>
                <Icon
                  name={
                    selectedSessionSoldOut
                      ? 'close-circle-outline'
                      : isSeatedEvent
                        ? 'seat-recline-extra'
                        : 'ticket-confirmation-outline'
                  }
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.bookCtaText}>
                  {selectedSessionSoldOut
                    ? language === 'mr'
                      ? 'हाऊसफुल'
                      : 'Sold Out'
                    : isSeatedEvent
                      ? language === 'mr'
                        ? 'आसन निवडा →'
                        : 'Select Seats →'
                      : language === 'mr'
                        ? 'तिकीट बुक करा →'
                        : 'Book Tickets →'}
                </Text>
              </View>
              <Text
                style={[
                  styles.bookCtaSub,
                  selectedSessionSoldOut && { color: '#E2E8F0' },
                ]}
              >
                {selectedSessionSoldOut
                  ? language === 'mr'
                    ? 'दुसरी वेळ निवडा'
                    : 'Pick another show'
                  : isSeatedEvent
                    ? language === 'mr'
                      ? 'थेट आसन निवड'
                      : 'Auditorium seat map'
                    : language === 'mr'
                      ? 'थेट प्रवेश पास'
                      : 'Direct Entry Pass'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.bottomPriceCol}>
              <View style={styles.bottomWarningPill}>
                <Icon name="information" size={13} color="#B45309" />
                <Text style={styles.bottomWarningPillText}>
                  {language === 'mr' ? 'लवकरच येत आहे' : 'Coming Soon'}
                </Text>
              </View>
              <Text style={styles.bottomUnavailableTitle}>
                {language === 'mr'
                  ? 'तारीख व वेळ लवकरच जाहीर होईल'
                  : 'Showtimes coming soon'}
              </Text>
              <Text style={styles.bottomSessionMetaText}>
                {language === 'mr'
                  ? 'बुकिंग सुरू झाल्यावर कळवले जाईल'
                  : 'Notification alert available'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.notifyBottomBtn,
                isInterested && styles.notifyBottomBtnActive,
              ]}
              onPress={toggleReminder}
              activeOpacity={0.85}
            >
              <Icon
                name={isInterested ? 'bell-check' : 'bell-ring-outline'}
                size={17}
                color="#FFFFFF"
              />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.bookCtaText}>
                  {language === 'mr'
                    ? isInterested
                      ? 'रिमांडर चालू ✓'
                      : 'मला आठवण करा'
                    : isInterested
                      ? 'Notify Active ✓'
                      : 'Notify Me'}
                </Text>
                <Text style={styles.bookCtaSub}>
                  {language === 'mr' ? 'सूचना मिळवा' : 'Get instant alert'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* EMAIL LOGIN MODAL */}
      <Modal visible={loginModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ईमेल लॉगिन (Email Login)</Text>
              <TouchableOpacity onPress={() => setLoginModalVisible(false)}>
                <Icon name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              परीक्षण नोंदवण्यासाठी किंवा बुकिंगसाठी ईमेल प्रविष्ट करा
            </Text>

            {loginStep === 'email' ? (
              <View style={{ marginTop: 16 }}>
                <View style={styles.modalInputWrap}>
                  <Icon
                    name="email-outline"
                    size={20}
                    color="#94A3B8"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#64748B"
                    value={loginEmail}
                    onChangeText={(t) => {
                      setLoginEmail(t);
                      setLoginError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {loginError ? <Text style={styles.modalError}>{loginError}</Text> : null}

                <TouchableOpacity
                  style={[styles.modalCta, loginLoading && { opacity: 0.6 }]}
                  onPress={handleLoginSendOtp}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalCtaText}>Send OTP Code →</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalStepInfo}>
                  OTP पाठवला: <Text style={{ color: '#F97316' }}>{loginEmail}</Text>
                </Text>
                <TextInput
                  style={styles.modalOtpInput}
                  placeholder="• • • • • •"
                  placeholderTextColor="#64748B"
                  value={loginOtp}
                  onChangeText={(t) => {
                    setLoginOtp(t);
                    setLoginError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {loginError ? <Text style={styles.modalError}>{loginError}</Text> : null}

                <TouchableOpacity
                  style={[styles.modalCta, loginLoading && { opacity: 0.6 }]}
                  onPress={handleLoginVerifyOtp}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalCtaText}>Verify & Continue ✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { paddingBottom: 136 },
  stickyHeaderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 68,
    ...SHADOWS.sm,
  },
  stickyHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 22,
    paddingBottom: 2,
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  headerBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  headerRightRow: { flexDirection: 'row', gap: 10 },
  sliderContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: '#0F172A',
  },
  slideItem: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  heroBadgesRow: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  badgeOrangeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  badgeStatusLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  badgeStatusLiveText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeStatusInfoText: {
    color: '#92400E',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#EA580C',
  },

  /* Title & Metadata Section */
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
    lineHeight: 36,
    paddingTop: 2,
    paddingBottom: 6,
    includeFontPadding: true,
  },
  eventTitleSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
    lineHeight: 24,
    paddingBottom: 4,
    includeFontPadding: true,
  },
  quickMetaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  quickMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  quickMetaIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickMetaDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  quickMetaLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  quickMetaValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 1,
  },
  ratingAndInterestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  ratingLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginRight: 10,
  },
  starPillText: { fontSize: 13.5, fontWeight: '900', color: '#92400E' },
  ratingInfoCol: { flex: 1 },
  ratingHeading: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  ratingSub: { fontSize: 11, color: '#64748B', marginTop: 1, fontWeight: '600' },
  interestedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  interestedBtnActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  interestedBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  interestedBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Shared Section Layout */
  sectionBlock: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  cardSurface: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    ...SHADOWS.sm,
  },
  sectionHeaderSpread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  sectionTitleRowWithMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionAccentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#EA580C',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  /* 3. Smart Schedule Section */
  scheduleCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  scheduleCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  scheduleCountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  dateTabsScroll: {
    paddingVertical: 4,
    paddingRight: 8,
    gap: 10,
  },
  bmsDateChip: {
    width: 62,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmsDateChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
    elevation: 4,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  bmsDateChipDay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  bmsDateChipDayActive: {
    color: '#FFEDD5',
  },
  bmsDateChipNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  bmsDateChipNumActive: {
    color: '#FFFFFF',
  },
  bmsDateChipMonth: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  bmsDateChipMonthActive: {
    color: '#FFF7ED',
  },
  bmsDateActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  showtimeLegendStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  showtimeLegendDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  showtimeLegendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  legendDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
  },
  theatresList: {
    gap: 12,
  },
  theatreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  theatreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  theatreIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  theatreInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  theatreTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  theatreAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  theatreSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    flexShrink: 1,
  },
  theatreBadgeStrip: {
    alignItems: 'flex-end',
  },
  mTicketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  mTicketText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  theatreCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 11,
  },
  theatreShowtimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  bmsShowtimePill: {
    minWidth: '30%',
    flexGrow: 1,
    maxWidth: '48%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmsShowtimePillAvailable: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  bmsShowtimePillFastFilling: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  bmsShowtimePillSoldOut: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  bmsShowtimePillSelected: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
    elevation: 3,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  bmsShowtimeHour: {
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  bmsShowtimeHourAvailable: {
    color: '#15803D',
  },
  bmsShowtimeHourFastFilling: {
    color: '#B45309',
  },
  bmsShowtimeHourSoldOut: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  bmsShowtimeHourSelected: {
    color: '#FFFFFF',
  },
  bmsShowtimeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  bmsPillStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bmsShowtimeSub: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  bmsShowtimeSubAvailable: {
    color: '#16A34A',
  },
  bmsShowtimeSubFastFilling: {
    color: '#D97706',
  },
  bmsShowtimeSubSoldOut: {
    color: '#94A3B8',
  },
  bmsShowtimeSubSelected: {
    color: '#DCFCE7',
  },

  /* Informative No-Booking Card */
  informativeWarningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 18,
    padding: 16,
    elevation: 1,
  },
  informativeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  informativeIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  informativeTitleCol: {
    flex: 1,
  },
  informativeHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#78350F',
    marginBottom: 2,
  },
  informativeSubHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 20,
    paddingBottom: 2,
    includeFontPadding: true,
  },
  informativeNotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 12,
  },
  informativeNotifyBtnActive: {
    backgroundColor: '#16A34A',
  },
  informativeNotifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* 4. About Description */
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '400',
  },
  readMoreBtn: { marginTop: 8, alignSelf: 'flex-start' },
  readMoreText: { color: '#EA580C', fontSize: 13, fontWeight: '800' },

  /* 5. Cast & Crew */
  castAvatarScroll: { gap: 12, paddingTop: 4 },
  castAvatarCol: { alignItems: 'center', width: 78 },
  castAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  castAvatarImage: { width: '100%', height: '100%' },
  castAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  castAvatarInitial: { fontSize: 20, fontWeight: '900', color: '#EA580C' },
  castNameText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 15,
  },
  castRoleText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },

  /* 6. Venue Card */
  venueCardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    ...SHADOWS.sm,
  },
  venueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  venueIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  venueNameCol: { flex: 1, marginRight: 8 },
  venueCardTitle: { fontSize: 11.5, fontWeight: '800', color: '#64748B' },
  venueNameOrange: { fontSize: 15, fontWeight: '900', color: '#EA580C', marginTop: 2 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EA580C',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    backgroundColor: '#FFF7ED',
  },
  mapBtnText: { color: '#EA580C', fontSize: 12, fontWeight: '800' },
  venueAddressFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  venueAddressText: { fontSize: 12.5, color: '#475569', flex: 1, fontWeight: '500' },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  amenityLabel: { fontSize: 11, color: '#334155', fontWeight: '700' },

  /* 7. Terms & Guidelines */
  termsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  guidelinesQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guidelineMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guidelineMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },
  termsExpandedBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  termBullet: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
    fontWeight: '500',
  },

  /* 8. Audience Reviews */
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewsCountBadge: {
    fontSize: 12,
    color: '#EA580C',
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    fontWeight: '800',
  },
  addReviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  addReviewTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  addReviewSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 12 },
  starSelectRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  starBtn: { padding: 2 },
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    color: '#0F172A',
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 68,
  },
  submitReviewBtn: {
    backgroundColor: '#EA580C',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitReviewText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  alreadyReviewedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  alreadyReviewedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alreadyReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alreadyReviewedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  alreadyReviewedComment: {
    fontSize: 14,
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  reviewsList: { gap: 12 },
  reviewItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    elevation: 1,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reviewAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  reviewAuthorCol: { flex: 1 },
  reviewAuthorLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewAuthorName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedChipText: { fontSize: 10, color: '#16A34A', fontWeight: '700' },
  reviewDate: { fontSize: 11, color: '#64748B', marginTop: 1 },
  reviewStarsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  reviewStarsText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  reviewComment: { fontSize: 13, color: '#334155', lineHeight: 19 },

  /* 9. Sticky Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomPriceCol: { flex: 1, paddingRight: 12 },
  bottomPriceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 1,
  },
  bottomPriceLabel: { fontSize: 10.5, color: '#64748B', fontWeight: '700' },
  bottomAvailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  bottomAvailDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  bottomAvailBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  bottomPriceValue: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 2, marginBottom: 1 },
  soldOutDockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  soldOutDockPillText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#DC2626',
  },
  bottomSessionMetaText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '700',
    marginTop: 1,
  },
  bottomWarningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 2,
  },
  bottomWarningPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  bottomUnavailableTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  bookCtaBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  bookCtaBtnSoldOut: {
    backgroundColor: '#64748B',
  },
  bookCtaInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookCtaText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '900' },
  bookCtaSub: { color: '#FFEDD5', fontSize: 10, fontWeight: '700', marginTop: 1 },
  notifyBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  notifyBottomBtnActive: {
    backgroundColor: '#16A34A',
  },

  /* Login Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 48,
  },
  modalInput: { flex: 1, color: '#0F172A', fontSize: 14 },
  modalOtpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    borderRadius: RADIUS.md,
    height: 52,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  modalError: { color: '#EF4444', fontSize: 12, marginTop: 6, fontWeight: '600' },
  modalStepInfo: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  modalCta: {
    backgroundColor: '#EA580C',
    borderRadius: RADIUS.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalCtaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  /* Error State */
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 14 },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 19,
  },
  errorActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  secondaryBackBtnText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '800',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  retryBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
});