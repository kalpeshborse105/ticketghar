import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { RADIUS, SHADOWS } from '../theme';
import {
  api,
  EventItem,
  OrderItem,
  SessionItem,
  canScanTickets,
  filterScannableSessions,
} from '../api';
import { useAuthStore } from '../store';
import QrCameraWebView from '../components/QrCameraWebView';

const PUBLIC_TICKET_BASE_URL = 'https://mahaticket.kalpkrutinfotech.com/tickets';

export function extractTicketCode(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const nested =
        parsed?.ticketCode ||
        parsed?.ticket_code ||
        parsed?.code ||
        parsed?.id ||
        parsed?.url;
      if (typeof nested === 'string' && nested.trim()) {
        return extractTicketCode(nested);
      }
    } catch { }
  }

  if (trimmed.includes('|') || /^MTSEC:/i.test(trimmed)) {
    const cleaned = trimmed.replace(/^MTSEC:/i, '');
    const firstPart = cleaned.split('|')[0]?.trim();
    if (firstPart) {
      const keyValMatch = firstPart.match(/(?:CODE|TICKET)[:=]([A-Za-z0-9_-]+)/i);
      if (keyValMatch?.[1]) return keyValMatch[1];
      if (/^[A-Za-z0-9_-]{4,}$/.test(firstPart)) return firstPart;
    }
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mahaticket://')) {
    try {
      const url = new URL(trimmed.replace(/^mahaticket:\/\//i, 'https://mahaticket.local/'));
      const queryCode =
        url.searchParams.get('ticketCode') ||
        url.searchParams.get('code') ||
        url.searchParams.get('ticket');
      if (queryCode) return queryCode.trim();

      const ticketsIndex = url.pathname.indexOf('/tickets/');
      if (ticketsIndex >= 0) {
        const code = url.pathname
          .slice(ticketsIndex + '/tickets/'.length)
          .split('/')[0];
        return decodeURIComponent(code).trim() || null;
      }
    } catch {
      const match = trimmed.match(/\/tickets\/([A-Za-z0-9_-]+)/i);
      if (match?.[1]) return match[1];
    }
  }

  return /^[A-Za-z0-9_-]{4,}$/.test(trimmed) ? trimmed : null;
}

export function resolveTicketUrl(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.pathname.includes('/tickets/') || url.pathname.includes('/my-tickets')) {
        return trimmed;
      }
    } catch { }
  }

  if (trimmed.startsWith('mahaticket://')) {
    return trimmed;
  }

  const ticketCode = extractTicketCode(trimmed);
  if (!ticketCode) return null;
  return `${PUBLIC_TICKET_BASE_URL}/${encodeURIComponent(ticketCode)}`;
}

interface ScanLog {
  id: string;
  code: string;
  attendeeName?: string;
  seatCode?: string;
  eventTitle?: string;
  email?: string;
  phone?: string;
  grandTotal?: number | null;
  paymentStatus?: string;
  orderNumber?: string;
  venue?: string;
  showtimeLabel?: string;
  status: 'valid' | 'already_used' | 'invalid';
  timestamp: string;
}

type ScannerTab = 'live' | 'manual' | 'recent';

export default function TicketScannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isOrganizerOrAdmin = canScanTickets(user?.role);

  const [ticketInput, setTicketInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [selectedGate, setSelectedGate] = useState<'GATE 1' | 'GATE 2' | 'VIP GATE'>('GATE 1');
  const [scannerEvents, setScannerEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [scannerTab, setScannerTab] = useState<ScannerTab>('live');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detailGuest, setDetailGuest] = useState<ScanLog | null>(null);
  const [lastResult, setLastResult] = useState<{
    valid: boolean;
    status: 'valid' | 'already_used' | 'invalid';
    message: string;
    ticket?: any;
    order?: any;
    guest?: any;
  } | null>(null);

  const selectedEvent = scannerEvents.find((e) => e.id === selectedEventId) || null;
  const scopedSessions: SessionItem[] = filterScannableSessions(
    selectedEvent?.sessions || []
  ) as SessionItem[];

  const resultScaleAnim = useRef(new Animated.Value(0.95)).current;

  const extractedPreviewCode = extractTicketCode(ticketInput);
  const resolvedTicketUrl = resolveTicketUrl(ticketInput);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (cameraActive) {
          setCameraActive(false);
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        navigation.navigate('Main', { screen: 'Profile' });
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => {
        sub.remove();
        setCameraActive(false);
      };
    }, [navigation, cameraActive])
  );

  useEffect(() => {
    if (isOrganizerOrAdmin) {
      api
        .getMyOrders()
        .then((d) => setRecentOrders(d.orders || []))
        .catch(() => null);
      api
        .getEvents({ limit: 80, includeEnded: true })
        .then((d) => {
          const list = d.events || [];
          setScannerEvents(list);
          // Do NOT auto-pick first event — gate must explicitly choose show (avoids wrong-scope scans)
          if (!list.length) {
            setSelectedEventId(null);
            setSelectedSessionId(null);
          }
        })
        .catch(() => null);
    } else {
      setRecentOrders([]);
      setScannerEvents([]);
    }
  }, [isOrganizerOrAdmin]);

  const handleOpenTicketLink = async (raw?: string) => {
    const url = resolveTicketUrl(raw || ticketInput);
    if (!url) {
      Toast.show({
        type: 'error',
        text1: 'अवैध लिंक (Invalid Ticket Link)',
        text2: 'कृपया वैध तिकीट कोड किंवा QR माहिती प्रविष्ट करा.',
      });
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'लिंक उघडता आली नाही',
        text2: 'कृपया वैध महाटिकिट URL तपासा.',
      });
    }
  };

  const handleMyTicketsAccess = () => {
    if (user) {
      navigation.navigate('Main', { screen: 'Tickets' });
      return;
    }
    navigation.navigate('Login');
  };

  const requestCameraAndStart = async () => {
    if (!selectedEventId || !selectedSessionId) {
      Toast.show({
        type: 'error',
        text1: 'शो निवडा',
        text2: 'कॅमेरा सुरू करण्यापूर्वी कार्यक्रम व वेळ निवडा.',
      });
      return;
    }
    setCameraError(null);
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'MahaTicket Camera',
            message: 'Gate QR स्कॅनसाठी कॅमेरा परवानगी आवश्यक आहे.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setCameraError('कॅमेरा परवानगी नाकारली. Settings मधून Allow करा.');
          setCameraActive(false);
          return;
        }
      } catch {
        setCameraError('कॅमेरा परवानगी मिळाली नाही.');
        return;
      }
    }
    setScannerTab('live');
    setCameraActive(true);
  };

  const openGuestDetail = (guest: ScanLog | null) => {
    if (!guest) return;
    setDetailGuest(guest);
  };

  const formatPaise = (paise?: number | null) => {
    if (paise == null || !Number.isFinite(Number(paise))) return '—';
    const n = Number(paise);
    const rupees = n > 15000 ? Math.round(n / 100) : Math.round(n);
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const handleVerify = async (rawToVerify?: string) => {
    const rawPayload = (rawToVerify ?? ticketInput).trim();
    if (!rawPayload) {
      Toast.show({
        type: 'error',
        text1: 'तिकीट कोड आवश्यक आहे (Code Required)',
        text2: 'कृपया QR कोड स्कॅन करा किंवा तिकीट क्रमांक टाका.',
      });
      return;
    }

    const cleanCode = extractTicketCode(rawPayload) || rawPayload;

    if (!isOrganizerOrAdmin) {
      Toast.show({
        type: 'info',
        text1: 'फक्त आयोजकांसाठी (Organizer Only)',
        text2: 'तिकीट पडताळणीसाठी आयोजक लॉगिन आवश्यक आहे.',
      });
      await handleOpenTicketLink(rawPayload);
      return;
    }

    if (!selectedEventId || !selectedSessionId) {
      Toast.show({
        type: 'error',
        text1: 'शो निवडा (Select show)',
        text2: 'स्कॅन करण्यापूर्वी कार्यक्रम व वेळ निवडा — फक्त त्या शोची तिकिटे पडताळली जातील.',
      });
      return;
    }

    setVerifying(true);
    try {
      const organizerId =
        Number((user as any)?.organizerId) ||
        Number(selectedEvent?.organizer?.id) ||
        undefined;
      const res = await api.verifyTicketScan(cleanCode, {
        targetEventId: selectedEventId,
        targetSessionId: selectedSessionId,
        scannerOrganizerId: organizerId,
        gateName: selectedGate,
        scannerUserId: user?.id,
      });
      setLastResult(res);

      if (res.status === 'valid') {
        Vibration.vibrate(80);
      } else {
        Vibration.vibrate([0, 90, 70, 90]);
      }

      resultScaleAnim.setValue(0.92);
      Animated.spring(resultScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();

      const log: ScanLog = {
        id: String(Date.now()),
        code: res.ticket?.ticketCode || cleanCode,
        attendeeName:
          res.ticket?.attendeeName || res.guest?.name || 'प्रेक्षक / Attendee',
        seatCode: res.ticket?.seatCode || 'General',
        eventTitle:
          res.ticket?.eventTitle ||
          res.order?.event?.titleMr ||
          res.order?.event?.title ||
          'मराठी नाट्यप्रयोग',
        email: res.ticket?.email || res.guest?.email,
        phone: res.ticket?.phone || res.guest?.phone,
        grandTotal: res.ticket?.grandTotal ?? res.guest?.grandTotal,
        paymentStatus: res.ticket?.paymentStatus || res.guest?.paymentStatus,
        orderNumber: res.ticket?.orderNumber || res.guest?.orderNumber,
        venue: res.ticket?.venue,
        showtimeLabel: res.ticket?.showtimeLabel,
        status: res.status,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
      setScanLogs((prev) => [log, ...prev]);
      setTicketInput('');
      // Keep valid result visible so staff can tap name → full guest details
      setTimeout(() => setLastResult(null), res.status === 'valid' ? 4200 : 1600);
    } catch (e: any) {
      Vibration.vibrate([0, 120, 80, 120]);
      setLastResult({
        valid: false,
        status: 'invalid',
        message: e?.message || 'हे तिकीट प्रणालीमध्ये सापडले नाही (Ticket not found).',
      });
      Toast.show({
        type: 'error',
        text1: 'पडताळणी अयशस्वी (Scan Failed)',
        text2: e?.message || 'तिकीट कोड तपासून पुन्हा प्रयत्न करा.',
      });
      setTimeout(() => setLastResult(null), 1100);
    } finally {
      setVerifying(false);
    }
  };

  const validCount = scanLogs.filter((l) => l.status === 'valid').length;
  const duplicateCount = scanLogs.filter((l) => l.status === 'already_used').length;
  const invalidCount = scanLogs.filter((l) => l.status === 'invalid').length;

  if (!isOrganizerOrAdmin) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.topHeaderBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtnCircle}
            activeOpacity={0.75}
          >
            <Icon name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitleText}>QR Ticket Lookup</Text>
            <Text style={styles.headerSubText}>तिकीट पडताळणी व माहिती</Text>
          </View>
          <View style={styles.roleLockPill}>
            <Icon name="shield-lock-outline" size={13} color="#EA580C" />
            <Text style={styles.roleLockPillText}>GUEST VIEW</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.lockScrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.lockCardLight}>
            <View style={styles.shieldIconCircle}>
              <Icon name="qrcode-scan" size={38} color="#EA580C" />
            </View>

            <View style={styles.organizerOnlyTag}>
              <Text style={styles.organizerOnlyTagText}>
                फक्त आयोजक किंवा गेट ऑपरेटर • ORGANIZER ACCESS
              </Text>
            </View>

            <Text style={styles.lockTitleDark}>Gate Entry Validation Locked</Text>
            <Text style={styles.lockDescDark}>
              अधिकृत प्रवेशद्वार पडताळणी (Gate Check-In) फक्त आयोजक किंवा प्रशासक खात्यांसाठीच उपलब्ध आहे.
              परंतु तुम्ही खालील बॉक्समध्ये तुमचा तिकीट कोड किंवा QR लिंक टाकून तुमचे डिजिटल तिकीट पाहू शकता.
            </Text>

            <View style={styles.lookupInputContainer}>
              <View style={styles.lookupInputHeader}>
                <Icon name="ticket-confirmation-outline" size={16} color="#EA580C" />
                <Text style={styles.lookupInputLabel}>
                  तिकीट कोड किंवा QR Payload पेस्ट करा
                </Text>
                {ticketInput.length > 0 && (
                  <TouchableOpacity onPress={() => setTicketInput('')}>
                    <Text style={styles.clearLinkText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.lookupTextInput}
                placeholder="उदा. TG-TK-84920 किंवा https://mahaticket..."
                placeholderTextColor="#94A3B8"
                value={ticketInput}
                onChangeText={setTicketInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {extractedPreviewCode && (
                <View style={styles.detectedCodeChip}>
                  <Icon name="check-decagram" size={14} color="#16A34A" />
                  <Text style={styles.detectedCodeText}>
                    Detected Ticket Code:{' '}
                    <Text style={{ fontWeight: '900' }}>{extractedPreviewCode}</Text>
                  </Text>
                </View>
              )}

              {resolvedTicketUrl && (
                <View style={styles.urlPreviewBanner}>
                  <Icon name="link-variant" size={14} color="#EA580C" />
                  <Text style={styles.urlPreviewText} numberOfLines={1}>
                    {resolvedTicketUrl}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleOpenTicketLink()}
              activeOpacity={0.85}
              style={styles.primarySaffronBtn}
            >
              <Icon name="open-in-new" size={18} color="#FFFFFF" />
              <Text style={styles.primarySaffronBtnText}>
                डिजिटल तिकीट उघडा (Open Ticket Pass)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMyTicketsAccess}
              activeOpacity={0.8}
              style={styles.secondaryOutlineBtn}
            >
              <Icon
                name={user ? 'ticket-account' : 'login'}
                size={18}
                color="#EA580C"
              />
              <Text style={styles.secondaryOutlineBtnText}>
                {user
                  ? 'माझी तिकिटे पहा (Open My Tickets)'
                  : 'लॉगिन करा (Sign In for Organizer / Tickets)'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtnCircle}
          activeOpacity={0.75}
        >
          <Icon name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitleText}>Gate QR Scanner</Text>
          <Text style={styles.headerSubText}>प्रवेशद्वार तिकीट पडताळणी • Live Check-In</Text>
        </View>

        <View style={styles.liveScannerBadge}>
          <View style={styles.liveGreenDot} />
          <Text style={styles.liveScannerBadgeText}>ORGANIZER</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        <View style={styles.gateSelectorStrip}>
          {(['GATE 1', 'GATE 2', 'VIP GATE'] as const).map((gate) => {
            const active = selectedGate === gate;
            return (
              <TouchableOpacity
                key={gate}
                onPress={() => setSelectedGate(gate)}
                activeOpacity={0.8}
                style={[styles.gatePill, active && styles.gatePillActive]}
              >
                <Icon
                  name="boom-gate-outline"
                  size={14}
                  color={active ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.gatePillText, active && styles.gatePillTextActive]}>
                  {gate}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scope: only tickets for this event + showtime are accepted */}
        <View style={styles.scopeCard}>
          <Text style={styles.scopeTitle}>स्कॅन स्कोप (Event & Show)</Text>
          <Text style={styles.scopeHint}>
            फक्त निवडलेल्या कार्यक्रमाच्या व वेळेच्या तिकिटांची पडताळणी होईल — इतर शोचे QR नाकारले जातील.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeChipRow}>
            {scannerEvents.slice(0, 12).map((ev) => {
              const active = ev.id === selectedEventId;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.scopeChip, active && styles.scopeChipActive]}
                  onPress={() => {
                    setSelectedEventId(ev.id);
                    const sess =
                      filterScannableSessions(ev.sessions || [])[0] || ev.sessions?.[0];
                    setSelectedSessionId(sess?.id || null);
                  }}
                >
                  <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]} numberOfLines={1}>
                    {ev.titleMr || ev.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeChipRow}>
            {scopedSessions.map((s) => {
              const active = s.id === selectedSessionId;
              const label = new Date(s.sessionStartTime).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.scopeChip, active && styles.scopeChipActive]}
                  onPress={() => setSelectedSessionId(s.id)}
                >
                  <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, styles.statBoxTotal]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Icon name="qrcode-scan" size={18} color="#EA580C" />
            </View>
            <Text style={styles.statNum}>{scanLogs.length}</Text>
            <Text style={styles.statLabel}>एकूण स्कॅन (Total)</Text>
          </View>

          <View style={[styles.statBox, styles.statBoxValid]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="check-decagram" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.statNum, { color: '#16A34A' }]}>{validCount}</Text>
            <Text style={styles.statLabel}>प्रवेश मंजूर (Valid)</Text>
          </View>

          <View style={[styles.statBox, styles.statBoxWarn]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <Icon name="alert-octagon-outline" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.statNum, { color: '#DC2626' }]}>
              {duplicateCount + invalidCount}
            </Text>
            <Text style={styles.statLabel}>नाकारले (Rejected)</Text>
          </View>
        </View>

        <View style={styles.fastGateCard}>
          <View style={styles.viewfinderTopTag}>
            <Icon name="shield-check" size={14} color="#EA580C" />
            <Text style={styles.viewfinderTopTagText}>
              FastGate • {selectedGate}
            </Text>
          </View>

          <View style={styles.tabRow}>
            {([
              { id: 'live' as const, label: 'कॅमेरा', icon: 'camera' },
              { id: 'manual' as const, label: 'मॅन्युअल', icon: 'keyboard-outline' },
              { id: 'recent' as const, label: 'अलीकडील', icon: 'history' },
            ]).map((tab) => {
              const active = scannerTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  onPress={() => {
                    setScannerTab(tab.id);
                    if (tab.id !== 'live') setCameraActive(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Icon name={tab.icon} size={14} color={active ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {scannerTab === 'live' ? (
            <View style={styles.cameraPane}>
              {cameraActive ? (
                <QrCameraWebView
                  active={cameraActive && !verifying}
                  onScan={(code) => {
                    if (!verifying) handleVerify(code);
                  }}
                  onError={(msg) => {
                    setCameraError(msg);
                    setCameraActive(false);
                  }}
                />
              ) : (
                <View style={styles.cameraIdle}>
                  <Icon name="camera" size={40} color="#EA580C" />
                  <Text style={styles.cameraIdleTitle}>कॅमेरा बंद आहे</Text>
                  <Text style={styles.cameraIdleSub}>
                    तिकीट तपासण्यासाठी कॅमेरा सुरू करा — नाव + आसन पडताळणी
                  </Text>
                  {cameraError ? (
                    <Text style={styles.cameraErrorText}>{cameraError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.startCameraBtn}
                    onPress={requestCameraAndStart}
                    activeOpacity={0.85}
                  >
                    <Icon name="camera" size={16} color="#FFFFFF" />
                    <Text style={styles.startCameraBtnText}>कॅमेरा सुरू करा</Text>
                  </TouchableOpacity>
                </View>
              )}

              {cameraActive ? (
                <TouchableOpacity
                  style={styles.stopCameraFab}
                  onPress={() => setCameraActive(false)}
                >
                  <Icon name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {scannerTab === 'manual' ? (
            <View style={styles.manualPane}>
              <Text style={styles.viewfinderTitle}>मॅन्युअल कोड पडताळणी</Text>
              <Text style={styles.viewfinderSub}>
                QR अयशस्वी झाल्यास तिकीट / ऑर्डर कोड टाका
              </Text>
              <View style={styles.scannerInputContainer}>
                <View style={styles.scannerInputBox}>
                  <Icon name="barcode-scan" size={20} color="#EA580C" />
                  <TextInput
                    style={styles.scannerTextInput}
                    placeholder="e.g. TG-TK-84920 or MT-2026-…"
                    placeholderTextColor="#94A3B8"
                    value={ticketInput}
                    onChangeText={setTicketInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={() => handleVerify()}
                  />
                  {ticketInput.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setTicketInput('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleVerify()}
                  disabled={verifying}
                  activeOpacity={0.85}
                  style={[styles.verifyBtn, verifying && { opacity: 0.7 }]}
                >
                  {verifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="check-bold" size={16} color="#FFFFFF" />
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {extractedPreviewCode && extractedPreviewCode !== ticketInput.trim() && (
                <View style={styles.parsedCodeNotice}>
                  <Icon name="flash-outline" size={13} color="#EA580C" />
                  <Text style={styles.parsedCodeNoticeText}>
                    Ready: <Text style={{ fontWeight: '900' }}>{extractedPreviewCode}</Text>
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {scannerTab === 'recent' ? (
            <View style={styles.manualPane}>
              {scanLogs.length === 0 ? (
                <Text style={styles.emptyRecentText}>अद्याप स्कॅन नाही</Text>
              ) : (
                scanLogs.slice(0, 12).map((log) => (
                  <TouchableOpacity
                    key={`recent-${log.id}`}
                    style={styles.recentRow}
                    onPress={() => openGuestDetail(log)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentName} numberOfLines={1}>
                        {log.attendeeName}
                      </Text>
                      <Text style={styles.recentMeta} numberOfLines={1}>
                        {log.seatCode} · {log.timestamp}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: 11,
                        color:
                          log.status === 'valid'
                            ? '#16A34A'
                            : log.status === 'already_used'
                              ? '#D97706'
                              : '#DC2626',
                      }}
                    >
                      {log.status === 'valid' ? 'OK' : 'DENY'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}
        </View>

        {lastResult && (
          <Animated.View
            style={[
              styles.verdictCard,
              lastResult.status === 'valid'
                ? styles.verdictCardValid
                : lastResult.status === 'already_used'
                  ? styles.verdictCardDuplicate
                  : styles.verdictCardInvalid,
              { transform: [{ scale: resultScaleAnim }] },
            ]}
          >
            <View style={styles.verdictTopRow}>
              <View
                style={[
                  styles.verdictIconBadge,
                  {
                    backgroundColor:
                      lastResult.status === 'valid'
                        ? '#16A34A'
                        : lastResult.status === 'already_used'
                          ? '#D97706'
                          : '#DC2626',
                  },
                ]}
              >
                <Icon
                  name={
                    lastResult.status === 'valid'
                      ? 'check-bold'
                      : lastResult.status === 'already_used'
                        ? 'history'
                        : 'close-thick'
                  }
                  size={24}
                  color="#FFFFFF"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.verdictStatusTitle,
                    {
                      color:
                        lastResult.status === 'valid'
                          ? '#15803D'
                          : lastResult.status === 'already_used'
                            ? '#B45309'
                            : '#B91C1C',
                    },
                  ]}
                >
                  {lastResult.status === 'valid'
                    ? 'प्रवेश मंजूर • ENTRY GRANTED'
                    : lastResult.status === 'already_used'
                      ? 'आधीच वापरले आहे • ALREADY SCANNED'
                      : 'अवैध तिकीट • INVALID PASS'}
                </Text>
                <Text style={styles.verdictMessageText}>{lastResult.message}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setLastResult(null)}
                style={styles.dismissVerdictBtn}
              >
                <Icon name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {lastResult.ticket && (
              <View style={styles.verdictTicketStub}>
                <View style={styles.verdictStubCol}>
                  <Text style={styles.verdictStubLabel}>आसन / SEAT</Text>
                  <Text style={styles.verdictStubSeat}>
                    {lastResult.ticket.seatCode || 'General'}
                  </Text>
                </View>

                <View style={styles.verdictStubDivider} />

                <TouchableOpacity
                  style={[styles.verdictStubCol, { flex: 1.5 }]}
                  onPress={() =>
                    openGuestDetail({
                      id: 'live',
                      code: lastResult.ticket.ticketCode,
                      attendeeName: lastResult.ticket.attendeeName,
                      seatCode: lastResult.ticket.seatCode,
                      email: lastResult.ticket.email || lastResult.guest?.email,
                      phone: lastResult.ticket.phone || lastResult.guest?.phone,
                      grandTotal:
                        lastResult.ticket.grandTotal ?? lastResult.guest?.grandTotal,
                      paymentStatus:
                        lastResult.ticket.paymentStatus ||
                        lastResult.guest?.paymentStatus,
                      orderNumber:
                        lastResult.ticket.orderNumber || lastResult.guest?.orderNumber,
                      eventTitle: lastResult.ticket.eventTitle,
                      venue: lastResult.ticket.venue,
                      showtimeLabel: lastResult.ticket.showtimeLabel,
                      status: lastResult.status,
                      timestamp: '',
                    })
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.verdictStubLabel}>नाव टॅप → डिटेल्स</Text>
                  <Text style={[styles.verdictStubValue, { color: '#EA580C' }]} numberOfLines={1}>
                    {lastResult.ticket.attendeeName || 'Guest Attendee'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.verdictStubDivider} />

                <View style={[styles.verdictStubCol, { flex: 1.2 }]}>
                  <Text style={styles.verdictStubLabel}>तिकीट कोड</Text>
                  <Text style={styles.verdictStubCode} numberOfLines={1}>
                    {lastResult.ticket.ticketCode}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {recentOrders.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionHeaderTitle}>
                  Quick Test Passes (तपासणीसाठी तिकिटे)
                </Text>
              </View>
              <Text style={styles.sectionCountPill}>Tap to Scan</Text>
            </View>

            {recentOrders.slice(0, 3).map((ord) => (
              <View key={ord.id} style={styles.quickOrderItem}>
                <View style={styles.quickOrderHeader}>
                  <Text style={styles.quickOrderTitle} numberOfLines={1}>
                    {ord.event?.titleMr || ord.event?.title || 'मराठी नाटक'}
                  </Text>
                  <Text style={styles.quickOrderNumber}>#{ord.orderNumber}</Text>
                </View>

                <View style={styles.quickTicketsWrap}>
                  {ord.tickets?.map((t) => {
                    const isUsed = t.status === 'used';
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => handleVerify(t.ticketCode)}
                        activeOpacity={0.8}
                        style={[
                          styles.quickTicketChip,
                          isUsed && styles.quickTicketChipUsed,
                        ]}
                      >
                        <Icon
                          name={isUsed ? 'check-circle' : 'qrcode-scan'}
                          size={14}
                          color={isUsed ? '#64748B' : '#EA580C'}
                        />
                        <Text
                          style={[
                            styles.quickTicketChipText,
                            isUsed && styles.quickTicketChipTextUsed,
                          ]}
                        >
                          {t.seatCode} • {t.ticketCode.slice(-6)}
                        </Text>
                        {isUsed && <Text style={styles.usedMiniTag}>USED</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionHeaderTitle}>
                Live Gate Entry Log (प्रवेश नोंदवही)
              </Text>
            </View>
            {scanLogs.length > 0 && (
              <TouchableOpacity onPress={() => setScanLogs([])}>
                <Text style={styles.clearLogText}>Clear Log</Text>
              </TouchableOpacity>
            )}
          </View>

          {scanLogs.length === 0 ? (
            <View style={styles.emptyLogBox}>
              <Icon name="clipboard-text-clock-outline" size={32} color="#CBD5E1" />
              <Text style={styles.emptyLogTitle}>अद्याप कोणतेही तिकीट स्कॅन केलेले नाही</Text>
              <Text style={styles.emptyLogSub}>
                Scanned passes at {selectedGate} will appear here in real time.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {scanLogs.map((log) => {
                const isValid = log.status === 'valid';
                const isDup = log.status === 'already_used';
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.logItemCard}
                    onPress={() => openGuestDetail(log)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.logStatusIcon,
                        {
                          backgroundColor: isValid
                            ? '#ECFDF5'
                            : isDup
                              ? '#FFFBEB'
                              : '#FEF2F2',
                        },
                      ]}
                    >
                      <Icon
                        name={
                          isValid
                            ? 'check-circle'
                            : isDup
                              ? 'alert-circle'
                              : 'close-circle'
                        }
                        size={20}
                        color={isValid ? '#16A34A' : isDup ? '#D97706' : '#DC2626'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.logTopLine}>
                        <Text style={styles.logSeatBadge}>Seat {log.seatCode}</Text>
                        <Text style={styles.logCodeText}>{log.code}</Text>
                      </View>
                      <Text style={[styles.logSubText, { color: '#EA580C', fontWeight: '800' }]} numberOfLines={1}>
                        {log.attendeeName} • टॅप डिटेल्स
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.logStatusPillText,
                          {
                            color: isValid
                              ? '#16A34A'
                              : isDup
                                ? '#D97706'
                                : '#DC2626',
                          },
                        ]}
                      >
                        {isValid ? 'ADMITTED' : isDup ? 'DUPLICATE' : 'INVALID'}
                      </Text>
                      <Text style={styles.logTimeText}>{log.timestamp}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!detailGuest}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailGuest(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>प्रेक्षक तपशील</Text>
              <TouchableOpacity onPress={() => setDetailGuest(null)} hitSlop={12}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailName}>{detailGuest?.attendeeName || '—'}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>आसन / Seat</Text>
              <Text style={styles.detailValue}>{detailGuest?.seatCode || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>मोबाईल</Text>
              <Text style={styles.detailValue}>{detailGuest?.phone || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ईमेल</Text>
              <Text style={styles.detailValue}>{detailGuest?.email || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>पेमेंट</Text>
              <Text style={styles.detailValue}>
                {formatPaise(detailGuest?.grandTotal)}
                {detailGuest?.paymentStatus ? ` · ${detailGuest.paymentStatus}` : ''}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ऑर्डर</Text>
              <Text style={styles.detailValue}>
                {detailGuest?.orderNumber || detailGuest?.code || '—'}
              </Text>
            </View>
            {detailGuest?.eventTitle ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>कार्यक्रम</Text>
                <Text style={styles.detailValue}>{detailGuest.eventTitle}</Text>
              </View>
            ) : null}
            {detailGuest?.venue ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>सभागृह</Text>
                <Text style={styles.detailValue}>{detailGuest.venue}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => setDetailGuest(null)}
            >
              <Text style={styles.detailCloseBtnText}>ठीक आहे</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    padding: 16,
    gap: 14,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  liveScannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveScannerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  roleLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  roleLockPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
  },
  gateSelectorStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  gatePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    borderRadius: 12,
  },
  gatePillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  gatePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  gatePillTextActive: {
    color: '#FFFFFF',
  },
  scopeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  scopeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  scopeHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 16,
  },
  scopeChipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  scopeChip: {
    maxWidth: 200,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  scopeChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  scopeChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  scopeChipTextActive: {
    color: '#C2410C',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.sm,
  },
  statBoxTotal: { borderColor: '#FED7AA' },
  statBoxValid: { borderColor: '#BBF7D0' },
  statBoxWarn: { borderColor: '#FECACA' },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  viewfinderCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  fastGateCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  cameraPane: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    position: 'relative',
  },
  cameraIdle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  cameraIdleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cameraIdleSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  cameraErrorText: {
    color: '#FCA5A5',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  startCameraBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  startCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  stopCameraFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualPane: {
    paddingTop: 4,
    gap: 8,
  },
  emptyRecentText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 24,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  recentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailCloseBtn: {
    marginTop: 14,
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  detailCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  viewfinderTopTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  viewfinderTopTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  reticleOuterFrame: {
    width: 124,
    height: 124,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cornerBracket: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#EA580C',
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  animatedLaserLine: {
    position: 'absolute',
    width: '82%',
    height: 2.5,
    backgroundColor: '#EA580C',
    borderRadius: 2,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  viewfinderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  viewfinderSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 14,
  },
  scannerInputContainer: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  scannerInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  scannerTextInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  parsedCodeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  parsedCodeNoticeText: {
    fontSize: 11.5,
    color: '#9A3412',
    fontWeight: '600',
  },
  verdictCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    gap: 12,
    ...SHADOWS.md,
  },
  verdictCardValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  verdictCardDuplicate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  verdictCardInvalid: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  verdictTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verdictIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictStatusTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  verdictMessageText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  dismissVerdictBtn: {
    padding: 4,
  },
  verdictTicketStub: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verdictStubCol: {
    flex: 1,
    alignItems: 'center',
  },
  verdictStubDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  verdictStubLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  verdictStubSeat: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA580C',
  },
  verdictStubValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  verdictStubCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    fontFamily: 'monospace',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...SHADOWS.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#EA580C',
  },
  sectionHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionCountPill: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearLogText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  quickOrderItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  quickOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickOrderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  quickOrderNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'monospace',
  },
  quickTicketsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTicketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickTicketChipUsed: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  quickTicketChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  quickTicketChipTextUsed: {
    color: '#64748B',
  },
  usedMiniTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  emptyLogBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyLogTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  emptyLogSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  logItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logSeatBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EA580C',
  },
  logCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  logSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  logStatusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  logTimeText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
  },
  lockScrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  lockCardLight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  shieldIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  organizerOnlyTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 8,
  },
  organizerOnlyTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.4,
  },
  lockTitleDark: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  lockDescDark: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  lookupInputContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  lookupInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lookupInputLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  clearLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  lookupTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  detectedCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detectedCodeText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
  },
  urlPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  urlPreviewText: {
    fontSize: 11.5,
    color: '#9A3412',
    flex: 1,
    fontWeight: '600',
  },
  primarySaffronBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  primarySaffronBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryOutlineBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryOutlineBtnText: {
    color: '#EA580C',
    fontSize: 13.5,
    fontWeight: '800',
  },
});