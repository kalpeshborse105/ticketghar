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

      if (data.valid && onTicketVerifiedRef.current) {
        onTicketVerifiedRef.current(data.ticket);
      }

      // Auto-clear success so next guest can scan quickly
      if (data.valid) {
        setTimeout(() => {
          setCurrentOverlay((cur) => (cur?.valid ? null : cur));
          overlayOpenRef.current = false;
          isCooldownRef.current = false;
        }, 1600);
      }
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
      if (soundEnabledRef.current) playScanSound('error');
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 450);
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
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.78;
          return { width: Math.max(240, edge), height: Math.max(240, edge) };
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

  return (
    <div className="w-full max-w-lg mx-auto bg-[#F9F9FF] min-h-[70vh] max-h-[92vh] overflow-y-auto text-[#141B2B] flex flex-col pb-8 font-sans">
      {/* Hidden file upload reader helper */}
      <div id="admin-file-reader-dummy" className="hidden" />

      {/* Stitch Header */}
      <header className="sticky top-0 z-40 bg-[#FFF7ED]/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-[#EA580C] tracking-tight">महाटिकिट</span>
            <span className="text-slate-300">|</span>
            <h1 className="font-bold text-sm sm:text-base text-[#141B2B] truncate">Gate QR Scanner</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#EA580C]"
            title={soundEnabled ? 'आवाज सुरू' : 'म्यूट'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#EA580C]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Sticky event + showtime lock — always visible (screenshot: picker was scrolled away) */}
      <div className="sticky top-[52px] z-30 bg-[#141B2B] text-white p-3 flex flex-col gap-2 shadow-md border-b border-slate-700">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">कार्यक्रम / Event</label>
          <select
            value={targetEventId ? String(targetEventId) : ''}
            onChange={(e) => {
              const next = e.target.value || undefined;
              setTargetEventId(next);
              setTargetSessionId(undefined);
            }}
            className="w-full bg-[#1E293B] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white"
          >
            <option value="">निवडा (Select event)</option>
            {(loadedEvents || []).map((ev) => (
              <option key={String(ev.id)} value={String(ev.id)}>
                {ev.titleMr || ev.title || `Event #${ev.id}`}
              </option>
            ))}
          </select>
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">शो वेळ / Showtime</label>
          <select
            value={targetSessionId ? String(targetSessionId) : ''}
            onChange={(e) => setTargetSessionId(e.target.value || undefined)}
            disabled={!targetEventId}
            className="w-full bg-[#1E293B] border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-50"
          >
            <option value="">निवडा (Select showtime)</option>
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
          {(loadedEvents || []).length === 0 && (
            <p className="text-[11px] text-red-300 font-semibold">
              कार्यक्रम यादी रिकामी — admin login / DB events तपासा.
            </p>
          )}
          {targetEventId && sessionOptions.length === 0 && (
            <p className="text-[11px] text-amber-300">
              या कार्यक्रमासाठी शो वेळा उपलब्ध नाहीत — admin मध्ये session जोडा.
            </p>
          )}
          {(!targetEventId || !targetSessionId) && (
            <p className="text-[11px] text-amber-300">
              स्कॅन सुरू करण्यापूर्वी कार्यक्रम व अचूक शो वेळ निवडा — इतर दिनांक/वेळेची तिकिटे नाकारली जातील.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Ticket className="w-5 h-5 text-[#FD6B36] shrink-0" />
            <span className="truncate font-bold text-sm text-white">
              {selectedEvent?.titleMr || selectedEvent?.title || 'Gate Scanner'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cameraActive && (
              <>
                <button
                  aria-label="Toggle Torch"
                  onClick={handleToggleTorch}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    torchOn ? 'bg-[#EA580C] text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title="Flashlight"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
                {cameras.length > 1 && (
                  <button
                    aria-label="Flip Camera"
                    onClick={handleSwitchCamera}
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                    title="Switch Camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-semibold text-white truncate">
              {selectedShowLabel || 'शो वेळ निवडा (Select showtime)'}
            </span>
            <span className="shrink-0">•</span>
            <span className="bg-[#EA580C]/25 text-orange-200 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-orange-500/30 shrink-0">
              {gateName || 'मुख्य प्रवेशद्वार'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Online Sync</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Mode Toggle Bar */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'live'
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Live Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'recent'
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Recent ({metrics.total})</span>
          </button>
        </div>

        {/* TAB 1: Live Scanner Viewport */}
        {activeTab === 'live' && (
          <div className="flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-[#141B2B] rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
              {/* Radial dots pattern overlay */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fd6b36_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Html5Qrcode viewfinder mount */}
              <div id={scannerContainerId} className="w-full h-full" />

              {!cameraActive && (
                <div className="absolute inset-0 bg-[#141B2B]/90 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-[#EA580C]">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">कॅमेरा बंद आहे</h3>
                    <p className="text-xs text-slate-400 mt-0.5">तिकीट तपासण्यासाठी कॅमेरा सुरू करा</p>
                  </div>
                  {cameraError && (
                    <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs max-w-xs">
                      {cameraError}
                    </div>
                  )}
                  <button
                    onClick={() => void startCamera()}
                    className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] active:scale-95 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>कॅमेरा सुरू करा</span>
                  </button>
                </div>
              )}

              {/* Laser Target Box when camera is active */}
              {cameraActive && !currentOverlay && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                  <div className="relative w-56 h-56 flex items-center justify-center border-2 border-orange-400/60 rounded-2xl">
                    <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#EA580C] rounded-tl-lg" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#EA580C] rounded-tr-lg" />
                    <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#EA580C] rounded-bl-lg" />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#EA580C] rounded-br-lg" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#EA580C] to-transparent shadow-[0_0_12px_#EA580C] animate-pulse" />
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 inset-x-3 bg-black/70 backdrop-blur-md py-1.5 px-3 rounded-lg text-center z-20">
                <p className="text-xs text-white flex items-center justify-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-ping" />
                  तिकीटाचा QR कोड फ्रेममध्ये धरा
                </p>
              </div>
            </div>

            {/* Validation Card (Stitch Exact) */}
            {currentOverlay && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                {currentOverlay.valid ? (
                  <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      <span className="text-sm font-bold tracking-wide">✓ वैध तिकीट (VALID)</span>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">AUDIO OK</span>
                  </div>
                ) : (
                  <div className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 stroke-[2.5]" />
                      <span className="text-sm font-bold tracking-wide">
                        {denyBannerLabel(currentOverlay.scanResult)}
                      </span>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">DENIED</span>
                  </div>
                )}

                  <div className="p-4 flex flex-col gap-3 bg-[#FFF7ED]/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">प्रेक्षक / ATTENDEE</span>
                      <h2 className="text-base font-bold text-[#141B2B]">
                        {currentOverlay.ticket?.attendee || '—'}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[160px]">
                        {currentOverlay.ticket?.eventMr || currentOverlay.ticket?.event || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">आसन / SEATS</span>
                      <p className="text-base font-bold text-[#EA580C]">
                        {currentOverlay.ticket?.seats || currentOverlay.ticket?.seat || '—'}
                      </p>
                      {(currentOverlay.isGroup || (currentOverlay.totalSeats || 0) > 1) && (
                        <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                          पार्टी: {currentOverlay.totalSeats || currentOverlay.seatCodes?.length || '—'} जण चेक-इन
                        </p>
                      )}
                    </div>
                  </div>

                  {!currentOverlay.valid && currentOverlay.rawPreview ? (
                    <p className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 break-all">
                      QR वाचले: {currentOverlay.rawPreview}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">तिकीट ID</span>
                      <span className="text-xs font-semibold text-[#141B2B] truncate">
                        {currentOverlay.ticket?.code || currentOverlay.ticketCode || '—'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">शो वेळ / Showtime</span>
                      <span className="text-xs font-semibold text-[#141B2B]">
                        {currentOverlay.ticket?.showtimeLabel ||
                          (currentOverlay.ticket?.showtime
                            ? new Date(currentOverlay.ticket.showtime).toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '—')}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col col-span-2">
                      <span className="text-[10px] text-slate-500">स्थळ / Venue</span>
                      <span className="text-xs font-semibold text-[#141B2B] truncate">
                        {currentOverlay.ticket?.venue || '—'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col col-span-2">
                      <span className="text-[10px] text-slate-500">प्रवेश स्थिती</span>
                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        currentOverlay.valid ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          currentOverlay.valid ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        {currentOverlay.valid ? 'प्रवेश मंजूर' : currentOverlay.message || 'प्रवेश नाकारला'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={handleDismissOverlay}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-[#141B2B] text-xs font-bold rounded-lg text-center transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Next Scan</span>
                    </button>
                    <button
                      onClick={() =>
                        setScannerPopup({
                          title: 'तिकीट तपशील (Ticket Details)',
                          message: [
                            `नाव: ${currentOverlay.ticket?.attendee || '—'}`,
                            `आसन: ${currentOverlay.ticket?.seats || currentOverlay.ticket?.seat || '—'}`,
                            `कार्यक्रम: ${currentOverlay.ticket?.eventMr || currentOverlay.ticket?.event || '—'}`,
                            `वेळ: ${currentOverlay.ticket?.showtimeLabel || '—'}`,
                            `स्थळ: ${currentOverlay.ticket?.venue || '—'}`,
                            `कोड: ${currentOverlay.ticket?.code || currentOverlay.ticketCode || '—'}`,
                          ].join('\n'),
                        })
                      }
                      className="py-2.5 px-4 bg-[#EA580C] text-white hover:bg-[#C2410C] active:scale-95 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>तपशील</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live attendance from DB for selected showtime */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">गेट उपस्थिती / ATTENDANCE</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#141B2B]">
                  {attendance ? attendance.checkedIn : '—'}
                </span>
                <span className="text-xs text-slate-500">
                  / {attendance ? attendance.totalTickets : '—'} तिकीटे
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-[#EA580C]">
                {attendance ? `${attendance.percent}%` : '—'}
              </span>
              <span className="text-[11px] text-slate-500 block font-semibold">
                {targetSessionId ? 'लाइव्ह DB' : 'शो निवडा'}
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#EA580C] rounded-full transition-all duration-500"
              style={{ width: `${attendance ? Math.min(100, attendance.percent) : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
            <span>बाकी: {attendance ? attendance.remaining : '—'}</span>
            <span>सत्र स्कॅन: {metrics.valid} ✓ / {metrics.rejected} ✗</span>
            <span className="text-[#EA580C] font-semibold">
              {attendance?.capacity ? `क्षमता: ${attendance.capacity}` : 'Live'}
            </span>
          </div>
        </div>

        {/* TAB 2 / Manual Code Input Fallback Card (Stitch Exact) */}
        {(activeTab === 'manual' || activeTab === 'live') && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[#141B2B]">
              <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
              <h3 className="font-bold text-xs sm:text-sm">मॅन्युअल कोड पडताळणी (Fallback Entry)</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              QR अयशस्वी झाल्यास तिकीट कोड किंवा ऑर्डर ID (उदा. MT-2026-22814) टाका — निवडलेल्या शोशी जुळले तरच प्रवेश.
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="तिकीट कोड / ऑर्डर ID"
                className="flex-1 bg-slate-50 text-[#141B2B] font-mono text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#EA580C]"
              />
              <button
                type="submit"
                disabled={isVerifying || !manualCode.trim()}
                className="bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>तपासा</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3 / Recent Scans Log (Stitch Exact) */}
        <div className="bg-[#FFF7ED]/40 rounded-2xl p-4 flex flex-col gap-2.5 border border-orange-100">
          <div className="flex justify-between items-center">
            <span className="font-bold text-xs sm:text-sm text-[#141B2B]">मागील नोंदी (Recent Logs)</span>
            <span className="text-[11px] text-[#EA580C] font-semibold">थेट सिंक</span>
          </div>
          <div className="flex flex-col gap-2">
            {recentScans.length > 0 ? (
              recentScans.slice(0, 5).map((scan, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl flex items-center justify-between shadow-2xs border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    {scan.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-[#141B2B]">
                        {scan.ticket?.attendee || scan.ticket?.code || scan.ticketCode || '—'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {scan.ticket?.seat || scan.ticket?.seats
                          ? `आसन: ${scan.ticket?.seats || scan.ticket?.seat}`
                          : scan.scanResult || '—'}{' '}
                        • {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scan.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {scan.valid ? 'Gate 2' : 'Denied'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500 py-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                अद्याप स्कॅन नाही — पहिले तिकीट स्कॅन केल्यावर येथे दिसेल.
              </p>
            )}
          </div>
        </div>

        {/* Protocol Footer */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-slate-400">
            MahaTicket FastGate • निवडलेल्या कार्यक्रम + शो वेळेशीच तिकीट जुळते
          </p>
        </div>
      </div>

      {scannerPopup && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100 transform transition-all scale-100">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{scannerPopup.title}</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed whitespace-pre-line">{scannerPopup.message}</p>
            <button
              onClick={() => setScannerPopup(null)}
              className="w-full py-2.5 px-4 bg-[#EA580C] hover:bg-[#A33900] active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              ठीक आहे (OK)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

