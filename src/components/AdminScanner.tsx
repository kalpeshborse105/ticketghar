'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  CameraOff,
  SwitchCamera,
  Flashlight,
  FlashlightOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Volume2,
  VolumeX,
  Upload,
  Keyboard,
  ShieldCheck,
  User,
  Clock,
  MapPin,
  Ticket,
  ChevronRight,
  Flame,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';

export interface VerifyResult {
  valid: boolean;
  scanResult: 'SUCCESS' | 'ALREADY_USED' | 'INVALID_TICKET' | 'TICKET_CANCELLED' | string;
  message: string;
  ticketCode?: string;
  rawPreview?: string;
  alreadyScannedAt?: string;
  previousGate?: string;
  isGroup?: boolean;
  totalSeats?: number;
  seatCodes?: string[];
  ticket?: {
    code: string;
    seat: string;
    seats?: string;
    attendee: string;
    event?: string;
    eventMr?: string;
    venue?: string;
    showtime?: string;
    showtimeLabel?: string;
    sessionId?: number | null;
  };
  scannedAt?: string;
}

interface AdminScannerProps {
  scannerUserId?: number | string;
  scannerOrganizerId?: number | string;
  targetEventId?: number | string;
  targetSessionId?: number | string;
  events?: Array<{ id: number | string; title?: string; titleMr?: string; sessions?: Array<{ id: number | string; sessionStartTime?: string }> }>;
  initialGateName?: string;
  onTicketVerified?: (ticket: any) => void;
  onViewVerifiedList?: () => void;
  onClose?: () => void;
}

// Sound Synthesizer via Web Audio API (no external asset dependencies)
function playScanSound(type: 'success' | 'warning' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Pleasant high double chime (880Hz -> 1320Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);
    } else if (type === 'warning') {
      // Warning double tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Harsh low error buzz (180Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Audio context may be blocked before user interaction
  }
}

function triggerVibration(pattern: number[]) {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors
    }
  }
}

export const AdminScanner: React.FC<AdminScannerProps> = ({
  scannerUserId,
  scannerOrganizerId,
  targetEventId: initialTargetEventId,
  targetSessionId: initialTargetSessionId,
  events: eventsProp,
  initialGateName = 'Main Entry Gate 1',
  onTicketVerified,
  onViewVerifiedList,
  onClose,
}) => {
  const [gateName, setGateName] = useState(initialGateName);
  const [targetEventId, setTargetEventId] = useState<string | number | undefined>(initialTargetEventId);
  const [targetSessionId, setTargetSessionId] = useState<string | number | undefined>(initialTargetSessionId);
  const [loadedEvents, setLoadedEvents] = useState<AdminScannerProps['events']>(eventsProp || []);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Verification overlay state
  const [currentOverlay, setCurrentOverlay] = useState<VerifyResult | null>(null);
  const [scannerPopup, setScannerPopup] = useState<{ title: string; message: string } | null>(null);

  // Scanning metrics for active session
  const [metrics, setMetrics] = useState({
    total: 0,
    valid: 0,
    duplicate: 0,
    rejected: 0,
  });
  const [attendance, setAttendance] = useState<{
    checkedIn: number;
    totalTickets: number;
    remaining: number;
    percent: number;
    capacity: number;
  } | null>(null);

  // Recent scans list
  const [recentScans, setRecentScans] = useState<Array<VerifyResult & { timestamp: number }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'admin-qr-reader-container';
  const isCooldownRef = useRef(false);
  const overlayOpenRef = useRef(false);
  const targetEventIdRef = useRef(targetEventId);
  const targetSessionIdRef = useRef(targetSessionId);
  const gateNameRef = useRef(gateName);
  const soundEnabledRef = useRef(soundEnabled);
  const scannerUserIdRef = useRef(scannerUserId);
  const scannerOrganizerIdRef = useRef(scannerOrganizerId);
  const onTicketVerifiedRef = useRef(onTicketVerified);
  const lastRawScanRef = useRef('');

  useEffect(() => {
    targetEventIdRef.current = targetEventId;
  }, [targetEventId]);
  useEffect(() => {
    targetSessionIdRef.current = targetSessionId;
  }, [targetSessionId]);
  useEffect(() => {
    gateNameRef.current = gateName;
  }, [gateName]);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    scannerUserIdRef.current = scannerUserId;
  }, [scannerUserId]);
  useEffect(() => {
    scannerOrganizerIdRef.current = scannerOrganizerId;
  }, [scannerOrganizerId]);
  useEffect(() => {
    onTicketVerifiedRef.current = onTicketVerified;
  }, [onTicketVerified]);
  useEffect(() => {
    overlayOpenRef.current = !!currentOverlay;
  }, [currentOverlay]);

  // Load available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err);
      });

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear();
        });
      }
    };
  }, []);

  // Load organizer events + sessions for exact showtime scoping (include past/today shows)
  useEffect(() => {
    if (eventsProp && eventsProp.length > 0) {
      setLoadedEvents(eventsProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const normalize = (data: any) =>
          Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];

        // Prefer admin list (all statuses + sessions); fall back to public with includeEnded
        const adminRes = await fetch('/api/admin/events', { credentials: 'include' });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          const adminList = normalize(adminData);
          if (!cancelled && adminList.length > 0) {
            setLoadedEvents(adminList);
            return;
          }
        }

        const qs = new URLSearchParams({ includeEnded: '1' });
        if (scannerOrganizerId) qs.set('organizerId', String(scannerOrganizerId));
        const res = await fetch(`/api/events?${qs.toString()}`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const list = normalize(data);
        if (!cancelled) setLoadedEvents(list);
      } catch (err) {
        console.warn('AdminScanner events load failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventsProp, scannerOrganizerId]);

  const selectedEvent = (loadedEvents || []).find((e) => String(e.id) === String(targetEventId));
  const sessionOptions = selectedEvent?.sessions || [];
  const selectedSession = sessionOptions.find((s) => String(s.id) === String(targetSessionId));
  const selectedShowLabel = selectedSession?.sessionStartTime
    ? new Date(selectedSession.sessionStartTime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  // Live DB attendance for selected showtime
  useEffect(() => {
    if (!targetSessionId) {
      setAttendance(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scanner/attendance?sessionId=${encodeURIComponent(String(targetSessionId))}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setAttendance({
            checkedIn: Number(data.checkedIn || 0),
            totalTickets: Number(data.totalTickets || 0),
            remaining: Number(data.remaining || 0),
            percent: Number(data.percent || 0),
            capacity: Number(data.capacity || 0),
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetSessionId, metrics.valid]);

  const denyBannerLabel = (result?: string) => {
    switch (result) {
      case 'ALREADY_USED':
        return '⚠ आधीच वापरलेले (DUPLICATE)';
      case 'WRONG_SESSION':
        return '✗ चुकीची शो वेळ (WRONG SHOW)';
      case 'WRONG_EVENT':
        return '✗ चुकीचा कार्यक्रम (WRONG EVENT)';
      case 'UNPAID':
        return '✗ पेमेंट अपूर्ण (UNPAID)';
      case 'SCOPE_REQUIRED':
        return '⚠ शो निवडा (SELECT SHOW)';
      case 'WRONG_ORGANIZER':
        return '✗ अनधिकृत आयोजक';
      default:
        return '✗ अवैध / न जुळणारे तिकीट';
    }
  };

  // Process code verification against database (refs = no stale event/showtime after camera start)
  const verifyCode = useCallback(async (rawCode: string) => {
    if (!rawCode || isCooldownRef.current) return;

    const eventId = targetEventIdRef.current;
    const sessionId = targetSessionIdRef.current;
    if (!eventId || !sessionId) {
      setCurrentOverlay({
        valid: false,
        scanResult: 'SCOPE_REQUIRED',
        message: 'स्कॅन करण्यापूर्वी कार्यक्रम व शो वेळ निवडा (Select event & showtime first).',
      });
      if (soundEnabledRef.current) playScanSound('error');
      return;
    }

    // Ignore identical double-fire from html5-qrcode within cooldown window
    const trimmed = rawCode.trim();
    if (trimmed === lastRawScanRef.current && isCooldownRef.current) return;
    lastRawScanRef.current = trimmed;

    isCooldownRef.current = true;
    setIsVerifying(true);

    try {
      const response = await fetch('/api/scanner/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticketCodeOrPayload: trimmed,
          gateName: gateNameRef.current || 'Main Gate',
          scannerUserId: scannerUserIdRef.current || 1,
          // Only send organizer scope when it is a real numeric id (avoid NaN false rejects)
          scannerOrganizerId: (() => {
            const oid = scannerOrganizerIdRef.current;
            const n = oid != null && oid !== '' ? Number(oid) : NaN;
            return Number.isFinite(n) && n > 0 ? n : undefined;
          })(),
          targetEventId: Number(eventId),
          targetSessionId: Number(sessionId),
          requireScope: true,
          scannerDevice:
            typeof navigator !== 'undefined'
              ? `${navigator.userAgent.slice(0, 30)}`
              : 'Admin Terminal',
        }),
      });

      const data: VerifyResult = await response.json().catch(() => ({
        valid: false,
        scanResult: 'NETWORK_ERROR',
        message: 'सर्व्हर प्रतिसाद वाचता आला नाही',
        rawPreview: trimmed.slice(0, 96),
      }));

      if (typeof data.valid !== 'boolean') {
        data.valid = false;
        data.scanResult = data.scanResult || 'NETWORK_ERROR';
        data.message = data.message || (data as any).error || 'Verification failed';
        data.rawPreview = data.rawPreview || trimmed.slice(0, 96);
      }

      setMetrics((prev) => {
        const next = { ...prev, total: prev.total + 1 };
        if (data.valid) next.valid += 1;
        else if (data.scanResult === 'ALREADY_USED') next.duplicate += 1;
        else next.rejected += 1;
        return next;
      });

      setRecentScans((prev) => [{ ...data, timestamp: Date.now() }, ...prev.slice(0, 19)]);

      if (soundEnabledRef.current) {
        if (data.valid) {
          playScanSound('success');
          triggerVibration([120, 80, 160]);
        } else if (data.scanResult === 'ALREADY_USED') {
          playScanSound('warning');
          triggerVibration([250, 100, 250]);
        } else {
          playScanSound('error');
          triggerVibration([400]);
        }
      }

      setCurrentOverlay(data);
      overlayOpenRef.current = true;

      if (data.valid && onTicketVerifiedRef.current) {
        onTicketVerifiedRef.current(data.ticket);
      }

      // Instant gate flow: short flash then resume (payment-gateway style)
      const clearMs = data.valid ? 420 : data.scanResult === 'ALREADY_USED' ? 900 : 1100;
      setTimeout(() => {
        setCurrentOverlay(null);
        overlayOpenRef.current = false;
        isCooldownRef.current = false;
      }, clearMs);
    } catch (err: any) {
      console.error('Verify error:', err);
      const fallbackResult: VerifyResult = {
        valid: false,
        scanResult: 'NETWORK_ERROR',
        message: 'सर्व्हरशी संपर्क होऊ शकला नाही (Network/Verification Error)',
        ticketCode: trimmed,
        rawPreview: trimmed.slice(0, 96),
      };
      setCurrentOverlay(fallbackResult);
      overlayOpenRef.current = true;
      if (soundEnabledRef.current) playScanSound('error');
      setTimeout(() => {
        setCurrentOverlay(null);
        overlayOpenRef.current = false;
        isCooldownRef.current = false;
      }, 1100);
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        if (!overlayOpenRef.current) isCooldownRef.current = false;
      }, 180);
    }
  }, []);

  // Start Camera
  const startCamera = async (cameraId?: string) => {
    setCameraError(null);
    const targetCamera = cameraId || selectedCameraId;

    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const html5Qr = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5Qr;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 30,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
          return { width: Math.max(220, edge), height: Math.max(220, edge) };
        },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      const onDecoded = (decodedText: string) => {
        // Use refs so changing event/showtime after camera start still works
        if (isCooldownRef.current || overlayOpenRef.current) return;
        void verifyCode(decodedText);
      };

      const cameraSelection: any = targetCamera || { facingMode: 'environment' };

      try {
        await html5Qr.start(cameraSelection, config, onDecoded, () => {});
      } catch (errFallback) {
        console.warn('Primary camera selection failed, trying environment fallback:', errFallback);
        await html5Qr.start({ facingMode: 'environment' }, config, onDecoded, () => {});
      }

      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera start failed:', err);
      setCameraError(err?.message || 'कॅमेरा सुरू करताना अडचण आली. कृपया ब्राउझरमध्ये कॅमेरा परवानगी द्या.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Switch Camera
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    if (cameraActive) {
      void startCamera(nextCamera.id);
    }
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    try {
      if (!html5QrCodeRef.current) return;
      // Torch capability in Html5Qrcode relies on video track settings
      const videoElement = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && 'torch' in capabilities) {
          const nextTorch = !torchOn;
          await (track as any).applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
          setTorchOn(nextTorch);
        } else {
          setScannerPopup({
            title: 'फ्लॅशलाइट माहिती',
            message: 'या डिव्हाइसवर फ्लॅशलाइट उपलब्ध नाही (Torch not supported on this lens)',
          });
        }
      }
    } catch (err: any) {
      console.warn('Torch toggle error:', err);
    }
  };

  // File Upload QR Code Scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5Qr = new Html5Qrcode('admin-file-reader-dummy');
      const decodedText = await html5Qr.scanFile(file, true);
      html5Qr.clear();
      if (decodedText) {
        void verifyCode(decodedText);
      }
    } catch (err: any) {
      setScannerPopup({
        title: 'QR कोड वाचन त्रुटी',
        message: 'चित्रातून QR कोड वाचता आला नाही: ' + (err?.message || err || 'Invalid image'),
      });
    } finally {
      e.target.value = '';
    }
  };

  // Manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    void verifyCode(manualCode.trim());
    setManualCode('');
  };

  // Close overlay and resume scanning
  const handleDismissOverlay = () => {
    setCurrentOverlay(null);
    isCooldownRef.current = false;
  };

  const [activeTab, setActiveTab] = useState<'live' | 'manual' | 'recent'>('live');
  const [scopeExpanded, setScopeExpanded] = useState(true);
  const scopeReady = !!(targetEventId && targetSessionId);

  useEffect(() => {
    if (scopeReady) setScopeExpanded(false);
  }, [scopeReady]);

  return (
    <div className="w-full max-w-lg mx-auto h-[100dvh] max-h-[100dvh] bg-[#0B1220] text-white flex flex-col overflow-hidden font-sans">
      <div id="admin-file-reader-dummy" className="hidden" />

      {/* Fixed top: brand + live metrics — never scrolls away */}
      <header className="shrink-0 z-40 bg-[#141B2B] border-b border-white/10 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-orange-300/90 font-bold">FastGate</p>
          <h1 className="font-bold text-sm truncate text-white">Gate Scanner</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex text-[10px] font-mono bg-white/5 rounded-lg px-2 py-1 gap-2 border border-white/10">
            <span className="text-emerald-400">{metrics.valid}✓</span>
            <span className="text-amber-300">{metrics.duplicate}↻</span>
            <span className="text-rose-400">{metrics.rejected}✗</span>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
            title={soundEnabled ? 'आवाज सुरू' : 'म्यूट'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#EA580C]" /> : <VolumeX className="w-4 h-4 text-slate-300" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Fixed scope picker */}
      <div className="shrink-0 z-30 bg-[#0F172A] border-b border-white/10">
        <button
          type="button"
          onClick={() => setScopeExpanded((v) => !v)}
          className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${scopeReady ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {selectedEvent?.titleMr || selectedEvent?.title || 'कार्यक्रम निवडा'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {selectedShowLabel || 'शो वेळ निवडा'} · {gateName || 'Gate 1'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-orange-300 shrink-0">
            {scopeExpanded ? 'लपवा' : 'बदला'}
          </span>
        </button>
        {scopeExpanded && (
          <div className="px-3 pb-3 grid grid-cols-1 gap-2">
            <select
              value={targetEventId ? String(targetEventId) : ''}
              onChange={(e) => {
                setTargetEventId(e.target.value || undefined);
                setTargetSessionId(undefined);
              }}
              className="w-full bg-[#1E293B] border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">कार्यक्रम निवडा</option>
              {(loadedEvents || []).map((ev) => (
                <option key={String(ev.id)} value={String(ev.id)}>
                  {ev.titleMr || ev.title || `Event #${ev.id}`}
                </option>
              ))}
            </select>
            <select
              value={targetSessionId ? String(targetSessionId) : ''}
              onChange={(e) => setTargetSessionId(e.target.value || undefined)}
              disabled={!targetEventId}
              className="w-full bg-[#1E293B] border border-slate-600 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <option value="">शो वेळ निवडा</option>
              {sessionOptions.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.sessionStartTime
                    ? new Date(s.sessionStartTime).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : `Session #${s.id}`}
                </option>
              ))}
            </select>
            {!scopeReady && (
              <p className="text-[11px] text-amber-300">
                स्कॅनपूर्वी कार्यक्रम + शो वेळ लॉक करा — चुकीची तिकिटे नाकारली जातील.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-3 pt-2">
        <div className="flex bg-white/10 p-1 rounded-xl">
          {(
            [
              { id: 'live' as const, label: 'Camera', icon: QrCode },
              { id: 'manual' as const, label: 'Entry', icon: Keyboard },
              { id: 'recent' as const, label: `Recent (${metrics.total})`, icon: Clock },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${
                activeTab === tab.id ? 'bg-[#EA580C] text-white' : 'text-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main pane — camera fills remaining height; no page scroll */}
      <div className="flex-1 min-h-0 flex flex-col p-3 gap-2">
        {activeTab === 'live' && (
          <div className="relative flex-1 min-h-[240px] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl">
            <div id={scannerContainerId} className="absolute inset-0 w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

            {!cameraActive && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 bg-[#0B1220]/95 text-center">
                <Camera className="w-10 h-10 text-[#EA580C]" />
                <div>
                  <p className="font-bold text-white">कॅमेरा बंद आहे</p>
                  <p className="text-xs text-slate-400 mt-1">तिकीट तपासण्यासाठी कॅमेरा सुरू करा</p>
                </div>
                {cameraError && (
                  <p className="text-xs text-red-300 bg-red-950/50 border border-red-500/40 rounded-lg px-3 py-2 max-w-xs">
                    {cameraError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={!scopeReady}
                  onClick={() => void startCamera()}
                  className="px-5 py-2.5 rounded-xl bg-[#EA580C] disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  कॅमेरा सुरू करा
                </button>
              </div>
            )}

            {cameraActive && !currentOverlay && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="relative w-[68%] max-w-[280px] aspect-square border-2 border-orange-400/50 rounded-2xl">
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-[#EA580C] rounded-tl-md" />
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-[#EA580C] rounded-tr-md" />
                  <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-[#EA580C] rounded-bl-md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-[#EA580C] rounded-br-md" />
                  <div className="absolute inset-x-3 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#EA580C] to-transparent animate-pulse" />
                </div>
              </div>
            )}

            {/* Instant verify flash overlay (does not push layout / no scroll) */}
            {currentOverlay && (
              <button
                type="button"
                onClick={handleDismissOverlay}
                className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-5 text-center ${
                  currentOverlay.valid ? 'bg-emerald-600/95' : 'bg-rose-700/95'
                }`}
              >
                {currentOverlay.valid ? (
                  <CheckCircle2 className="w-16 h-16 text-white mb-2" />
                ) : (
                  <XCircle className="w-16 h-16 text-white mb-2" />
                )}
                <p className="text-xl font-black text-white tracking-wide">
                  {currentOverlay.valid ? 'VALID · प्रवेश मंजूर' : denyBannerLabel(currentOverlay.scanResult)}
                </p>
                <p className="text-sm text-white/90 mt-1 font-semibold">
                  {currentOverlay.ticket?.seats || currentOverlay.ticket?.seat || currentOverlay.ticket?.code || currentOverlay.message}
                </p>
                <p className="text-[11px] text-white/70 mt-3">पुढील स्कॅनसाठी टॅप / auto-resume</p>
              </button>
            )}

            <div className="absolute bottom-3 inset-x-3 z-20 bg-black/65 backdrop-blur-md py-1.5 px-3 rounded-lg text-center">
              <p className="text-[11px] text-white font-medium flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-ping" />
                {isVerifying ? 'तपासत आहे…' : 'QR फ्रेममध्ये धरा · Instant verify'}
              </p>
            </div>

            {cameraActive && (
              <div className="absolute top-3 right-3 z-20 flex gap-2">
                <button
                  type="button"
                  aria-label="Torch"
                  onClick={handleToggleTorch}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    torchOn ? 'bg-[#EA580C] text-white' : 'bg-black/50 text-white'
                  }`}
                >
                  <Flashlight className="w-4 h-4" />
                </button>
                {cameras.length > 1 && (
                  <button
                    type="button"
                    aria-label="Flip"
                    onClick={handleSwitchCamera}
                    className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="flex-1 overflow-y-auto rounded-2xl bg-white text-[#141B2B] p-4 space-y-3">
            <h3 className="font-bold text-sm">मॅन्युअल कोड पडताळणी</h3>
            <p className="text-[11px] text-slate-500">QR अयशस्वी झाल्यास तिकीट / ऑर्डर कोड टाका.</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="MT-TK-… / MT-2026-…"
                className="flex-1 bg-slate-50 font-mono text-xs px-3 py-2.5 rounded-lg border border-slate-200"
              />
              <button
                type="submit"
                disabled={isVerifying || !manualCode.trim() || !scopeReady}
                className="bg-[#EA580C] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-bold"
              >
                {isVerifying ? '…' : 'तपासा'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="flex-1 overflow-y-auto rounded-2xl bg-[#FFF7ED] text-[#141B2B] p-3 space-y-2">
            {recentScans.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">अद्याप स्कॅन नाही</p>
            ) : (
              recentScans.slice(0, 30).map((scan, idx) => (
                <div key={`${scan.timestamp}-${idx}`} className="bg-white rounded-xl p-3 flex items-center justify-between border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {scan.ticket?.attendee || scan.ticket?.code || scan.ticketCode || '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {scan.ticket?.seats || scan.ticket?.seat || scan.scanResult} ·{' '}
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${scan.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {scan.valid ? 'OK' : 'DENY'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Fixed footer attendance */}
      <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 border-t border-white/10 bg-[#0B1220]">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-400">उपस्थिती</span>
          <span className="font-bold text-orange-300">
            {attendance ? `${attendance.checkedIn}/${attendance.totalTickets} · ${attendance.percent}%` : 'शो निवडा'}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#EA580C] transition-all duration-300"
            style={{ width: `${attendance ? Math.min(100, attendance.percent) : 0}%` }}
          />
        </div>
      </div>

      {scannerPopup && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center text-[#141B2B]">
            <h3 className="text-base font-bold mb-2">{scannerPopup.title}</h3>
            <p className="text-sm text-slate-600 mb-6 whitespace-pre-line">{scannerPopup.message}</p>
            <button
              type="button"
              onClick={() => setScannerPopup(null)}
              className="w-full py-2.5 bg-[#EA580C] text-white font-bold rounded-xl text-sm"
            >
              ठीक आहे
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

