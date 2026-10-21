/**
 * NotificationsScreen — MahaTicket Android
 */
import React, { useEffect, useState } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../theme';
import { api, Announcement } from '../api';
import { EmptyState, Skeleton } from '../components';

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnnouncements()
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 8, marginBottom: 16 }}>
              <Skeleton height={16} width={200} />
              <Skeleton height={12} />
              <Skeleton height={12} width={180} />
            </View>
          ))}
        </View>
      ) : announcements.length === 0 ? (
        <EmptyState emoji="🔔" title="No Notifications" subtitle="You're all caught up! Check back later." />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.notifCard}>
              <View style={styles.notifDot} />
              <View style={{ flex: 1 }}>
                {item.imageUrl ? null : null}
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifMsg}>{item.message}</Text>
                {item.ctaLabel && item.ctaUrl && (
                  <TouchableOpacity style={styles.notifCta}>
                    <Text style={styles.notifCtaText}>{item.ctaLabel} →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  list: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm },
  notifCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  notifTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  notifMsg: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  notifCta: { marginTop: 8 },
  notifCtaText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
