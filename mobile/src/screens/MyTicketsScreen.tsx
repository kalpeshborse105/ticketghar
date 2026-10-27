/**
 * MyTicketsScreen — MahaTicket Android
 * Perfectly synchronized with web responsive My Tickets screen:
 * - "Please Log In to View Your Tickets" authentication card
 * - "Or Look Up Ticket with Booking Reference" direct pass finder
 * - Floating "तिकीट मित्र" (Ticket Mitra) assistant badge
 * - Perforated M-Ticket pass with native SVG QR code
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import { TikitMitraModal } from '../components/TikitMitraModal';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { api, OrderItem, formatDate, formatTime, paise } from '../api';
import { useAuthStore } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge, Button, EmptyState, MahaTicketPass, Skeleton, MTPopupModal } from '../components';
import { downloadTicketPdf } from '../lib/downloader';
import { WEB_ORIGIN } from '../lib/contact';

type Tab = 'upcoming' | 'past';

export default function MyTicketsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  // Ticket Mitra modal state
  const [mitraModalVisible, setMitraModalVisible] = useState(false);
  const [ticketPopupModal, setTicketPopupModal] = useState<{
    visible: boolean;
    type?: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (qrVisible) {
          setQrVisible(false);
          setSelectedOrder(null);
          return true;
        }
        if (mitraModalVisible) {
          setMitraModalVisible(false);
          return true;
        }
        if (ticketPopupModal) {
          setTicketPopupModal(null);
          return true;
        }
        if (selectedOrder) {
          setSelectedOrder(null);
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        navigation.navigate('Home');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [qrVisible, selectedOrder, mitraModalVisible, ticketPopupModal, navigation])
  );

  const fetchTickets = useCallback(
    async (generation: { current: number }) => {
      const myGen = ++generation.current;
      if (!isAuthenticated) {
        if (myGen === generation.current) {
          setOrders([]);
          setSelectedOrder(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const data = await api.getMyTickets();
        if (myGen !== generation.current) return;
        const list = Array.isArray(data?.orders) ? data.orders : [];
        setOrders(list);
        await AsyncStorage.setItem('@tg_my_orders', JSON.stringify(list.slice(0, 30))).catch(
          () => null
        );
      } catch {
        if (myGen !== generation.current) return;
        // Authenticated but network failed — do not restore another user's cache
        setOrders([]);
      } finally {
        if (myGen === generation.current) setLoading(false);
      }
    },
    [isAuthenticated]
  );

  const handleDownloadOrderPdf = async (order: OrderItem) => {
    const resolvedOrderNum = order.orderNumber || String(order.id);
    const pdfUrl = `${WEB_ORIGIN}/api/orders/${encodeURIComponent(resolvedOrderNum)}/pdf`;
    await downloadTicketPdf({
      url: `${pdfUrl}?download=1`,
      filename: `MahaTicket-${resolvedOrderNum}.pdf`,
      title: `MahaTicket - ${resolvedOrderNum}`,
      description: `Order #${resolvedOrderNum}`,
      pdfToken: (order as any)?.pdfDownloadToken,
    });
  };

  const handleShareOrder = async (order: OrderItem) => {
    const resolvedOrderNum = order.orderNumber || String(order.id);
    const primaryTicketCode = order.tickets?.[0]?.ticketCode || resolvedOrderNum;
    const ticketWebUrl = `${WEB_ORIGIN}/tickets/${encodeURIComponent(primaryTicketCode)}`;
    const eventName = order.event?.titleMr || order.event?.title || (order as any).eventTitle || 'कार्यक्रम';
    const venueName = order.event?.venue?.nameMr || order.event?.venue?.name || (order as any).venueName || 'सभागृह';
    const when = order.session?.sessionStartTime
      ? `${formatDate(order.session.sessionStartTime)} • ${formatTime(order.session.sessionStartTime)}`
      : (order as any).showDateStr || '';
    const seats =
      order.tickets?.map((t) => t.seatCode).filter(Boolean).join(', ') ||
      (Array.isArray((order as any).seatCodes) ? (order as any).seatCodes.join(', ') : 'General');

    const msg =
      `🎭 *MahaTicket (महाटिकिट) - ई-तिकीट पास*\n\n` +
      `📌 *कार्यक्रम:* ${eventName}\n` +
      (when ? `📅 *तारीख व वेळ:* ${when}\n` : '') +
      `📍 *सभागृह:* ${venueName}\n` +
      `💺 *आसन क्रमांक:* ${seats}\n` +
      `🎟️ *ऑर्डर क्रमांक:* #${resolvedOrderNum}\n\n` +
      `🌐 *तिकीट ऑनलाइन पहा:* ${ticketWebUrl}\n\n` +
      `प्रवेशद्वारावर डिजिटल क्यूआर कोड दाखवा. सुलभ तिकीट बुकिंग - MahaTicket!`;

    await Share.share({
      title: `${eventName} - MahaTicket Pass`,
      message: msg,
      url: ticketWebUrl,
    });
  };

  // Session-first: never render cached private tickets before auth is known
  useEffect(() => {
    const generation = { current: 0 };
    setOrders([]);
    setSelectedOrder(null);
    setLoading(true);

    if (!isAuthenticated) {
      AsyncStorage.removeItem('@tg_my_orders').catch(() => null);
      setLoading(false);
      return () => {
        generation.current += 1;
      };
    }

    fetchTickets(generation);
    return () => {
      generation.current += 1;
    };
  }, [isAuthenticated, user?.email, user?.id, fetchTickets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets({ current: 0 });
    setRefreshing(false);
  };

  const isVisibleTicket = (o: OrderItem) => {
    const ps = String(o.paymentStatus || '').toLowerCase();
    const os = String((o as any).orderStatus || '').toLowerCase();
    // Match web: show captured/paid/success and confirmed bookings
    return (
      ps === 'paid' ||
      ps === 'captured' ||
      ps === 'success' ||
      os === 'confirmed' ||
      (Array.isArray(o.tickets) && o.tickets.length > 0 && ps !== 'failed' && ps !== 'refunded')
    );
  };

  const now = new Date();
  const upcoming = orders.filter((o) => {
    if (!isVisibleTicket(o)) return false;
    const sessionDate = o.session?.sessionStartTime ? new Date(o.session.sessionStartTime) : null;
    return !sessionDate || sessionDate >= now;
  });
  const past = orders.filter((o) => {
    if (!isVisibleTicket(o)) return false;
    const sessionDate = o.session?.sessionStartTime ? new Date(o.session.sessionStartTime) : null;
    return !!sessionDate && sessionDate < now;
  });

  // If upcoming is empty but past has tickets, prefer Past (web lists all together)
  const effectiveTab: Tab =
    activeTab === 'upcoming' && upcoming.length === 0 && past.length > 0 ? 'past' : activeTab;
  const displayed = effectiveTab === 'upcoming' ? upcoming : past;

  // ── Unauthenticated State (never show cached private tickets) ────────────
  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

        {/* Top Header */}
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>
            <Text style={{ color: COLORS.primary }}>MAHA</Text>TICKET
          </Text>
          <View style={styles.headerRightRow}>
            <View style={styles.cityPill}>
              <Icon name="map-marker" size={12} color={COLORS.primary} />
              <Text style={styles.cityText}>Nashik / Pune</Text>
            </View>
            <View style={styles.langPills}>
              <View style={styles.langPillActive}><Text style={styles.langActiveText}>EN</Text></View>
              <View style={styles.langPill}><Text style={styles.langText}>म</Text></View>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.unauthScroll}
        >
          {/* ── CARD 1: आपले आरक्षित तिकीट पाहण्यासाठी लॉगिन करा ──────────────────── */}
          <View style={styles.cardPrimary}>
            <View style={styles.lockIconBox}>
              <Icon name="lock-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.cardPrimaryTitle}>
              आपले आरक्षित तिकीट पाहण्यासाठी लॉगिन करा
            </Text>
            <Text style={styles.cardPrimarySub}>
              बुकिंग करताना वापरलेला ईमेल पत्ता वापरून आपले डिजिटल पासेस, QR कोड आणि आसन आरक्षणे सुरक्षितपणे पहा.
            </Text>
            <Text style={[styles.cardPrimarySub, { fontSize: 11.5, marginTop: -8, color: '#64748B' }]}>
              (Please sign in with your booking email to view passes and reservations)
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.primaryBtn}
              activeOpacity={0.85}
            >
              <Icon name="login" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>ईमेल द्वारे लॉगिन करा (Log In)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              style={styles.secondaryBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>कार्यक्रमांची यादी पहा (Browse Events)</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Compact round TikitMitra — opens full chat booking assistant */}
        <TouchableOpacity
          onPress={() => setMitraModalVisible(true)}
          style={styles.floatingMitra}
          activeOpacity={0.85}
          accessibilityLabel="तिकीटमित्र AI"
        >
          <Image
            source={{ uri: 'https://mahaticket.kalpkrutinfotech.com/logo.png' }}
            style={styles.mitraLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TikitMitraModal
          visible={mitraModalVisible}
          onClose={() => setMitraModalVisible(false)}
          navigation={navigation}
          language="mr"
        />
      </View>
    );
  }

  // ── Authenticated State or Local Tickets ──────────────────────────────────
  const ordersToDisplay = displayed;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header — match web माझी तिकिटे */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>माझी तिकिटे</Text>
        <Text style={styles.headerSub}>आपण बुक केलेली सर्व तिकिटे आणि डिजिटल QR पासेस</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, effectiveTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, effectiveTab === 'upcoming' && styles.tabTextActive]}>
            आगामी ({upcoming.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, effectiveTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, effectiveTab === 'past' && styles.tabTextActive]}>
            मागील ({past.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && orders.length === 0 ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => <TicketSkeleton key={i} />)}
        </View>
      ) : ordersToDisplay.length === 0 ? (
        <EmptyState
          iconName="emoticon-sad-outline"
          title="अद्याप तिकिटे नाहीत"
          subtitle="आपण बुक केलेली सर्व तिकिटे येथे दिसतील."
          action={{ label: 'कार्यक्रम पहा', onPress: () => navigation.navigate('Main', { screen: 'Home' }) }}
        />
      ) : (
        <FlatList
          data={ordersToDisplay}
          keyExtractor={(item) => String(item.id || item.orderNumber)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.base, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item }) => {
            const seatCodes =
              item.tickets?.map((t) => t.seatCode).filter(Boolean).join(', ') ||
              (Array.isArray((item as any).seatCodes) ? (item as any).seatCodes.join(', ') : '');
            const venue =
              item.event?.venue?.nameMr ||
              item.event?.venue?.name ||
              (item as any).venueName ||
              'सभागृह';
            const when = item.session?.sessionStartTime
              ? `${formatDate(item.session.sessionStartTime)} • ${formatTime(item.session.sessionStartTime)}`
              : (item as any).showDateStr || '—';
            return (
              <View style={styles.webTicketCard}>
                <View style={styles.webTicketTop}>
                  <View style={styles.webTicketIcon}>
                    <Icon name="ticket-confirmation" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.webBadgeRow}>
                      <Text style={styles.webOrderBadge}>{item.orderNumber}</Text>
                      <View style={styles.webPaidPill}>
                        <Text style={styles.webPaidText}>
                          {item.paymentStatus === 'paid' || item.paymentStatus === 'captured'
                            ? '✓ PAID'
                            : 'ACTIVE'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.webEventTitle} numberOfLines={2}>
                      {item.event?.titleMr || item.event?.title || (item as any).eventTitle || 'कार्यक्रम'}
                    </Text>
                    <Text style={styles.webMetaLine} numberOfLines={1}>
                      {venue}
                      {item.event?.venue?.city ? ` • ${item.event.venue.city}` : ''}
                    </Text>
                    <Text style={styles.webMetaLine}>{when}</Text>
                    {seatCodes ? (
                      <View style={styles.webSeatsBox}>
                        <Text style={styles.webSeatsText}>आसने: {seatCodes}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.webTotal}>
                      एकूण देय रक्कम {paise(item.grandTotal)}
                    </Text>
                  </View>
                </View>
                <View style={styles.webActionButtonsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedOrder(item);
                      setQrVisible(true);
                    }}
                    style={styles.webViewPassBtn}
                    activeOpacity={0.88}
                  >
                    <Icon name="ticket-confirmation" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.webViewPassText}>पास उघडा</Text>
                  </TouchableOpacity>

                  <View style={styles.webSecondaryActionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const code =
                          item.tickets?.[0]?.ticketCode || item.orderNumber || '';
                        const url = `${WEB_ORIGIN}/tickets/${encodeURIComponent(code)}`;
                        const text = encodeURIComponent(
                          `🎟️ MahaTicket Pass\n${item.event?.titleMr || item.event?.title || 'Event'}\n${url}`
                        );
                        Linking.openURL(`whatsapp://send?text=${text}`).catch(() =>
                          handleShareOrder(item)
                        );
                      }}
                      style={styles.webIconOnlyBtn}
                      activeOpacity={0.85}
                      accessibilityLabel="WhatsApp"
                    >
                      <Icon name="whatsapp" size={20} color="#25D366" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShareOrder(item)}
                      style={styles.webIconOnlyBtn}
                      activeOpacity={0.85}
                      accessibilityLabel="Share"
                    >
                      <Icon name="share-variant" size={20} color="#0F172A" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDownloadOrderPdf(item)}
                      style={styles.webIconOnlyBtn}
                      activeOpacity={0.85}
                      accessibilityLabel="Download PDF"
                    >
                      <Icon name="download" size={20} color="#EA580C" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Full-Screen Digital Ticket Pass Modal ──────────────────────────────── */}
      <Modal
        visible={qrVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setQrVisible(false);
          setSelectedOrder(null);
        }}
      >
        <View style={styles.modalBg}>
          <View style={[styles.fullScreenTicket, { paddingTop: Math.max(insets.top, 6) }]}>
            {/* Modal Top Bar */}
            <View style={styles.modalTopBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="ticket-confirmation" size={18} color={COLORS.primary} />
                <Text style={styles.modalTopTitle}>M-Ticket Pass</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setQrVisible(false);
                  setSelectedOrder(null);
                }}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              bounces
              contentContainerStyle={{
                // Keep icon actions (WhatsApp / Share / PDF / Mail) above tab bar
                paddingBottom: 96 + Math.max(insets.bottom, 16),
                paddingTop: 2,
                paddingHorizontal: 2,
                flexGrow: 1,
              }}
            >
              <MahaTicketPass
                ticketCode={
                  selectedOrder?.tickets?.[0]?.ticketCode ||
                  selectedOrder?.orderNumber ||
                  '—'
                }
                seatCode={
                  selectedOrder?.tickets?.map((t) => t.seatCode).filter(Boolean).join(', ') ||
                  (Array.isArray((selectedOrder as any)?.seatCodes)
                    ? (selectedOrder as any).seatCodes.join(', ')
                    : undefined) ||
                  (selectedOrder as any)?.seatsSummary ||
                  '—'
                }
                eventTitle={
                  selectedOrder?.event?.titleMr ||
                  selectedOrder?.event?.title ||
                  (selectedOrder as any)?.eventTitle ||
                  'कार्यक्रम'
                }
                venueName={
                  selectedOrder?.event?.venue?.nameMr ||
                  selectedOrder?.event?.venue?.name ||
                  (selectedOrder as any)?.venueName ||
                  (selectedOrder as any)?.venue?.name ||
                  'सभागृह उपलब्ध नाही'
                }
                venueCity={
                  selectedOrder?.event?.venue?.city ||
                  (selectedOrder as any)?.venue?.city ||
                  (selectedOrder as any)?.venueCity ||
                  ''
                }
                showDateStr={
                  selectedOrder?.session?.sessionStartTime ||
                  (selectedOrder as any)?.sessionStartTime ||
                  (selectedOrder as any)?.session_start_time
                    ? formatDate(
                        selectedOrder?.session?.sessionStartTime ||
                          (selectedOrder as any)?.sessionStartTime ||
                          (selectedOrder as any)?.session_start_time
                      )
                    : (selectedOrder as any)?.showDateStr || 'तारीख उपलब्ध नाही'
                }
                showTimeStr={
                  selectedOrder?.session?.sessionStartTime ||
                  (selectedOrder as any)?.sessionStartTime ||
                  (selectedOrder as any)?.session_start_time
                    ? formatTime(
                        selectedOrder?.session?.sessionStartTime ||
                          (selectedOrder as any)?.sessionStartTime ||
                          (selectedOrder as any)?.session_start_time
                      )
                    : (selectedOrder as any)?.showTimeStr || 'वेळ उपलब्ध नाही'
                }
                orderNumber={selectedOrder?.orderNumber}
                grandTotal={selectedOrder?.grandTotal}
                qrPayload={
                  selectedOrder?.tickets?.[0]?.qrPayload ||
                  JSON.stringify({
                    app: 'MahaTicket',
                    orderNumber: selectedOrder?.orderNumber || '—',
                    ticketCode: selectedOrder?.tickets?.[0]?.ticketCode || selectedOrder?.orderNumber || '—',
                    eventTitle: selectedOrder?.event?.titleMr || selectedOrder?.event?.title || (selectedOrder as any)?.eventTitle || 'कार्यक्रम',
                    seats:
                      selectedOrder?.tickets?.map((t) => t.seatCode).filter(Boolean).join(', ') ||
                      (Array.isArray((selectedOrder as any)?.seatCodes)
                        ? (selectedOrder as any).seatCodes.join(', ')
                        : (selectedOrder as any)?.seatsSummary || '—'),
                    verified: true,
                    timestamp: new Date().toISOString(),
                  })
                }
                ticketIndex={1}
                totalTickets={selectedOrder?.tickets?.length || selectedOrder?.ticketCount}
                pdfDownloadToken={(selectedOrder as any)?.pdfDownloadToken}
                userEmail={
                  (selectedOrder as any)?.userEmail ||
                  user?.email ||
                  (selectedOrder as any)?.email ||
                  null
                }
                onClose={() => setQrVisible(false)}
                onHome={() => {
                  setQrVisible(false);
                  navigation.navigate('Main', { screen: 'Home' });
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modern In-App Popup Modal */}
      {ticketPopupModal ? (
        <MTPopupModal
          visible={ticketPopupModal.visible}
          type={ticketPopupModal.type || 'info'}
          title={ticketPopupModal.title}
          message={ticketPopupModal.message}
          primaryButtonText="समजले (OK)"
          onPrimaryPress={() => setTicketPopupModal(null)}
          onRequestClose={() => setTicketPopupModal(null)}
        />
      ) : null}

      <TouchableOpacity
        onPress={() => setMitraModalVisible(true)}
        style={[styles.floatingMitra, { bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
        accessibilityLabel="तिकीटमित्र AI"
      >
        <Image
          source={{ uri: 'https://mahaticket.kalpkrutinfotech.com/logo.png' }}
          style={styles.mitraLogo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <TikitMitraModal
        visible={mitraModalVisible}
        onClose={() => setMitraModalVisible(false)}
        navigation={navigation}
        language="mr"
      />
    </View>
  );
}

function TicketSkeleton() {
  return (
    <View style={[styles.webTicketCard, { marginBottom: SPACING.sm }]}>
      <View style={{ padding: SPACING.md, gap: 10 }}>
        <Skeleton height={20} width={220} />
        <Skeleton height={14} width={160} />
        <Skeleton height={14} width={120} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header — light theme
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  webHeaderTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  cityText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  langPills: { flexDirection: 'row', backgroundColor: COLORS.surface2, borderRadius: RADIUS.full, padding: 2 },
  langPillActive: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  langActiveText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  langPill: { paddingHorizontal: 6, paddingVertical: 2 },
  langText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  unauthScroll: { padding: SPACING.base, gap: 18 },

  cardPrimary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.sm,
  },
  lockIconBox: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(234,88,12,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPrimaryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  cardPrimarySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  cardSecondary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 10,
    ...SHADOWS.sm,
  },
  lookupTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1 },
  lookupSub: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  inputContainer: { marginTop: 4 },
  lookupInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 13,
  },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  findBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: RADIUS.sm,
    padding: 8,
    marginTop: 4,
  },
  errorText: { fontSize: 11, color: COLORS.danger, flex: 1 },

  floatingMitra: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  mitraLogo: { width: 40, height: 40 },
  mitraDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  mitraLabel: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  mitraIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mitraSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mitraSheetTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mitraAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(234,88,12,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mitraSheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  mitraSheetSub: { fontSize: 11, color: COLORS.textMuted },
  mitraNotice: { fontSize: 13, color: COLORS.text, marginTop: 12, lineHeight: 18 },
  mitraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface2,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  mitraActionText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  // Authenticated State Styles
  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: SPACING.xs, backgroundColor: COLORS.bg },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  headerSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  ticketCountBadge: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  ticketCountText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  guestFoundBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    marginHorizontal: SPACING.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  guestFoundText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  clearLookupText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.base,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    padding: 3,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 11 },
  tabTextActive: { color: COLORS.white, fontWeight: '800' },

  skeletonList: { paddingHorizontal: SPACING.base, gap: SPACING.sm },

  // Web-parity My Tickets list card
  webTicketCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
    ...SHADOWS.sm,
  },
  webTicketTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  webTicketIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  webOrderBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  webPaidPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  webPaidText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  webEventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 22,
    paddingBottom: 2,
    includeFontPadding: true,
  },
  webMetaLine: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  webSeatsBox: {
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  webSeatsText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  webTotal: { marginTop: 8, fontSize: 13, fontWeight: '900', color: COLORS.text },
  webActionButtonsRow: {
    marginTop: 12,
    gap: 8,
  },
  webViewPassBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewPassText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  webSecondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  webIconOnlyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.96)' },
  fullScreenTicket: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  modalTopTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeAction: {
    flex: 1,
    width: 'auto',
    flexDirection: 'row',
    gap: 4,
    borderRadius: 24,
  },
  closeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
});
