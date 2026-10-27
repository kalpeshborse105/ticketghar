/**
 * Organizer FastGate — native VisionCamera gate scanner (theater / BookMyShow style).
 * Scope lock (event + show) → live native QR decode → POST /api/scanner/verify.
 * WebView/html5-qrcode path removed from organizer flow.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
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
import {
  api,
  EventItem,
  SessionItem,
  canScanTickets,
  filterScannableSessions,
} from '../api';
import { useAuthStore } from '../store';
import GateQrScanner from '../components/GateQrScanner';
import { extractTicketCode } from '../lib/ticketCode';

type Tab = 'live' | 'manual' | 'recent';

type ScanRow = {
  id: string;
  code: string;
  attendeeName: string;
  seatCode: string;
  email?: string;
  phone?: string;
  grandTotal?: number | null;
  paymentStatus?: string;
  orderNumber?: string;
  eventTitle?: string;
  venue?: string;
  status: 'valid' | 'already_used' | 'invalid';
  timestamp: string;
  valid: boolean;
  seatCount?: number;
};

type Overlay = {
  valid: boolean;
  status: 'valid' | 'already_used' | 'invalid';
  message: string;
  ticket?: any;
  guest?: any;
  scanResult?: string;
  totalSeats?: number;
  seatCodes?: string[];
};

function formatPaise(paise?: number | null) {
  if (paise == null || !Number.isFinite(Number(paise))) return '—';
  const n = Number(paise);
  const rupees = n > 15000 ? Math.round(n / 100) : Math.round(n);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export default function OrganizerFastGateScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const allowed = canScanTickets(user?.role);

  const [gateName, setGateName] = useState('GATE 1');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('live');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [recent, setRecent] = useState<ScanRow[]>([]);
  const [detail, setDetail] = useState<ScanRow | null>(null);

  const verifyingRef = useRef(false);
  const overlayRef = useRef(false);
  const eventIdRef = useRef(eventId);
  const sessionIdRef = useRef(sessionId);
  const gateRef = useRef(gateName);

  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    gateRef.current = gateName;
  }, [gateName]);
  useEffect(() => {
    overlayRef.current = !!overlay;
  }, [overlay]);

  const selectedEvent = events.find((e) => e.id === eventId) || null;
  const sessions = filterScannableSessions(selectedEvent?.sessions || []) as SessionItem[];
  const scopeReady = !!(eventId && sessionId);

  const metrics = {
    // Party QR: count seats admitted, not just scan flashes
    valid: recent
      .filter((r) => r.status === 'valid')
      .reduce((sum, r) => sum + (r.seatCount && r.seatCount > 0 ? r.seatCount : 1), 0),
    duplicate: recent.filter((r) => r.status === 'already_used').length,
    rejected: recent.filter((r) => r.status === 'invalid').length,
    total: recent.length,
  };

  // Keep camera alive across MIUI privacy-indicator focus blips.
  // Only stop camera on real Back / leaving scanner (not useFocusEffect cleanup).
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
      };
    }, [navigation, cameraActive])
  );

  useEffect(() => {
    const unsub = navigation.addListener?.('beforeRemove', () => {
      setCameraActive(false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [navigation]);

  useEffect(() => {
    if (!allowed) return;
    api
      .getEvents({ limit: 80, includeEnded: true })
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]));
  }, [allowed]);

  useEffect(() => {
    if (scopeReady) setScopeOpen(false);
  }, [scopeReady]);

  /** Theater gate: after event+show lock, open native camera on Camera tab */
  const startNativeCamera = useCallback(() => {
    if (!scopeReady) {
      Toast.show({
        type: 'error',
        text1: 'शो निवडा',
        text2: 'आधी कार्यक्रम + शो वेळ निवडा, मग कॅमेरा.',
      });
      setScopeOpen(true);
      return;
    }
    setCameraError(null);
    setTab('live');
    setCameraActive(true);
  }, [scopeReady]);

  // Auto-arm once after scope lock (do not fight user stop / permission errors)
  const autoArmedRef = useRef(false);
  useEffect(() => {
    if (!scopeReady) {
      autoArmedRef.current = false;
      return;
    }
    if (autoArmedRef.current || cameraError || tab !== 'live') return;
    autoArmedRef.current = true;
    setCameraActive(true);
  }, [scopeReady, tab, cameraError]);

  const verifyCode = async (raw: string) => {
    if (verifyingRef.current || overlayRef.current) return;
    const payload = (raw || '').trim();
    if (!payload) return;

    const eid = eventIdRef.current;
    const sid = sessionIdRef.current;
    if (!eid || !sid) {
      Toast.show({
        type: 'error',
        text1: 'शो निवडा',
        text2: 'स्कॅनपूर्वी कार्यक्रम व वेळ निवडा.',
      });
      setScopeOpen(true);
      return;
    }

    verifyingRef.current = true;
    setVerifying(true);
    const clean = extractTicketCode(payload) || payload;

    try {
      const organizerId =
        Number((user as any)?.organizerId) ||
        Number(selectedEvent?.organizer?.id) ||
        undefined;
      const res = await api.verifyTicketScan(clean, {
        targetEventId: eid,
        targetSessionId: sid,
        scannerOrganizerId: organizerId,
        gateName: gateRef.current,
        scannerUserId: user?.id,
      });

      try {
        if (res.status === 'valid') Vibration.vibrate(80);
        else if (res.status === 'already_used') Vibration.vibrate([0, 120, 80, 120]);
        else Vibration.vibrate([0, 90, 70, 90]);
      } catch {
        /* MIUI may deny vibrate without crashing scan flow */
      }

      const seatCount =
        Number(res.totalSeats) ||
        (Array.isArray(res.seatCodes) ? res.seatCodes.length : 0) ||
        1;
      const seatsLabel =
        (Array.isArray(res.seatCodes) && res.seatCodes.length
          ? res.seatCodes.join(', ')
          : null) ||
        res.ticket?.seats ||
        res.ticket?.seatCode ||
        '—';

      const row: ScanRow = {
        id: String(Date.now()),
        code: res.ticket?.ticketCode || clean,
        attendeeName: res.ticket?.attendeeName || res.guest?.name || 'प्रेक्षक',
        seatCode: seatsLabel,
        email: res.ticket?.email || res.guest?.email,
        phone: res.ticket?.phone || res.guest?.phone,
        grandTotal: res.ticket?.grandTotal ?? res.guest?.grandTotal,
        paymentStatus: res.ticket?.paymentStatus || res.guest?.paymentStatus,
        orderNumber: res.ticket?.orderNumber || res.guest?.orderNumber,
        eventTitle: res.ticket?.eventTitle,
        venue: res.ticket?.venue,
        status: res.status,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        valid: !!res.valid,
        seatCount: res.status === 'valid' ? seatCount : undefined,
      };
      setRecent((prev) => [row, ...prev].slice(0, 40));
      setOverlay({
        valid: !!res.valid,
        status: res.status,
        message: res.message,
        ticket: res.ticket
          ? { ...res.ticket, seatCode: seatsLabel, seats: seatsLabel }
          : res.ticket,
        guest: res.guest,
        scanResult: res.scanResult,
        totalSeats: seatCount,
        seatCodes: res.seatCodes,
      });

      // Wrong show/event → reopen scope so staff picks the ticket's theater + time
      if (
        !res.valid &&
        (res.scanResult === 'WRONG_SESSION' || res.scanResult === 'WRONG_EVENT')
      ) {
        setScopeOpen(true);
        setCameraActive(false);
      }

      setManualCode('');
      setTimeout(() => {
        setOverlay(null);
        verifyingRef.current = false;
      }, res.status === 'valid' ? 2400 : res.status === 'already_used' ? 2000 : 1800);
    } catch (e: any) {
      try {
        Vibration.vibrate([0, 120, 80, 120]);
      } catch {
        /* ignore vibrate */
      }
      setOverlay({
        valid: false,
        status: 'invalid',
        message: e?.message || 'तिकीट सापडले नाही',
      });
      setTimeout(() => {
        setOverlay(null);
        verifyingRef.current = false;
      }, 1600);
    } finally {
      setVerifying(false);
    }
  };

  const showLabel = (() => {
    const s = sessions.find((x) => x.id === sessionId);
    if (!s?.sessionStartTime) return '';
    return new Date(s.sessionStartTime).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  })();

  if (!allowed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: 'center', padding: 24 }]}>
        <Text style={styles.denyTitle}>फक्त आयोजक / स्कॅनर</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>मागे</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#141B2B" />

      {/* Header — web FastGate */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={10}>
          <Icon name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.brand}>FastGate</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Gate Scanner
          </Text>
        </View>
        <View style={styles.metricsPill}>
          <Text style={[styles.metric, { color: '#34D399' }]}>{metrics.valid}✓</Text>
          <Text style={[styles.metric, { color: '#FCD34D' }]}>{metrics.duplicate}↻</Text>
          <Text style={[styles.metric, { color: '#FB7185' }]}>{metrics.rejected}✗</Text>
        </View>
      </View>

      {/* Scope */}
      <TouchableOpacity style={styles.scopeBar} onPress={() => setScopeOpen((v) => !v)} activeOpacity={0.85}>
        <View style={[styles.scopeDot, { backgroundColor: scopeReady ? '#34D399' : '#FBBF24' }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.scopeTitle} numberOfLines={1}>
            {selectedEvent?.titleMr || selectedEvent?.title || 'कार्यक्रम निवडा'}
          </Text>
          <Text style={styles.scopeSub} numberOfLines={1}>
            {showLabel || 'शो वेळ निवडा'} · {gateName}
          </Text>
        </View>
        <Text style={styles.scopeToggle}>{scopeOpen ? 'लपवा' : 'बदला'}</Text>
      </TouchableOpacity>

      {scopeOpen ? (
        <View style={styles.scopeBody}>
          <Text style={styles.fieldLabel}>Gate</Text>
          <View style={styles.chipRow}>
            {(['GATE 1', 'GATE 2', 'VIP GATE'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gateName === g && styles.chipActive]}
                onPress={() => setGateName(g)}
              >
                <Text style={[styles.chipText, gateName === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Event</Text>
          <View style={styles.chipWrap}>
            {events.slice(0, 16).map((ev) => {
              const on = ev.id === eventId;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.chip, on && styles.chipActive]}
                  onPress={() => {
                    setEventId(ev.id);
                    const first =
                      filterScannableSessions(ev.sessions || [])[0] || ev.sessions?.[0];
                    setSessionId(first?.id || null);
                    setCameraActive(false);
                  }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]} numberOfLines={1}>
                    {ev.titleMr || ev.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Show time</Text>
          <View style={styles.chipWrap}>
            {sessions.map((s) => {
              const on = s.id === sessionId;
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
                  style={[styles.chip, on && styles.chipActive]}
                  onPress={() => {
                    setSessionId(s.id);
                    setCameraActive(false);
                  }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!scopeReady ? (
            <Text style={styles.warn}>स्कॅनपूर्वी कार्यक्रम + शो वेळ लॉक करा.</Text>
          ) : null}
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(
          [
            { id: 'live' as const, label: 'Camera', icon: 'qrcode-scan' },
            { id: 'manual' as const, label: 'Entry', icon: 'keyboard-outline' },
            { id: 'recent' as const, label: `Recent (${metrics.total})`, icon: 'history' },
          ] as const
        ).map((t) => {
          const on = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, on && styles.tabActive]}
              onPress={() => {
                setTab(t.id);
                if (t.id !== 'live') setCameraActive(false);
              }}
            >
              <Icon name={t.icon} size={14} color={on ? '#FFFFFF' : '#CBD5E1'} />
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main pane — flex fill, no ScrollView around camera */}
      <View style={styles.main}>
        {tab === 'live' ? (
          <View style={styles.cameraBox}>
            {cameraActive && scopeReady ? (
              <GateQrScanner
                active={cameraActive && tab === 'live'}
                locked={verifying || !!overlay}
                onScan={(code) => {
                  if (!verifyingRef.current) void verifyCode(code);
                }}
                onError={(msg) => {
                  setCameraError(msg);
                  setCameraActive(false);
                  Toast.show({ type: 'error', text1: 'कॅमेरा', text2: msg });
                }}
              />
            ) : (
              <View style={styles.cameraIdle}>
                <Icon name="qrcode-scan" size={42} color="#EA580C" />
                <Text style={styles.idleTitle}>Native Gate Scanner</Text>
                <Text style={styles.idleSub}>
                  कार्यक्रम + शो लॉक करा → QR दूरून स्कॅन (VisionCamera)
                </Text>
                {cameraError ? <Text style={styles.err}>{cameraError}</Text> : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, !scopeReady && { opacity: 0.45 }]}
                  onPress={startNativeCamera}
                >
                  <Icon name="camera" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>कॅमेरा सुरू करा</Text>
                </TouchableOpacity>
              </View>
            )}

            {overlay ? (
              <TouchableOpacity
                style={[
                  styles.overlay,
                  {
                    backgroundColor: overlay.valid
                      ? 'rgba(5,150,105,0.95)'
                      : overlay.status === 'already_used'
                        ? 'rgba(180,83,9,0.95)'
                        : 'rgba(190,24,93,0.95)',
                  },
                ]}
                activeOpacity={0.95}
                onPress={() => {
                  setOverlay(null);
                  verifyingRef.current = false;
                }}
              >
                <Icon
                  name={
                    overlay.valid
                      ? 'check-circle'
                      : overlay.status === 'already_used'
                        ? 'alert-circle'
                        : 'close-circle'
                  }
                  size={56}
                  color="#FFFFFF"
                />
                <Text style={styles.overlayTitle}>
                  {overlay.valid
                    ? (overlay.totalSeats || 0) > 1
                      ? `VALID · ग्रुप ${overlay.totalSeats} आसने`
                      : 'VALID · प्रवेश मंजूर'
                    : overlay.status === 'already_used'
                      ? 'DUPLICATE · आधीच स्कॅन'
                      : overlay.scanResult === 'WRONG_SESSION'
                        ? 'WRONG SHOW · शो वेळ बदला'
                        : overlay.scanResult === 'WRONG_EVENT'
                          ? 'WRONG EVENT · शो निवडा'
                          : overlay.message || 'DENIED'}
                </Text>
                {!overlay.valid ? (
                  <Text style={[styles.overlaySeat, { fontSize: 13, opacity: 0.95 }]} numberOfLines={4}>
                    {overlay.message}
                  </Text>
                ) : null}
                <Text style={styles.overlaySeat}>
                  {overlay.ticket?.seatCode ||
                    overlay.ticket?.seats ||
                    (overlay.seatCodes || []).join(', ') ||
                    '—'}
                  {(overlay.totalSeats || 0) > 1
                    ? ` · ${overlay.totalSeats} Tickets`
                    : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setDetail({
                      id: 'live',
                      code: overlay.ticket?.ticketCode || '',
                      attendeeName: overlay.ticket?.attendeeName || overlay.guest?.name || '—',
                      seatCode: overlay.ticket?.seatCode || '—',
                      email: overlay.ticket?.email || overlay.guest?.email,
                      phone: overlay.ticket?.phone || overlay.guest?.phone,
                      grandTotal: overlay.ticket?.grandTotal ?? overlay.guest?.grandTotal,
                      paymentStatus:
                        overlay.ticket?.paymentStatus || overlay.guest?.paymentStatus,
                      orderNumber: overlay.ticket?.orderNumber || overlay.guest?.orderNumber,
                      eventTitle: overlay.ticket?.eventTitle,
                      venue: overlay.ticket?.venue,
                      status: overlay.status,
                      timestamp: '',
                      valid: overlay.valid,
                    });
                  }}
                >
                  <Text style={styles.overlayName}>
                    {overlay.ticket?.attendeeName || overlay.guest?.name || '—'} · टॅप डिटेल्स
                  </Text>
                </TouchableOpacity>
                <Text style={styles.overlayHint}>पुढील स्कॅनसाठी टॅप</Text>
              </TouchableOpacity>
            ) : null}

            {cameraActive && verifying ? (
              <View style={styles.verifyingBadge}>
                <ActivityIndicator color="#EA580C" size="small" />
                <Text style={styles.verifyingText}>तपासत आहे…</Text>
              </View>
            ) : null}

            {cameraActive ? (
              <TouchableOpacity style={styles.stopFab} onPress={() => setCameraActive(false)}>
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {tab === 'manual' ? (
          <View style={styles.manualBox}>
            <Text style={styles.manualTitle}>मॅन्युअल कोड पडताळणी</Text>
            <Text style={styles.manualSub}>QR अयशस्वी झाल्यास तिकीट / ऑर्डर कोड टाका.</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="MT-TK-… / MT-2026-…"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
                onSubmitEditing={() => verifyCode(manualCode)}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => verifyCode(manualCode)}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>तपासा</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {tab === 'recent' ? (
          <View style={styles.recentBox}>
            {recent.length === 0 ? (
              <Text style={styles.emptyRecent}>अद्याप स्कॅन नाही</Text>
            ) : (
              recent.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.recentRow}
                  onPress={() => setDetail(r)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {r.attendeeName}
                    </Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {r.seatCode} · {r.timestamp}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontWeight: '900',
                      color: r.valid ? '#059669' : '#BE123C',
                      fontSize: 11,
                    }}
                  >
                    {r.valid ? 'OK' : 'DENY'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}
      </View>

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalEyebrow}>प्रेक्षक तपशील</Text>
              <TouchableOpacity onPress={() => setDetail(null)}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalName}>{detail?.attendeeName}</Text>
            {[
              ['आसन', detail?.seatCode],
              ['मोबाईल', detail?.phone || '—'],
              ['ईमेल', detail?.email || '—'],
              [
                'पेमेंट',
                `${formatPaise(detail?.grandTotal)}${
                  detail?.paymentStatus ? ` · ${detail.paymentStatus}` : ''
                }`,
              ],
              ['ऑर्डर', detail?.orderNumber || detail?.code || '—'],
            ].map(([k, v]) => (
              <View key={String(k)} style={styles.modalRow}>
                <Text style={styles.modalLabel}>{k}</Text>
                <Text style={styles.modalVal}>{v}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setDetail(null)}>
              <Text style={styles.primaryBtnText}>ठीक आहे</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#141B2B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FDBA74',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  metricsPill: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metric: { fontSize: 11, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  scopeDot: { width: 8, height: 8, borderRadius: 4 },
  scopeTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  scopeSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  scopeToggle: { fontSize: 11, fontWeight: '800', color: '#FDBA74' },
  scopeBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: '100%',
  },
  chipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#E2E8F0', maxWidth: 220 },
  chipTextActive: { color: '#FFFFFF' },
  warn: { fontSize: 11, color: '#FCD34D', marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#EA580C' },
  tabText: { fontSize: 11, fontWeight: '800', color: '#CBD5E1' },
  tabTextActive: { color: '#FFFFFF' },
  main: { flex: 1, minHeight: 0, paddingHorizontal: 12, paddingBottom: 8 },
  cameraBox: {
    flex: 1,
    minHeight: 240,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cameraIdle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: 'rgba(11,18,32,0.96)',
  },
  idleTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  idleSub: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
  err: { color: '#FCA5A5', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  settingsBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(253,186,116,0.45)',
  },
  settingsBtnText: { color: '#FDBA74', fontWeight: '800', fontSize: 12 },
  primaryBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  overlaySeat: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 6 },
  overlayName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  overlayHint: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 14 },
  verifyingBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    zIndex: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyingText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  stopFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  manualTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  manualSub: { fontSize: 12, color: '#64748B' },
  manualRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  recentBox: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  emptyRecent: { textAlign: 'center', color: '#64748B', paddingVertical: 40 },
  recentRow: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  recentName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  recentMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  denyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 18 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  modalEyebrow: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  modalName: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalLabel: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  modalVal: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '800', color: '#0F172A' },
});
