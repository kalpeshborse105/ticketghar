/**
 * HomeScreen — MahaTicket Android (महाटिकिट)
 * Perfectly synchronized with MahaTicket web responsive UI:
 * Hero carousel, Categories, Special Marathi Drama, Festival Banner,
 * Iconic Theatres in City, Value Proposition Strip, and Organizer CTA.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import {
  api,
  EventItem,
  VenueItem,
  Announcement,
  absoluteMediaUrl,
  fallbackPosterUrl,
  getEventCardDateLabel,
} from '../api';
import { useEventsStore, useAuthStore, useUIStore } from '../store';
import {
  CategoryPill,
  LoadingLogo,
  RetryState,
  EventCard,
  EventListCard,
  SectionHeader,
  Badge,
  Button,
  TikitMitraModal,
} from '../components';
import { displayTitle, displayCity } from '../utils/display';

const { width } = Dimensions.get('window');

// Hero carousel: wide banner spanning nearly full width with minor margin reduction (.1 to .2)
const HERO_SLIDE = width - 32;
const HERO_GAP = 10;
const HERO_SNAP = HERO_SLIDE + HERO_GAP;
const HERO_SIDE_PAD = 16;

const CATEGORIES = [
  { id: 'all', label: 'All', labelMr: 'सर्व', iconName: 'view-grid-outline' },
  { id: 'plays', label: 'Plays', labelMr: 'नाटक', iconName: 'theater' },
  { id: 'music', label: 'Music', labelMr: 'संगीत', iconName: 'music' },
  { id: 'comedy', label: 'Comedy', labelMr: 'कॉमेडी', iconName: 'emoticon-happy-outline' },
  { id: 'sports', label: 'Sports', labelMr: 'क्रीडा', iconName: 'trophy-outline' },
  { id: 'movies', label: 'Movies', labelMr: 'चित्रपट', iconName: 'movie-open-outline' },
  { id: 'cultural', label: 'Cultural', labelMr: 'सांस्कृतिक', iconName: 'palette-outline' },
  { id: 'workshops', label: 'Workshops', labelMr: 'कार्यशाळा', iconName: 'school-outline' },
];

const FALLBACK_CITIES = ['All', 'Pune', 'Mumbai', 'Nashik', 'Kolhapur', 'Nagpur', 'Thane', 'Aurangabad'];

function normalizeCityName(raw?: string | null) {
  const city = String(raw || '').trim();
  if (!city) return '';
  if (/महाराष्ट्र|all\s*maharashtra|^all$/i.test(city)) return 'All';
  return city;
}

function dedupeCities(list: string[], selectedCity?: string) {
  const seen = new Set<string>();
  const next: string[] = [];

  [selectedCity, ...list].forEach((raw) => {
    const city = normalizeCityName(raw);
    if (!city) return;
    const key = city.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(city);
  });

  return next.length > 0 ? next : FALLBACK_CITIES;
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    events,
    loading,
    error,
    selectedCity,
    selectedCategory,
    fetchEvents,
    setCity,
    setCategory,
    filteredEvents,
  } = useEventsStore();
  const user = useAuthStore((s) => s.user);
  const language = useUIStore((s) => s.language);

  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [cities, setCities] = useState<string[]>(() => dedupeCities(FALLBACK_CITIES, selectedCity));
  const [sectionsMap, setSectionsMap] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [heroBannerIdx, setHeroBannerIdx] = useState(0);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [tikitMitraOpen, setTikitMitraOpen] = useState(false);
  const bannerRef = useRef<FlatList>(null);
  // Hardware back: close overlays / pop stack; at root let MainActivity move app to background
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (tikitMitraOpen) {
          setTikitMitraOpen(false);
          return true;
        }
        if (cityPickerOpen) {
          setCityPickerOpen(false);
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        // Return false → MainActivity.invokeDefaultOnBackPressed → moveTaskToBack
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [cityPickerOpen, navigation, tikitMitraOpen])
  );

  const selectCity = useCallback(
    (cityId: string) => {
      const city = normalizeCityName(cityId) || cityId;
      setCity(city);
      setCityPickerOpen(false);
      fetchEvents(city);
      api
        .getVenues(city)
        .then((d) => setVenues(d.venues || []))
        .catch(() => null);
    },
    [fetchEvents, setCity]
  );

  const cityOptions = useMemo(
    () => dedupeCities(cities, selectedCity).map((city) => ({ id: city, name: city })),
    [cities, selectedCity]
  );

  const loadCities = useCallback(async () => {
    try {
      const res = await api.getCities();
      const fromCatalog = Array.isArray((res as any)?.catalog)
        ? (res as any).catalog.map((c: any) => c?.name).filter(Boolean)
        : [];
      const fromList = Array.isArray(res?.cities) ? res.cities : [];
      const merged = [...fromCatalog, ...fromList];
      if (merged.length > 0) {
        setCities(dedupeCities(merged, selectedCity));
        return;
      }
    } catch { }
    setCities((prev) => dedupeCities(prev.length ? prev : FALLBACK_CITIES, selectedCity));
  }, [selectedCity]);

  const getSec = (
    key: string,
    defTitleEn: string,
    defTitleMr: string,
    defSubEn = '',
    defSubMr = '',
    defBadgeEn = '',
    defBadgeMr = ''
  ) => {
    const conf = sectionsMap[key];
    const isMr = language === 'mr';
    const fallbackTitle = isMr ? defTitleMr : defTitleEn;
    const fallbackSub = isMr ? defSubMr : defSubEn;
    const fallbackBadge = isMr ? defBadgeMr : defBadgeEn;
    if (!conf) {
      return {
        title: fallbackTitle,
        subtitle: fallbackSub,
        badge: fallbackBadge,
        visible: true,
      };
    }
    const dbTitle = isMr ? (conf.titleMr || conf.titleEn) : (conf.titleEn || conf.titleMr);
    const dbSub = isMr ? (conf.subtitleMr || conf.subtitleEn) : (conf.subtitleEn || conf.subtitleMr);
    const dbBadge = isMr ? (conf.badgeMr || conf.badgeEn) : (conf.badgeEn || conf.badgeMr);
    return {
      title: dbTitle || fallbackTitle,
      subtitle: dbSub || fallbackSub,
      badge: dbBadge || fallbackBadge,
      visible: conf.isVisible === 1 || conf.isVisible === true,
    };
  };

  // Auto-advance hero banner (offset-based — avoids scrollToIndex layout crash)
  const heroIdxRef = useRef(0);
  const onHeroViewable = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const first = viewableItems.find((v) => v.index != null);
    if (first && first.index != null) {
      heroIdxRef.current = first.index;
      setHeroBannerIdx(first.index);
    }
  }).current;
  const heroViewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const filtered = filteredEvents();
  const heroEvents = useMemo(() => events.slice(0, 6), [events]);

  useEffect(() => {
    const count = heroEvents.length;
    if (count < 2) return;
    const t = setInterval(() => {
      const next = (heroIdxRef.current + 1) % count;
      heroIdxRef.current = next;
      bannerRef.current?.scrollToOffset({
        offset: next * HERO_SNAP,
        animated: true,
      });
    }, 3500);
    return () => clearInterval(t);
  }, [heroEvents.length]);

  useEffect(() => {
    fetchEvents(selectedCity);
    loadCities().catch(() => null);
    api.getAnnouncements().then((d) => setAnnouncements(d.announcements || [])).catch(() => null);
    api.getVenues(selectedCity).then((d) => setVenues(d.venues || [])).catch(() => null);
    api.getHomeSections()
      .then((d) => {
        if (d && Array.isArray(d.sections)) {
          const map: Record<string, any> = {};
          d.sections.forEach((s: any) => {
            map[s.sectionKey] = s;
          });
          setSectionsMap(map);
        }
      })
      .catch(() => null);
  }, [fetchEvents, loadCities, selectedCity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadCities(),
      fetchEvents(selectedCity),
      api.getVenues(selectedCity).then((d) => setVenues(d.venues || [])).catch(() => null),
      api.getHomeSections()
        .then((d) => {
          if (d && Array.isArray(d.sections)) {
            const map: Record<string, any> = {};
            d.sections.forEach((s: any) => {
              map[s.sectionKey] = s;
            });
            setSectionsMap(map);
          }
        })
        .catch(() => null),
    ]);
    setRefreshing(false);
  }, [fetchEvents, loadCities, selectedCity]);

  const goToEvent = (id: number) => navigation.navigate('EventDetail', { eventId: id });

  const todayEvents = events.slice(0, 6); // Screenshot 1: आज काय पाहायचं?
  const promotedEvents = events.filter((e) => e.isPromoted || e.featured === 1); // TicketKhidakee Promoted
  const marathiPlays = events.filter((e) => e.category === 'plays' || e.categoryMr === 'नाटक');
  const garbaAndMusic = events.filter(
    (e) =>
      e.category === 'music' ||
      e.category === 'festivals' ||
      e.categoryMr === 'संगीत' ||
      e.categoryMr === 'उत्सव'
  );
  // Trending ranked strictly by rating and booking count
  const trending = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const rA = Number(a.rating) || 4.5;
        const rB = Number(b.rating) || 4.5;
        const bA = Number((a as any).totalBookings || (a as any).bookingCount || (a as any).ratingCount) || 0;
        const bB = Number((b as any).totalBookings || (b as any).bookingCount || (b as any).ratingCount) || 0;
        return (rB * 1000 + bB) - (rA * 1000 + bA);
      })
      .slice(0, 8);
  }, [events]);

  // Strict check: only organizers and admins see the scanner shortcut
  const isOrganizerOrAdmin = user?.role === 'organizer' || user?.role === 'admin';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Sticky Header (Clean Android Native Top Bar) ───────────────────── */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>
              <Text style={{ color: COLORS.primary }}>Maha</Text>Ticket
            </Text>
            <TouchableOpacity
              onPress={() => setCityPickerOpen(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={styles.cityPill}
            >
              <Icon name="map-marker" size={13} color={COLORS.primary} />
              <Text style={styles.cityText}>{selectedCity}</Text>
              <Icon name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.brandSub}>Book & Enjoy</Text>
        </View>

        {/* Organizer Scanner Button (Strict Role Based) */}
        {isOrganizerOrAdmin && (
          <TouchableOpacity
            onPress={() => navigation.navigate('TicketScanner')}
            activeOpacity={0.8}
            style={styles.headerBtn}
          >
            <Icon name="qrcode-scan" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.8}
          style={styles.headerBtn}
        >
          <Icon name="magnify" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.8}
          style={styles.headerBtn}
        >
          <Icon name="bell-outline" size={20} color={COLORS.text} />
          <View style={styles.notifBadge} />
        </TouchableOpacity>
      </View>

      {/* Screenshot 1: Search Bar Input */}
      <View style={{ paddingHorizontal: SPACING.base, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.88}
          style={styles.searchBarBox}
        >
          <Icon name="magnify" size={19} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.searchBarPlaceholder}>
            Search events, artists, plays, music…
          </Text>
        </TouchableOpacity>
      </View>

      {/* Always-visible city strip — tappable (fixes hidden/unusable city picker) */}
      <View style={styles.cityDropdown}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScroll}
          keyboardShouldPersistTaps="handled"
        >
          {cityOptions.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => selectCity(c.id)}
              activeOpacity={0.8}
              style={[styles.cityChip, selectedCity === c.id && styles.cityChipActive]}
            >
              <Icon
                name="map-marker"
                size={12}
                color={selectedCity === c.id ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.cityChipText,
                  selectedCity === c.id && { color: COLORS.white, fontWeight: '800' },
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── 1. Hero Banner (Web Stitch Match with Showtime & Venue) ──────── */}
        {loading ? (
          <View style={{ height: 380 }}>
            <LoadingLogo fill />
          </View>
        ) : heroEvents.length > 0 ? (
          <View style={styles.heroBannerSection}>
            <FlatList
              ref={bannerRef}
              data={heroEvents}
              extraData={heroBannerIdx}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `hero-${item.id}`}
              snapToInterval={HERO_SNAP}
              snapToAlignment="start"
              disableIntervalMomentum
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: HERO_SIDE_PAD, gap: HERO_GAP }}
              getItemLayout={(_, index) => ({
                length: HERO_SNAP,
                offset: HERO_SNAP * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                bannerRef.current?.scrollToOffset({
                  offset: info.index * HERO_SNAP,
                  animated: true,
                });
              }}
              onViewableItemsChanged={onHeroViewable}
              viewabilityConfig={heroViewConfig}
              renderItem={({ item, index }) => {
                const rating = item.rating
                  ? (item.rating > 5 ? (item.rating / 2).toFixed(1) : Number(item.rating).toFixed(1))
                  : '4.8';
                const ratingCount = item.ratingCountStr || (item.ratingCount ? `${item.ratingCount}` : '1.2k');
                const bannerUri =
                  absoluteMediaUrl(item.bannerUrl) ||
                  absoluteMediaUrl(item.posterUrl) ||
                  fallbackPosterUrl(item.id);

                return (
                  <TouchableOpacity
                    onPress={() => goToEvent(item.id)}
                    activeOpacity={0.92}
                    style={[
                      styles.heroBannerOuter,
                      { width: HERO_SLIDE, height: 215 },
                    ]}
                  >
                    {/* Match web HeroBanner: full-bleed cinematic slide (no ticket notches) */}
                    <View style={styles.heroBannerFrame}>
                      <View style={styles.heroBannerMedia}>
                        <Image
                          source={{ uri: bannerUri }}
                          style={styles.heroBannerImage}
                          resizeMode="cover"
                        />
                      </View>

                      <View style={styles.heroBannerOverlay} />
                      <View style={styles.heroBannerSideFade} />

                      <View style={styles.heroRatingBadgeTopRight}>
                        <Icon name="star" size={13} color="#FFB800" />
                        <Text style={styles.heroRatingScore}>{rating}</Text>
                        <Text style={styles.heroRatingCount}>({ratingCount})</Text>
                      </View>

                      <View style={styles.heroBottomContent}>
                        <Text style={styles.heroBannerTitle} numberOfLines={2}>
                          {displayTitle(item, language)}
                        </Text>

                        <View style={styles.heroMetaRow}>
                          <View style={styles.heroMetaPill}>
                            <Icon name="calendar-clock" size={12} color={COLORS.primary} />
                            <Text style={styles.heroMetaPillText}>
                              {getEventCardDateLabel(item, language)}
                            </Text>
                          </View>
                          {item.venue && (
                            <View style={styles.heroMetaPill}>
                              <Icon name="map-marker" size={12} color={COLORS.primary} />
                              <Text style={styles.heroMetaPillText} numberOfLines={1}>
                                {language === 'mr'
                                  ? (item.venue?.nameMr || item.venue?.name || 'नाट्यगृह')
                                  : (item.venue?.name || item.venue?.nameMr || 'Theatre')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            {/* Dots */}
            {heroEvents.length > 1 ? (
              <View style={styles.bannerDots}>
                {heroEvents.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.bannerDot, i === heroBannerIdx && styles.bannerDotActive]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── 2. Trending Ranked Row (🔥 लोकप्रिय ट्रेंडिंग • या आठवड्यातील प्रयोग) ── */}
        {!loading && trending.length > 0 && getSec('trending', 'Popular this week', 'या आठवड्यातील लोकप्रिय प्रयोग').visible && (
          <View style={styles.trendingSectionWrap}>
            <View style={styles.trendingHeader}>
              <View style={styles.trendingBadge}>
                <Text style={styles.trendingBadgeText}>
                  {language === 'mr' ? 'लोकप्रिय ट्रेंडिंग' : 'TRENDING'}
                </Text>
              </View>
              <Text style={styles.trendingTitle}>
                {getSec('trending', 'Popular this week', 'या आठवड्यातील लोकप्रिय प्रयोग').title}
              </Text>
            </View>

            <FlatList
              horizontal
              data={trending}
              keyExtractor={(item) => `trend-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 12 }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => goToEvent(item.id)}
                  activeOpacity={0.88}
                  style={styles.trendingCard}
                >
                  <View style={styles.trendingPosterBox}>
                    <Image
                      source={{
                        uri:
                          absoluteMediaUrl(item.posterUrl) ||
                          absoluteMediaUrl(item.bannerUrl) ||
                          fallbackPosterUrl(item.id),
                      }}
                      style={styles.trendingPosterImg}
                      resizeMode="cover"
                    />

                    {/* Rank Number watermark - Solid bold white like Screenshot 2 */}
                    <Text style={styles.trendingRankNum}>{index + 1}</Text>

                    {/* Rating pill with rich golden star */}
                    <View style={styles.trendingRatingBadge}>
                      <Icon name="star" size={12} color="#FFB800" />
                      <Text style={styles.trendingRatingText}>
                        {item.rating && item.rating > 0
                          ? item.rating > 5
                            ? (item.rating / 2).toFixed(1)
                            : item.rating.toFixed(1)
                          : '4.8'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.trendingCardTitle} numberOfLines={2}>
                    {displayTitle(item, language)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── 2. Screenshot 1 Section: आज काय पाहायचं? ─────────────────────── */}
        {!loading && todayEvents.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.aajKayHeader}>
              <View style={styles.orangeBar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aajKayTitle}>
                  {language === 'mr' ? 'आज काय पाहायचं?' : "What's on today?"}
                </Text>
                <Text style={styles.aajKaySub}>
                  {language === 'mr' ? `${selectedCity} मधील आजचे खास प्रयोग` : `Top shows near ${selectedCity}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
                <Text style={styles.seeAll}>
                  {language === 'mr' ? 'सर्व पहा →' : 'See all →'}
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={todayEvents}
              keyExtractor={(item) => `today-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14 }}
              renderItem={({ item }) => (
                <EventCard event={item} onPress={() => goToEvent(item.id)} width={width * 0.46} />
              )}
            />
          </View>
        )}

        {/* ── 3. TicketKhidakee Section: PROMOTED / विशेष शिफारस ─────────────── */}
        {!loading && promotedEvents.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader
              title={language === 'mr' ? 'विशेष शिफारस' : 'Promoted picks'}
              subtitle={
                language === 'mr'
                  ? 'पुणे आणि महाराष्ट्रातील सर्वाधिक लोकप्रिय प्रयोग'
                  : 'Most popular shows in Pune & Maharashtra'
              }
              onSeeAll={() => navigation.navigate('Explore')}
            />
            <FlatList
              horizontal
              data={promotedEvents}
              keyExtractor={(item) => `promoted-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14 }}
              renderItem={({ item }) => (
                <EventCard
                  event={item}
                  showPromoted={true}
                  onPress={() => goToEvent(item.id)}
                  width={width * 0.46}
                />
              )}
            />
          </View>
        )}

        {/* ── 4. Category Selector ("कॅटेगरीनुसार शोधा" / "सर्वोत्कृष्ट अनुभव निवडा") ── */}
        <View style={styles.categoryHeaderWrap}>
          <Text style={styles.catHeaderSub}>
            {language === 'mr' ? 'सर्वोत्कृष्ट अनुभव निवडा' : 'Pick your experience'}
          </Text>
          <Text style={styles.catHeaderTitle}>
            {language === 'mr' ? 'कॅटेगरीनुसार शोधा' : 'Browse by category'}
          </Text>
        </View>

        <View style={styles.categoryContainer}>
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            renderItem={({ item }) => (
              <CategoryPill
                label={language === 'mr' ? item.labelMr : item.label}
                iconName={item.iconName}
                active={selectedCategory === item.id}
                onPress={() => setCategory(item.id as any)}
              />
            )}
          />
        </View>

        {/* ── 5. Special Marathi Drama (मराठी रंगभूमी विशेष 🎭) ───────────── */}
        {!loading && marathiPlays.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader
              title={language === 'mr' ? 'मराठी रंगभूमी विशेष 🎭' : 'Marathi theatre special'}
              subtitle={
                language === 'mr'
                  ? 'संपूर्ण महाराष्ट्रातील रसिकांची आवडती नाटके'
                  : 'Most loved plays across Maharashtra'
              }
              onSeeAll={() => {
                setCategory('plays');
                navigation.navigate('Explore');
              }}
            />
            <FlatList
              horizontal
              data={marathiPlays}
              keyExtractor={(item) => `drama-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14 }}
              renderItem={({ item }) => (
                <EventCard event={item} onPress={() => goToEvent(item.id)} width={width * 0.46} />
              )}
            />
          </View>
        )}

        {/* ── 6. Live Music & Navratri Garba (थेट संगीत व नवरात्री गरबा 🪘) ─── */}
        {!loading && garbaAndMusic.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader
              title={language === 'mr' ? 'थेट संगीत व नवरात्री गरबा 🪘' : 'Live music & Garba'}
              subtitle={
                language === 'mr'
                  ? 'दांडिया, लोकसंगीत आणि थेट कॉन्सर्ट'
                  : 'Dandiya, folk & live concerts'
              }
              onSeeAll={() => {
                setCategory('music');
                navigation.navigate('Explore');
              }}
            />
            <FlatList
              horizontal
              data={garbaAndMusic}
              keyExtractor={(item) => `garba-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14 }}
              renderItem={({ item }) => (
                <EventCard event={item} onPress={() => goToEvent(item.id)} width={width * 0.46} />
              )}
            />
          </View>
        )}

        {/* ── 4. Mahanatya Mahotsav Festival Banner (Stitch Gradient — Parity with Web) ───── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Explore', { category: 'plays' })}
          style={styles.festivalBanner}
        >
          <View style={styles.festivalIconBox}>
            <Icon name="tag-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.festivalTag}>
                {language === 'mr' ? 'मर्यादित काळासाठी विशेष ऑफर' : 'Limited Time Offer'}
              </Text>
              <Text style={styles.festivalCoupon}>
                {language === 'mr' ? 'कोड: MAHA20 / MAHA50' : 'Code: MAHA20 / MAHA50'}
              </Text>
            </View>
            <Text style={styles.festivalTitle}>
              {language === 'mr' ? 'महानाट्य महोत्सव २०२६' : 'Mahanatya Mahotsav 2026'}
            </Text>
            <Text style={styles.festivalSub}>
              {language === 'mr'
                ? 'सर्व नाटकांच्या आगाऊ बुकिंगवर २०% पर्यंत भरघोस सूट! आजच आपले आणि आपल्या कुटुंबीयांचे तिकीट आरक्षित करा.'
                : 'Get up to 20% discount on advance ticket bookings for all Marathi plays across Maharashtra.'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── 5. Weekend Planner (विकेंड प्लॅनर • या आठवड्याचे लोकप्रिय कार्यक्रम) ─── */}
        {!loading && (
          <View style={styles.sectionWrap}>
            <View style={styles.weekendPlannerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekendPlannerTag}>
                  {language === 'mr' ? 'विकेंड प्लॅनर' : 'WEEKEND PLANNER'}
                </Text>
                <Text style={styles.weekendPlannerTitle}>
                  {language === 'mr' ? 'या आठवड्याचे लोकप्रिय कार्यक्रम' : "This week's popular shows"}
                </Text>
                <Text style={styles.weekendPlannerSub}>
                  {language === 'mr' ? 'प्रेक्षकांची पहिली पसंती - वेगाने भरणारे प्रयोग' : 'Audience favourites filling up fast'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
                <Text style={styles.seeAll}>
                  {language === 'mr' ? 'सर्व पहा →' : 'See all →'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 12, paddingVertical: 4 }}
            >
              {(trending.length > 0 ? trending.slice(0, 3) : events.slice(0, 3)).map((item) => (
                <View key={`weekend-${item.id}`} style={{ width: width * 0.72 }}>
                  <EventCard
                    event={item}
                    onPress={() => goToEvent(item.id)}
                    width={width * 0.72}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 6. Iconic Theatres (शहरातील प्रमुख नाट्यगृहे - Theatres in City) ─ */}
        <View style={styles.sectionWrap}>
          <SectionHeader
            title={
              language === 'mr'
                ? `${displayCity(selectedCity, 'mr')} मधील प्रमुख नाट्यगृहे`
                : `Iconic theatres in ${selectedCity}`
            }
            subtitle={
              language === 'mr'
                ? 'चालू आणि आगामी नाटकांचे अधिकृत नाट्यगृह'
                : 'Official venue for current & upcoming shows'
            }
          />
          {venues.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14 }}
            >
              {venues.slice(0, 5).map((v) => {
                const venueNameStr = language === 'mr' ? (v.nameMr || v.name) : (v.name || v.nameMr);
                const cityStr = displayCity(v.city, language);
                return (
                  <View key={v.id} style={styles.theatreCard}>
                    <View style={styles.theatreTop}>
                      <View style={styles.theatreIconWrap}>
                        <Icon name="theater" size={22} color={COLORS.primary} />
                      </View>
                      <View style={styles.theatreBadge}>
                        <Text style={styles.theatreBadgeText}>
                          {language === 'mr' ? 'आजचे प्रयोग' : 'Shows today'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.theatreName} numberOfLines={1}>
                      {venueNameStr}
                    </Text>
                    <View style={styles.theatreLocRow}>
                      <Icon name="map-marker" size={13} color={COLORS.primary} />
                      <Text style={styles.theatreLoc} numberOfLines={1}>
                        {v.address || cityStr}
                      </Text>
                    </View>
                    <Text style={styles.theatreDesc} numberOfLines={2}>
                      {language === 'mr'
                        ? `${cityStr} मधील अग्रगण्य सांस्कृतिक केंद्र. वातानुकूलित व आधुनिक ध्वनी व्यवस्था.`
                        : `Premier cultural venue in ${v.city}. AC auditorium with modern sound.`}
                    </Text>

                    <View style={styles.facilityRow}>
                      <View style={styles.facilityPill}>
                        <Text style={styles.facilityText}>
                          {language === 'mr' ? `${v.totalCapacity || 600} जागा` : `${v.totalCapacity || 600} seats`}
                        </Text>
                      </View>
                      <View style={styles.facilityPill}>
                        <Text style={styles.facilityText}>AC</Text>
                      </View>
                      <View style={styles.facilityPill}>
                        <Text style={styles.facilityText}>
                          {language === 'mr' ? 'पार्किंग' : 'Parking'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => navigation.navigate('Explore')}
                      style={styles.theatreBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.theatreBtnText}>
                        {language === 'mr' ? 'येथील प्रयोग पहा →' : 'See shows here →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.theatreFallback}>
              <Icon name="theater" size={28} color={COLORS.textDim} />
              <Text style={styles.theatreFallbackText}>
                {language === 'mr'
                  ? `${displayCity(selectedCity, 'mr')} मधील नाट्यगृहे लवकरच उपलब्ध होत आहेत.`
                  : `Theatres in ${selectedCity} coming soon.`}
              </Text>
            </View>
          )}
        </View>

        {/* ── 7. Value Proposition Strip (MahaTicket Benefits) ── */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>
            {language === 'mr' ? 'महातिकीट का निवडावे?' : 'Why choose MahaTicket?'}
          </Text>
          <Text style={styles.benefitsSub}>
            {language === 'mr' ? 'नाटक रसिकांसाठी महाराष्ट्रातील अग्रगण्य व्यासपीठ' : "Maharashtra's favourite for theatre lovers"}
          </Text>

          <View style={styles.benefitsGrid}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconBox}>
                <Icon name="ticket-confirmation-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitItemTitle}>
                  {language === 'mr' ? 'झटपट एम-तिकीट' : 'Instant M-Ticket'}
                </Text>
                <Text style={styles.benefitItemDesc}>
                  {language === 'mr'
                    ? 'व्हॉट्सअ‍ॅप आणि ईमेलवर तिकीट. रांगेत उभे राहण्याची गरज नाही.'
                    : 'Pass on WhatsApp & email. Skip the queue at the gate.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconBox}>
                <Icon name="seat-passenger" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitItemTitle}>
                  {language === 'mr' ? 'थेट आसन निवड' : 'Direct seat selection'}
                </Text>
                <Text style={styles.benefitItemDesc}>
                  {language === 'mr'
                    ? 'पैसे देण्यापूर्वी नाट्यगृहाच्या लेआउटवर स्वतःची जागा निवडा.'
                    : 'Pick your seat on a real theatre layout before you pay.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconBox}>
                <Icon name="shield-check-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitItemTitle}>
                  {language === 'mr' ? '१००% सुरक्षित व्यवहार' : '100% secure payments'}
                </Text>
                <Text style={styles.benefitItemDesc}>
                  {language === 'mr'
                    ? 'UPI, net banking & cards — fully authorised checkout.'
                    : 'UPI, net banking & cards — fully authorised checkout.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconBox}>
                <Icon name="headphones" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitItemTitle}>
                  {language === 'mr' ? 'ग्राहक सेवा सहाय्य' : 'Customer support'}
                </Text>
                <Text style={styles.benefitItemDesc}>
                  {language === 'mr'
                    ? 'सकाळी ८ ते रात्री ११ वाजेपर्यंत तत्पर मदत.'
                    : 'Dedicated help from 8 AM to 11 PM.'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 8. Organizer Partnership Banner ─────────────── */}
        <View style={styles.organizerCard}>
          <View style={styles.organizerIconBox}>
            <Icon name="handshake-outline" size={24} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.organizerTitle}>
              {language === 'mr' ? 'तुम्ही आयोजक आहात का?' : 'Are you an organizer?'}
            </Text>
            <Text style={styles.organizerSub}>
              {language === 'mr'
                ? 'संपूर्ण महाराष्ट्रातील नाट्य रसिकांपर्यंत पोहोचा. शून्य सेटअप फी.'
                : 'Reach theatre lovers across Maharashtra. Zero setup fee.'}
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://mahaticket.kalpkrutinfotech.com/contact').catch(() => null)}
              style={styles.organizerBtn}
            >
              <Text style={styles.organizerBtnText}>
                {language === 'mr' ? 'तुमचा कार्यक्रम जोडा →' : 'Post your event →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 9. All / Filtered Events Catalog ────────────────────────────── */}
        <SectionHeader
          title={
            selectedCategory === 'all'
              ? (language === 'mr' ? 'सर्व कार्यक्रम' : 'All events')
              : (language === 'mr'
                  ? (CATEGORIES.find((c) => c.id === selectedCategory)?.labelMr ?? selectedCategory)
                  : (CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? selectedCategory))
          }
        />

        {loading ? null : error && events.length === 0 ? (
          <RetryState
            title={language === 'mr' ? 'कार्यक्रम लोड करता आले नाहीत' : 'Could not load events'}
            subtitle={error}
            retryLabel={language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Try again'}
            onRetry={() => fetchEvents(selectedCity)}
          />
        ) : filtered.length === 0 ? (
          <RetryState
            title={language === 'mr' ? 'कोणतेही कार्यक्रम आढळले नाहीत' : 'No events found'}
            subtitle={language === 'mr' ? 'दुसरी श्रेणी किंवा शहर निवडून पहा.' : 'Try another category or city.'}
            retryLabel={language === 'mr' ? 'सर्व पहा' : 'Show all'}
            onRetry={() => setCategory('all')}
          />
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((item) => (
              <EventListCard key={item.id} event={item} onPress={() => goToEvent(item.id)} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* City picker sheet — native Modal (mauli-erp select pattern → RN) */}
      <Modal
        visible={cityPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCityPickerOpen(false)}
      >
        <Pressable style={styles.cityModalBackdrop} onPress={() => setCityPickerOpen(false)}>
          <Pressable style={styles.cityModalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.cityModalHandle} />
            <Text style={styles.cityModalTitle}>
              {language === 'mr' ? 'शहर निवडा' : 'Select city'}
            </Text>
            <Text style={styles.cityModalSub}>
              {language === 'mr' ? 'आपल्या शहरासाठी कार्यक्रम अपडेट होतील' : 'Shows update for your city'}
            </Text>
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {cityOptions.map((c) => {
                const active = selectedCity === c.id;
                const cityDisplayName = displayCity(c.name, language);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => selectCity(c.id)}
                    activeOpacity={0.85}
                    style={[styles.cityModalRow, active && styles.cityModalRowActive]}
                  >
                    <Icon
                      name="map-marker"
                      size={18}
                      color={active ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.cityModalRowText, active && { color: COLORS.primary }]}>
                      {cityDisplayName}
                    </Text>
                    {active ? (
                      <Icon name="check-circle" size={20} color={COLORS.primary} />
                    ) : (
                      <View style={{ width: 20 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Compact round TikitMitra FAB (logo only) */}
      <TouchableOpacity
        style={[styles.floatingTikitMitraFab, { bottom: insets.bottom + 72 }]}
        onPress={() => setTikitMitraOpen(true)}
        activeOpacity={0.88}
        testID="tikitmitra_fab"
        accessibilityLabel="तिकीटमित्र AI"
      >
        <Image
          source={{ uri: 'https://mahaticket.kalpkrutinfotech.com/logo.png' }}
          style={styles.fabLogo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* TikitMitra AI Assistant Modal */}
      <TikitMitraModal
        visible={tikitMitraOpen}
        onClose={() => setTikitMitraOpen(false)}
        navigation={navigation}
        language={language}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    zIndex: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  brandTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  brandSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
  },
  cityText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBarPlaceholder: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', flex: 1 },
  cityNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  cityNoticeText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },

  aajKayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    marginTop: SPACING.base,
    gap: 10,
  },
  orangeBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  aajKayTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
    lineHeight: 28,
    paddingBottom: 2,
    includeFontPadding: true,
  },
  aajKaySub: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500', marginTop: 1 },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  cityDropdown: {
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    zIndex: 15,
  },
  cityScroll: { paddingHorizontal: SPACING.base, gap: 8 },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cityChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cityChipText: { fontSize: 12, color: COLORS.text, fontWeight: '700' },

  heroBannerSection: { paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  heroBannerOuter: {
    justifyContent: 'flex-end',
  },
  heroBannerFrame: {
    height: 215,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141b2b',
  },
  heroBannerMedia: {
    ...StyleSheet.absoluteFillObject,
    minHeight: 215,
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroBannerSideFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroRatingBadgeTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    zIndex: 10,
  },
  heroRatingScore: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  heroRatingCount: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  heroBottomContent: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    gap: 6,
    zIndex: 5,
  },
  weekendPlannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
  },
  weekendPlannerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  weekendPlannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 28,
    paddingTop: 4,
    paddingBottom: 2,
  },
  weekendPlannerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
    paddingBottom: 2,
  },

  trendingHeader: { paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  trendingBadge: { alignSelf: 'flex-start', marginBottom: 2 },
  trendingBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 28,
    paddingTop: 4,
    paddingBottom: 2,
  },
  trendingCard: { width: 118 },
  trendingPosterBox: {
    width: 118,
    height: 158,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendingPosterImg: { width: '100%', height: '100%' },
  trendingRankNum: {
    position: 'absolute',
    bottom: -2,
    left: 4,
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  trendingRatingBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  trendingRatingText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  trendingCardTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    // Devanagari glyphs need extra line box + padding or tops/bottoms clip
    lineHeight: 20,
    paddingTop: 2,
    paddingBottom: 4,
    includeFontPadding: true,
  },
  heroTagRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  heroCatPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  heroCatPillText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  heroLangPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  heroLangPillText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  heroBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 28,
    paddingTop: 2,
    paddingBottom: 4,
    includeFontPadding: true,
  },
  heroMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  heroMetaPillText: { fontSize: 11, color: COLORS.white, fontWeight: '600' },
  heroBannerCta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  heroBannerCtaText: { fontSize: 12, fontWeight: '800', color: COLORS.white },

  bannerDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  bannerDotActive: { width: 18, backgroundColor: COLORS.primary },

  categoryHeaderWrap: { paddingHorizontal: SPACING.base, paddingTop: SPACING.lg, paddingBottom: SPACING.xs },
  catHeaderSub: { fontSize: 11, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase' },
  catHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 28,
    paddingTop: 4,
    paddingBottom: 2,
  },

  categoryContainer: { paddingVertical: SPACING.md },
  categoryRow: { paddingHorizontal: SPACING.base, gap: 10 },

  sectionWrap: { marginTop: SPACING.lg },
  trendingSectionWrap: { marginTop: SPACING.lg },
  cityModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  cityModalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING['2xl'],
    paddingTop: SPACING.sm,
    ...SHADOWS.md,
  },
  cityModalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cityModalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  cityModalSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md, marginTop: 2 },
  cityModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    marginBottom: 4,
  },
  cityModalRowActive: { backgroundColor: 'rgba(234,88,12,0.1)' },
  cityModalRowText: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },

  festivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xs,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.35)',
    borderRadius: RADIUS.xl,
    padding: 14,
  },
  festivalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(234,88,12,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  festivalTag: { fontSize: 9, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  festivalCoupon: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryDark,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  festivalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
    lineHeight: 22,
    paddingBottom: 2,
    includeFontPadding: true,
  },
  festivalSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
    paddingBottom: 3,
    includeFontPadding: true,
  },

  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  rankText: { fontSize: 11, fontWeight: '900', color: COLORS.white },

  theatreCard: {
    width: width * 0.72,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  theatreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  theatreIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(234,88,12,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  theatreBadge: {
    backgroundColor: 'rgba(234,88,12,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  theatreBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  theatreName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  theatreLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  theatreLoc: { fontSize: 12, color: COLORS.textMuted },
  theatreDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 18,
    paddingBottom: 2,
    includeFontPadding: true,
  },
  facilityRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  facilityPill: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  facilityText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  theatreBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.35)',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  theatreBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  theatreFallback: { padding: SPACING.lg, alignItems: 'center', gap: 6 },
  theatreFallbackText: { fontSize: 12, color: COLORS.textMuted },

  benefitsCard: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  benefitsTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  benefitsSub: { fontSize: 12, color: COLORS.textMuted, marginTop: -8 },
  benefitsGrid: { gap: 14, marginTop: 4 },
  benefitItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  benefitIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(234,88,12,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.2)',
  },
  benefitItemTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  benefitItemDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 2,
    paddingBottom: 2,
    includeFontPadding: true,
  },

  organizerCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.xl,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.35)',
    borderRadius: RADIUS.xl,
    padding: 16,
    alignItems: 'center',
  },
  organizerIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  organizerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
    paddingBottom: 2,
    includeFontPadding: true,
  },
  organizerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  organizerBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.white },

  listContainer: { paddingHorizontal: SPACING.base, gap: 10 },
  floatingTikitMitraFab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
  fabLogo: {
    width: 40,
    height: 40,
  },
  fabIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTextBox: {
    justifyContent: 'center',
  },
  fabTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  fabSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  fabSparkle: {
    paddingLeft: 2,
  },
});
