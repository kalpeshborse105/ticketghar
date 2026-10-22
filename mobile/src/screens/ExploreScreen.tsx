/**
 * ExploreScreen — MahaTicket Android
 * Search, filter, browse Marathi plays, live concerts and cultural events
 */
import React, { useCallback, useState, useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING } from '../theme';
import { useEventsStore } from '../store';
import { CategoryPill, EventCard, EventListCard, LoadingLogo, RetryState } from '../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', iconName: 'view-grid-outline' },
  { id: 'plays', label: 'Plays', iconName: 'theater' },
  { id: 'music', label: 'Music', iconName: 'music' },
  { id: 'comedy', label: 'Comedy', iconName: 'emoticon-happy-outline' },
  { id: 'cultural', label: 'Cultural', iconName: 'palette-outline' },
  { id: 'sports', label: 'Sports', iconName: 'trophy-outline' },
  { id: 'movies', label: 'Movies', iconName: 'movie-open-outline' },
  { id: 'workshops', label: 'Workshops', iconName: 'school-outline' },
];

const PRICE_FILTERS = [
  { id: 'all', label: 'All prices' },
  { id: 'free', label: 'Free' },
  { id: 'under500', label: 'Under ₹500' },
  { id: 'under1000', label: 'Under ₹1000' },
  { id: 'above1000', label: '₹1000+' },
];

export default function ExploreScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { events, loading, error, selectedCategory, setCategory, setSearch, searchQuery, filteredEvents, fetchEvents, selectedCity } = useEventsStore();
  const [priceFilter, setPriceFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    if (events.length === 0) fetchEvents(selectedCity);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  const applyPriceFilter = (evts: any[]) => {
    switch (priceFilter) {
      case 'free': return evts.filter((e) => !e.minPrice || e.minPrice === 0);
      case 'under500': return evts.filter((e) => e.minPrice && e.minPrice < 50000);
      case 'under1000': return evts.filter((e) => e.minPrice && e.minPrice < 100000);
      case 'above1000': return evts.filter((e) => e.minPrice && e.minPrice >= 100000);
      default: return evts;
    }
  };

  const filtered = applyPriceFilter(filteredEvents());

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Icon name="magnify" size={20} color={COLORS.primary} />
          <TextInput
            style={styles.searchText}
            placeholder="Search events, artists, plays..."
            placeholderTextColor={COLORS.textMuted}
            value={localSearch}
            onChangeText={setLocalSearch}
            autoCorrect={false}
          />
          {localSearch.length > 0 && (
            <TouchableOpacity onPress={() => { setLocalSearch(''); setSearch(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setViewMode((v) => v === 'list' ? 'grid' : 'list')}
          style={styles.viewToggle}
        >
          <Icon name={viewMode === 'list' ? 'view-grid-outline' : 'view-headline'} size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Category pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((c) => (
            <CategoryPill
              key={c.id}
              label={c.label}
              iconName={c.iconName}
              active={selectedCategory === c.id}
              onPress={() => setCategory(c.id as any)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Price filter */}
      <View style={styles.priceContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.priceRow}
        >
          {PRICE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setPriceFilter(f.id)}
              style={[styles.priceChip, priceFilter === f.id && styles.priceChipActive]}
            >
              <Text style={[styles.priceChipText, priceFilter === f.id && styles.priceChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results count */}
      {!loading && !error && filtered.length > 0 && (
        <Text style={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'} found
        </Text>
      )}

      {/* Events List */}
      {loading && events.length === 0 ? (
        <LoadingLogo fill />
      ) : filtered.length === 0 ? (
        events.length === 0 ? (
          <RetryState
            title="Couldn't load events"
            subtitle={error || 'Check your connection and try again.'}
            onRetry={() => fetchEvents(selectedCity)}
          />
        ) : (
          <RetryState
            title="No events found"
            subtitle="Try changing your search or filters."
            retryLabel="Clear filters"
            onRetry={() => { setLocalSearch(''); setSearch(''); setCategory('all'); setPriceFilter('all'); }}
          />
        )
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              width={(SCREEN_WIDTH - SPACING.base * 2 - 12) / 2}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
          ListFooterComponent={<View style={{ height: SPACING.base }} />}
        />
      ) : (
        <FlatList
          key="list"
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EventListCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
          ListFooterComponent={<View style={{ height: SPACING.base }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchText: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '500' },
  viewToggle: {
    width: 46,
    height: 46,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryContainer: {
    height: 52,
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    gap: 8,
  },
  priceContainer: {
    height: 44,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    gap: 8,
  },
  priceChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceChipActive: {
    backgroundColor: 'rgba(234,88,12,0.12)',
    borderColor: COLORS.primary,
  },
  priceChipText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  priceChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  resultCount: {
    color: COLORS.textDim,
    fontSize: 12,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
  },
  listPad: { paddingHorizontal: SPACING.base },
});
