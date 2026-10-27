/**
 * BookingConfirmedScreen — MahaTicket Android
 * 100% Visual Parity with Web MahaTicketCard & TicketPassModal:
 * - Rich saffron-orange gradient top header with ticket icon & valid badge
 * - Theatrical category badge, Marathi/English title, 2-column Date/Time/Venue grid
 * - Saffron-tinted reserved seat callout with seat codes & paid total
 * - Physical ticket perforated notches with dashed tear line
 * - High-contrast SVG QR Code entry pass with brightness guidance & code
 * - Encrypted digital verification security trust card
 * - WhatsApp Share, My Tickets & Home action buttons
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Linking,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { api, OrderItem, formatDate, formatTime, paise } from '../api';
import { Button, Skeleton } from '../components';
import { useCartStore } from '../store';
import { WEB_ORIGIN, openUrl } from '../lib/contact';
import { downloadTicketPdf } from '../lib/downloader';

const { width } = Dimensions.get('window');

// Confetti particle
function ConfettiPiece({ delay, color }: { delay: number; color: string }) {
  const y = useRef(new Animated.Value(-50)).current;
  const x = useRef(new Animated.Value(Math.random() * width)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, {
            toValue: Dimensions.get('window').height + 50,
            duration: 1800,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, { toValue: 1, duration: 1800, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, rotate, y]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 8,
        height: 12,
        borderRadius: 2,
        backgroundColor: color,
        transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
      }}
    />
  );
}

const CONFETTI_COLORS = ['#EA580C', '#F97316', '#F59E0B', '#10B981', '#6366F1'];

export default function BookingConfirmedScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const {
    orderId,
    orderNumber,
    eventTitle,
    seatCodes,
    grandTotal,
    sessionStartTime: routeSessionStartTime,
    showDateStr: routeShowDateStr,
    venueName: routeVenueName,
  } = route.params || {};
  const clearCart = useCartStore((s) => s.clearCart);

  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const scale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(50)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    clearCart();

    // Prevent returning to checkout on hardware back press — redirect to Main Tabs
    const onBackPress = () => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // Sequence animations
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 9, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Load full order details for venue & tickets
    if (orderNumber) {
      api
        .getOrder(orderNumber)
        .then((d) => {
          if (d?.order) setOrder(d.order);
        })
        .catch(() => null)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      backSub.remove();
    };
  }, [orderNumber, navigation]);

  const resolvedOrderNum = order?.orderNumber || orderNumber || '—';
  const resolvedEventTitle = order?.event?.titleMr || order?.event?.title || eventTitle || 'कार्यक्रम';
  const resolvedVenue =
    order?.event?.venue?.nameMr ||
    order?.event?.venue?.name ||
    routeVenueName ||
    'सभागृह उपलब्ध नाही';
  const resolvedCity = order?.event?.venue?.city || '';
  const bookedStart =
    order?.session?.sessionStartTime || routeSessionStartTime || null;
  const showDateStr = bookedStart
    ? formatDate(bookedStart)
    : routeShowDateStr || 'तारीख उपलब्ध नाही';
  const showTimeStr = bookedStart
    ? formatTime(bookedStart)
    : routeShowDateStr
      ? ''
      : 'वेळ उपलब्ध नाही';

  const formattedSeats =
    Array.isArray(seatCodes) && seatCodes.length > 0
      ? seatCodes.join(', ')
      : order?.tickets?.map((t) => t.seatCode).join(', ') || '—';

  const ticketCount = Array.isArray(seatCodes) && seatCodes.length > 0
    ? seatCodes.length
    : order?.tickets?.length || 0;

  const totalAmountStr = grandTotal
    ? `₹${Math.round(grandTotal / 100).toLocaleString('en-IN')}`
    : order?.grandTotal
    ? `₹${Math.round(order.grandTotal / 100).toLocaleString('en-IN')}`
    : '—';

  // Order number QR → gate admits every seat on this booking with one scan
  const qrPayload = resolvedOrderNum || order?.tickets?.[0]?.ticketCode || 'MT-PASS';

  const primaryTicketCode = order?.tickets?.[0]?.ticketCode || resolvedOrderNum;
  const pdfUrl = `${WEB_ORIGIN}/api/orders/${encodeURIComponent(resolvedOrderNum)}/pdf`;
  const ticketWebUrl = `${WEB_ORIGIN}/tickets/${encodeURIComponent(primaryTicketCode)}`;

  const handleDownloadPdf = async () => {
    await downloadTicketPdf({
      url: `${pdfUrl}?download=1`,
      filename: `MahaTicket-${resolvedOrderNum}.pdf`,
      title: `MahaTicket - ${resolvedOrderNum}`,
      description: `Seats: ${formattedSeats} • Order #${resolvedOrderNum}`,
      pdfToken: (order as any)?.pdfDownloadToken || (route.params as any)?.pdfDownloadToken || (route.params as any)?.order?.pdfDownloadToken,
    });
  };

  const handleShare = async () => {
    const shareMessage = `🎭 *MahaTicket (महाटिकिट) - ई-तिकीट कन्फर्मेशन*\n\n` +
      `📌 *कार्यक्रम:* ${resolvedEventTitle}\n` +
      `📅 *तारीख:* ${showDateStr}\n` +
      `⏰ *वेळ:* ${showTimeStr}\n` +
      `📍 *सभागृह:* ${resolvedVenue}, ${resolvedCity}\n` +
      `💺 *आसन क्रमांक:* ${formattedSeats}\n` +
      `🎟️ *ऑर्डर क्रमांक:* #${resolvedOrderNum}\n\n` +
      `🌐 *तिकीट ऑनलाइन पहा:* \n${ticketWebUrl}\n\n` +
      `📥 *थेट PDF डाउनलोड करा:* \n${pdfUrl}\n\n` +
      `प्रवेशद्वारावर डिजिटल क्यूआर कोड दाखवा. सुलभ तिकीट बुकिंग - MahaTicket!`;

    await Share.share({
      title: `${resolvedEventTitle} - MahaTicket Pass`,
      message: shareMessage,
      url: ticketWebUrl,
    });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎭 *MahaTicket (महाटिकिट) बुकिंग निश्चित!*\n\n` +
      `📌 *कार्यक्रम:* ${resolvedEventTitle}\n` +
      `📅 *तारीख:* ${showDateStr} (${showTimeStr})\n` +
      `📍 *सभागृह:* ${resolvedVenue}\n` +
      `💺 *आसने:* ${formattedSeats}\n` +
      `🎟️ *ऑर्डर:* #${resolvedOrderNum}\n\n` +
      `🌐 *तिकीट पहा:* ${ticketWebUrl}\n` +
      `📥 *PDF डाउनलोड:* ${pdfUrl}`
    );
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() => {
      handleShare();
    });
  };

  const [emailing, setEmailing] = useState(false);

  const handleEmailTicket = () => {
    if (emailing) return;
    const to =
      (order as any)?.userEmail ||
      (route.params as any)?.order?.userEmail ||
      '';
    if (!to) {
      Toast.show({ type: 'error', text1: 'ईमेल उपलब्ध नाही' });
      return;
    }
    Alert.alert('ईमेल पाठवायचा?', `तिकीट PDF या पत्त्यावर पाठवला जाईल:\n${to}`, [
      { text: 'रद्द', style: 'cancel' },
      {
        text: 'पाठवा',
        onPress: async () => {
          setEmailing(true);
          try {
            const code = primaryTicketCode || resolvedOrderNum;
            const pdfToken =
              (order as any)?.pdfDownloadToken ||
              (route.params as any)?.pdfDownloadToken ||
              (route.params as any)?.order?.pdfDownloadToken;
            const res = await api.sendTicketEmail(code, to, pdfToken || undefined);
            if (res && (res.success || (res as any).sent)) {
              Toast.show({
                type: 'success',
                text1: 'ईमेल पाठवले (Email Sent)',
                text2: to,
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'ईमेल अयशस्वी',
                text2: res?.message || res?.error || 'पुन्हा प्रयत्न करा',
              });
            }
          } catch {
            Toast.show({
              type: 'error',
              text1: 'ईमेल पाठवता आले नाही',
              text2: 'कृपया काही वेळात पुन्हा प्रयत्न करा.',
            });
          } finally {
            setEmailing(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Confetti particles */}
      {Array.from({ length: 22 }).map((_, i) => (
        <ConfettiPiece
          key={i}
          delay={Math.random() * 1600}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
        />
      ))}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 36 },
        ]}
      >
        <Animated.View
          style={[styles.animatedContent, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}
        >
          {/* Compact Top Celebration Header */}
          <View style={styles.compactSuccessHeader}>
            <Animated.View style={[styles.compactSuccessBadge, { transform: [{ scale }] }]}>
              <Icon name="check-bold" size={16} color="#FFFFFF" />
            </Animated.View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Text style={styles.compactSuccessTitle}>बुकिंग निश्चित! (Booking Confirmed)</Text>
              <Text style={styles.compactSuccessSubtitle}>
                आपले ई-तिकीट तयार आहे • Show this QR pass at the venue entrance
              </Text>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════════════
              MAHATICKET AUTHENTIC PHYSICAL PASS (Exact Web MahaTicketCard Parity)
          ════════════════════════════════════════════════════════════════════════ */}
          <View style={styles.ticketCard}>
            {/* Top Saffron/Orange Gradient Banner */}
            <LinearGradient
              colors={['#EA580C', '#F97316', '#C2410C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ticketHeaderGradient}
            >
              <View style={styles.headerBrandRow}>
                <View style={styles.ticketIconBox}>
                  <Icon name="ticket-confirmation" size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.brandTitle}>महाटिकिट M-TICKET PASS</Text>
                  <Text style={styles.orderNumberText}>#{resolvedOrderNum}</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View style={styles.validStatusBadge}>
                <Icon name="shield-check" size={13} color="#6EE7B7" />
                <Text style={styles.validStatusText}>वैध (Valid)</Text>
              </View>
            </LinearGradient>

            {/* Ticket Upper Body */}
            <View style={styles.ticketBody}>
              {/* Category Badge & Pass Counter */}
              <View style={styles.tagRow}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>नाटक / THEATRE</Text>
                </View>
                {ticketCount > 1 ? (
                  <View style={styles.counterPill}>
                    <Text style={styles.counterText}>1 of {ticketCount} Passes</Text>
                  </View>
                ) : null}
              </View>

              {/* Event Title */}
              <Text style={styles.eventTitleText} numberOfLines={2}>
                {resolvedEventTitle}
              </Text>

              {/* 2-Column Show Details Grid */}
              <View style={styles.detailsGrid}>
                {/* Date */}
                <View style={styles.gridItem}>
                  <Icon name="calendar-month" size={15} color="#EA580C" style={styles.gridIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gridLabel}>तारीख / DATE</Text>
                    <Text style={styles.gridVal} numberOfLines={1}>{showDateStr}</Text>
                  </View>
                </View>

                {/* Time */}
                <View style={styles.gridItem}>
                  <Icon name="clock-outline" size={15} color="#EA580C" style={styles.gridIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gridLabel}>वेळ / TIME</Text>
                    <Text style={styles.gridVal} numberOfLines={1}>{showTimeStr}</Text>
                  </View>
                </View>

                {/* Venue (Full width) */}
                <View style={[styles.gridItem, styles.gridItemFull]}>
                  <Icon name="map-marker-radius" size={15} color="#EA580C" style={styles.gridIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gridLabel}>सभागृह / VENUE</Text>
                    <Text style={styles.gridVal} numberOfLines={1}>
                      {resolvedVenue}
                    </Text>
                    <Text style={styles.gridSubVal} numberOfLines={1}>
                      {resolvedCity}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Saffron Highlighted Seats & Total Callout */}
              <View style={styles.seatsCallout}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.seatsCalloutLabel}>आरक्षित आसन / SEAT</Text>
                  <Text style={styles.seatsCalloutVal} numberOfLines={1}>
                    {formattedSeats}
                  </Text>
                </View>

                <View style={styles.seatsCalloutRight}>
                  <Text style={styles.seatsCalloutLabel}>एकूण रक्कम / TOTAL</Text>
                  <Text style={styles.seatsCalloutPrice}>{totalAmountStr}</Text>
                </View>
              </View>
            </View>

            {/* ══════ PHYSICAL TICKET PERFORATION & NOTCH CUTOUTS (Exact Web Parity) ══════ */}
            <View style={styles.perforationWrapper}>
              {/* Left Inward Semi-circle Notch */}
              <View style={styles.notchLeft} />
              {/* Dashed Perforation Line */}
              <View style={styles.dashedDivider} />
              {/* Right Inward Semi-circle Notch */}
              <View style={styles.notchRight} />
            </View>

            {/* ══════ QR CODE PRESENTATION ZONE (Compact, High-Contrast) ══════ */}
            <View style={styles.qrContainer}>
              <View style={styles.qrInnerBox}>
                <QRCode
                  value={qrPayload}
                  size={140}
                  backgroundColor="#FFFFFF"
                  color="#111827"
                />
              </View>

              <Text style={styles.qrInstructions}>
                प्रवेशद्वारावर हा QR कोड दाखवा (Entry Pass)
              </Text>
              <Text style={styles.qrSubInstructions}>
                स्कॅन करण्यासाठी स्क्रीन ब्राईटनेस वाढवा • Increase brightness
              </Text>
              <Text style={styles.qrTicketCodeText}>
                PASS ID: #{resolvedOrderNum}
              </Text>

              {/* Compact Security Shield Badge */}
              <View style={styles.securityBox}>
                <View style={styles.securityHeader}>
                  <Icon name="shield-check" size={14} color="#EA580C" />
                  <Text style={styles.securityTitle}>सुरक्षित डिजिटल तिकीट पडताळणी</Text>
                </View>
                <Text style={styles.securityText}>
                  • हे तिकीट एनक्रिप्टेड (MTSEC) असून अधिकृत गेट ऑपरेटरद्वारे स्कॅन केले जाते.
                </Text>
              </View>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════════════
              SINGLE ROW MODERN ICON ACTION BUTTONS (NO CLUMSY STACKED BUTTONS)
          ════════════════════════════════════════════════════════════════════════ */}
          <View style={styles.iconActionsRow}>
            {/* WhatsApp Share */}
            <TouchableOpacity
              onPress={handleWhatsAppShare}
              style={styles.iconActionBtnItem}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                <Icon name="whatsapp" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.iconActionLabel}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Native Share */}
            <TouchableOpacity
              onPress={handleShare}
              style={styles.iconActionBtnItem}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#0284C7' }]}>
                <Icon name="share-variant" size={21} color="#FFFFFF" />
              </View>
              <Text style={styles.iconActionLabel}>Share</Text>
            </TouchableOpacity>

            {/* Download PDF */}
            <TouchableOpacity
              onPress={handleDownloadPdf}
              style={styles.iconActionBtnItem}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#DC2626' }]}>
                <Icon name="file-pdf-box" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.iconActionLabel}>PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmailTicket}
              style={styles.iconActionBtnItem}
              activeOpacity={0.8}
              disabled={emailing}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#0F172A' }]}>
                <Icon name={emailing ? 'loading' : 'email-outline'} size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.iconActionLabel}>Mail</Text>
            </TouchableOpacity>

            {/* My Tickets */}
            <TouchableOpacity
              onPress={() =>
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main', state: { routes: [{ name: 'Tickets' }], index: 0 } }],
                  })
                )
              }
              style={styles.iconActionBtnItem}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EA580C' }]}>
                <Icon name="ticket-confirmation-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.iconActionLabel}>My Tickets</Text>
            </TouchableOpacity>

            {/* Home */}
            <TouchableOpacity
              onPress={() =>
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main', state: { routes: [{ name: 'Home' }], index: 0 } }],
                  })
                )
              }
              style={styles.iconActionBtnItem}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#334155' }]}>
                <Icon name="home-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.iconActionLabel}>Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  animatedContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },

  compactSuccessHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  compactSuccessBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSuccessTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#166534',
  },
  compactSuccessSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },

  /* Ticket Pass Container */
  ticketCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* Top Gradient Banner */
  ticketHeaderGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1.1,
  },
  orderNumberText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  validStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  validStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Ticket Body */
  ticketBody: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.3)',
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  counterPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
  },
  counterText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  eventTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 23,
    marginBottom: 10,
  },

  /* 2-Column Grid */
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  gridItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  gridItemFull: {
    width: '100%',
    paddingTop: 2,
  },
  gridIcon: {
    marginTop: 1,
  },
  gridLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridSubVal: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },

  /* Seats Callout Box */
  seatsCallout: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seatsCalloutLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  seatsCalloutVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  seatsCalloutRight: {
    alignItems: 'flex-end',
  },
  seatsCalloutPrice: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#EA580C',
  },

  /* Physical Perforation with Inward Semi-circle Notches */
  perforationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    height: 30,
    marginVertical: 1,
  },
  notchLeft: {
    width: 10,
    height: 16,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: COLORS.bg,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: -1,
  },
  dashedDivider: {
    flex: 1,
    height: 0,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  notchRight: {
    width: 10,
    height: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    backgroundColor: COLORS.bg,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: -1,
  },

  /* QR Presentation Zone */
  qrContainer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  qrInnerBox: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  qrInstructions: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
    textAlign: 'center',
    marginBottom: 2,
  },
  qrSubInstructions: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  qrTicketCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },

  /* Security Trust Card */
  securityBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  securityTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
  },
  securityText: {
    fontSize: 9.5,
    color: '#64748B',
    lineHeight: 14,
  },

  /* ════════ SINGLE ROW ICON ACTION BAR ════════ */
  iconActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconActionBtnItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 4,
  },
  iconActionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
});
