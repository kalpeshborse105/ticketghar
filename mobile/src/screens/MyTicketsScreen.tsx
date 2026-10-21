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
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { api, OrderItem, formatDate, formatTime, paise } from '../api';
import { useAuthStore } from '../store';
import { Badge, Button, EmptyState, MahaTicketPass, Skeleton, MTPopupModal } from '../components';

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

  // Guest lookup state (Screenshot 2 exact match)
  const [guestQuery, setGuestQuery] = useState('');
  const [guestSearching, setGuestSearching] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestOrder, setGuestOrder] = useState<OrderItem | null>(null);

  // Ticket Mitra modal state
  const [mitraModalVisible, setMitraModalVisible] = useState(false);
  const [ticketPopupModal, setTicketPopupModal] = useState<{
    visible: boolean;
    type?: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.getMyTickets(user?.email, user?.phone);
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.phone]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  const handleGuestSearch = async () => {
    const q = guestQuery.trim().toUpperCase();
    if (!q) {
      setGuestError('कृपया वैध ऑर्डर क्रमांक किंवा तिकीट कोड टाका.');
      return;
    }
    setGuestSearching(true);
    setGuestError(null);
    setGuestOrder(null);

    try {
      // 1. Check local device orders first
      const data = await api.getMyTickets();
      const match = (data.orders || []).find(
        (o) =>
          o.orderNumber.toUpperCase() === q ||
          o.tickets?.some((t) => t.ticketCode.toUpperCase() === q)
      );

      if (match) {
        setGuestOrder(match);
      } else {
        // 2. Try remote API lookup
        const res = await api.getOrder(q).catch(() => null);
        if (res?.order) {
          setGuestOrder(res.order);
        } else {
          setGuestError('या क्रमांकाची कोणतीही नोंद आढळली नाही. कृपया पुन्हा तपासा.');
        }
      }
    } catch {
      setGuestError('तिकीट शोधताना त्रुटी आली. कृपया इंटरनेट तपासा.');
    } finally {
      setGuestSearching(false);
    }
  };

  const now = new Date();
  const upcoming = orders.filter((o) => {
    const sessionDate = o.session?.sessionStartTime ? new Date(o.session.sessionStartTime) : null;
    return (!sessionDate || sessionDate >= now) && (o.paymentStatus === 'paid' || o.paymentStatus === 'captured');
  });
  const past = orders.filter((o) => {
    const sessionDate = o.session?.sessionStartTime ? new Date(o.session.sessionStartTime) : null;
    return sessionDate && sessionDate < now && o.paymentStatus === 'paid';
  });

  const displayed = activeTab === 'upcoming' ? upcoming : past;

  // ── Unauthenticated State (Exact Match to Web Screenshot 2) ────────────────
  if (!isAuthenticated && orders.length === 0 && !guestOrder) {
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

          {/* ── CARD 2: Or Look Up Ticket with Booking Reference ─────────────── */}
          <View style={styles.cardSecondary}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="ticket-confirmation-outline" size={18} color={COLORS.primary} />
              <Text style={styles.lookupTitle}>
                Or Look Up Ticket with Booking Reference
              </Text>
            </View>
            <Text style={styles.lookupSub}>
              If you have an Order Number (e.g. TG-2026-...) or Ticket Code, enter it below to access your pass directly.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.lookupInput}
                placeholder="e.g. TG-2026-94812 or TG-TK-..."
                placeholderTextColor={COLORS.textDim}
                value={guestQuery}
                onChangeText={setGuestQuery}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleGuestSearch}
              disabled={guestSearching || !guestQuery.trim()}
              style={[
                styles.findBtn,
                (!guestQuery.trim() || guestSearching) && { opacity: 0.6 },
              ]}
              activeOpacity={0.85}
            >
              {guestSearching ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="magnify" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                  <Text style={styles.findBtnText}>Find Ticket</Text>
                </>
              )}
            </TouchableOpacity>

            {guestError && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle-outline" size={15} color={COLORS.danger} />
                <Text style={styles.errorText}>{guestError}</Text>
              </View>
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* ── FLOATING TICKET MITRA BADGE (Exact match to Screenshot 2) ────── */}
        <TouchableOpacity
          onPress={() => setMitraModalVisible(true)}
          style={styles.floatingMitra}
          activeOpacity={0.85}
        >
          <View style={styles.mitraDot} />
          <Text style={styles.mitraLabel}>तिकीट मित्र</Text>
          <View style={styles.mitraIconWrap}>
            <Icon name="theater" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Ticket Mitra Dialog */}
        <Modal
          visible={mitraModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMitraModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.mitraSheet}>
              <View style={styles.mitraSheetTop}>
                <View style={styles.mitraAvatar}>
                  <Icon name="theater" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mitraSheetTitle}>तिकीट मित्र (Ticket Mitra)</Text>
                  <Text style={styles.mitraSheetSub}>२४/७ ग्राहक सहाय्यता केंद्र</Text>
                </View>
                <TouchableOpacity onPress={() => setMitraModalVisible(false)}>
                  <Icon name="close" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.mitraNotice}>
                तिकीट बुकिंग, तारीख बदल, किंवा सभागृह पत्त्याबाबत काही अडचण आहे का?
              </Text>
              <View style={{ gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setMitraModalVisible(false);
                    navigation.navigate('Explore');
                  }}
                  style={styles.mitraActionBtn}
                >
                  <Icon name="magnify" size={16} color={COLORS.primary} />
                  <Text style={styles.mitraActionText}>नाटके व प्रयोग शोधा</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setMitraModalVisible(false);
                    navigation.navigate('PolicyViewer', { type: 'refund' });
                  }}
                  style={styles.mitraActionBtn}
                >
                  <Icon name="keyboard-return" size={16} color={COLORS.primary} />
                  <Text style={styles.mitraActionText}>परतावा व रद्द धोरण (Refund)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Authenticated State or Guest Match Found ──────────────────────────────
  const ordersToDisplay = guestOrder ? [guestOrder] : displayed;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headerTitle}>My Tickets</Text>
          <View style={styles.ticketCountBadge}>
            <Text style={styles.ticketCountText}>{ordersToDisplay.length}</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>Digital Passes & Entry QR</Text>
      </View>

      {/* Guest Match Notice */}
      {guestOrder && (
        <View style={styles.guestFoundBanner}>
          <Text style={styles.guestFoundText}>
            ✓ Ticket found: {guestOrder.orderNumber}
          </Text>
          <TouchableOpacity onPress={() => setGuestOrder(null)}>
            <Text style={styles.clearLookupText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      {!guestOrder && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming ({upcoming.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
              Past ({past.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => <TicketSkeleton key={i} />)}
        </View>
      ) : ordersToDisplay.length === 0 ? (
        <EmptyState
          iconName="emoticon-sad-outline"
          title="No tickets yet"
          subtitle="All your booked tickets will appear here."
          action={{ label: 'Browse Events', onPress: () => navigation.navigate('Main', { screen: 'Home' }) }}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setSelectedOrder(item);
                setQrVisible(true);
              }}
              activeOpacity={0.88}
              style={styles.ticketCard}
            >
              {/* Top Accent Strip */}
              <View style={[styles.accentStrip, { backgroundColor: COLORS.primary }]} />

              <View style={styles.ticketBody}>
                {/* Title & Status */}
                <View style={styles.titleRow}>
                  <Text style={styles.ticketTitle} numberOfLines={2}>
                    {item.event?.title || item.event?.titleMr || 'Event'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    <Text style={[styles.statusPillText, { color: COLORS.success }]}>
                      {item.paymentStatus === 'paid' || item.paymentStatus === 'captured' ? 'PAID' : 'ACTIVE'}
                    </Text>
                  </View>
                </View>

                {/* Show Details */}
                <View style={styles.metaCol}>
                  <View style={styles.metaRow}>
                    <Icon name="map-marker" size={12} color={COLORS.primary} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.event?.venue?.name || item.event?.venue?.nameMr || 'Venue'} • {item.event?.venue?.city || 'City'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Icon name="calendar-clock" size={12} color={COLORS.accentGold} />
                    <Text style={styles.metaText}>
                      {item.session?.sessionStartTime
                        ? `${formatDate(item.session.sessionStartTime)} • ${formatTime(item.session.sessionStartTime)}`
                        : 'Date & Time TBD'}
                    </Text>
                  </View>
                  {item.tickets && item.tickets.length > 0 && (
                    <View style={styles.metaRow}>
                      <Icon name="seat" size={12} color={COLORS.primary} />
                      <Text style={[styles.metaText, { color: COLORS.accent, fontWeight: '700' }]}>
                        Seats: {item.tickets.map((t) => t.seatCode).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Perforation Line */}
                <View style={styles.perforationContainer}>
                  <View style={styles.notchLeft} />
                  <View style={styles.perforationLine} />
                  <View style={styles.notchRight} />
                </View>

                {/* Bottom Row */}
                <View style={styles.bottomRow}>
                  <View>
                    <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                    <Text style={styles.ticketCount}>
                      {(item.tickets?.length || item.ticketCount || 1)} {(item.tickets?.length || item.ticketCount || 1) > 1 ? 'seats' : 'seat'} • {paise(item.grandTotal)}
                    </Text>
                  </View>

                  <View style={styles.qrActionBtn}>
                    <Icon name="qrcode-scan" size={14} color={COLORS.primary} />
                    <Text style={styles.qrActionText}>QR</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Full-Screen Digital Ticket Pass Modal ──────────────────────────────── */}
      <Modal
        visible={qrVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQrVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.fullScreenTicket, { paddingTop: Math.max(insets.top, 16) }]}>
            {/* Modal Top Bar */}
            <View style={styles.modalTopBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="ticket-confirmation" size={20} color={COLORS.primary} />
                <Text style={styles.modalTopTitle}>M-Ticket Pass (डिजिटल पास)</Text>
              </View>
              <TouchableOpacity
                onPress={() => setQrVisible(false)}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              bounces
              contentContainerStyle={{
                paddingBottom: 120 + Math.max(insets.bottom, 12),
                paddingTop: 8,
                paddingHorizontal: 4,
                flexGrow: 1,
              }}
            >
              <MahaTicketPass
                ticketCode={
                  selectedOrder?.tickets?.[0]?.ticketCode ||
                  selectedOrder?.orderNumber ||
                  'MT-PASS'
                }
                seatCode={
                  selectedOrder?.tickets?.map((t) => t.seatCode).filter(Boolean).join(', ') ||
                  undefined
                }
                eventTitle={
                  selectedOrder?.event?.titleMr ||
                  selectedOrder?.event?.title ||
                  'Event'
                }
                venueName={
                  selectedOrder?.event?.venue?.nameMr ||
                  selectedOrder?.event?.venue?.name ||
                  (selectedOrder as any)?.venueName ||
                  (selectedOrder as any)?.venue?.name ||
                  'Auditorium'
                }
                venueCity={
                  selectedOrder?.event?.venue?.city ||
                  (selectedOrder as any)?.venue?.city ||
                  ''
                }
                showDateStr={
                  selectedOrder?.session?.sessionStartTime
                    ? formatDate(selectedOrder.session.sessionStartTime)
                    : undefined
                }
                showTimeStr={
                  selectedOrder?.session?.sessionStartTime
                    ? formatTime(selectedOrder.session.sessionStartTime)
                    : undefined
                }
                orderNumber={selectedOrder?.orderNumber}
                grandTotal={selectedOrder?.grandTotal}
                qrPayload={
                  selectedOrder?.tickets?.[0]?.qrPayload ||
                  selectedOrder?.tickets?.[0]?.ticketCode ||
                  selectedOrder?.orderNumber ||
                  'MahaTicket'
                }
                ticketIndex={1}
                totalTickets={selectedOrder?.tickets?.length || selectedOrder?.ticketCount}
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
    </View>
  );
}

function TicketSkeleton() {
  return (
    <View style={[styles.ticketCard, { marginBottom: SPACING.sm }]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    ...SHADOWS.md,
  },
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

  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  accentStrip: { height: 3, width: '100%' },
  ticketBody: { padding: 14, gap: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  ticketTitle: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 9, fontWeight: '800' },
  metaCol: { gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: COLORS.textMuted, fontSize: 11 },

  perforationContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, position: 'relative', marginHorizontal: -14 },
  notchLeft: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.bg, marginLeft: -6 },
  perforationLine: { flex: 1, height: 1, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  notchRight: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.bg, marginRight: -6 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 0 },
  orderNum: { color: COLORS.textDim, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  ticketCount: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginTop: 2 },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,107,53,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  qrActionText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
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
