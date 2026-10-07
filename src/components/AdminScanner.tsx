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
  alreadyScannedAt?: string;
  previousGate?: string;
  ticket?: {
    code: string;
    seat: string;
    attendee: string;
    event?: string;
    eventMr?: string;
    showtime?: string;
  };
  scannedAt?: string;
}

interface AdminScannerProps {
  scannerUserId?: number | string;
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
  initialGateName = 'Main Entry Gate 1',
  onTicketVerified,
  onViewVerifiedList,
}) => {
  const [gateName, setGateName] = useState(initialGateName);
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

  // Scanning metrics for active session
  const [metrics, setMetrics] = useState({
    total: 0,
    valid: 0,
    duplicate: 0,
    rejected: 0,
  });

  // Recent scans list
  const [recentScans, setRecentScans] = useState<Array<VerifyResult & { timestamp: number }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'admin-qr-reader-container';
  const isCooldownRef = useRef(false);

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

  // Process code verification against database
  const verifyCode = useCallback(async (rawCode: string) => {
    if (!rawCode || isVerifying || isCooldownRef.current) return;
    isCooldownRef.current = true;
    setIsVerifying(true);

    try {
      const response = await fetch('/api/scanner/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCodeOrPayload: rawCode.trim(),
          gateName: gateName || 'Main Gate',
          scannerUserId: scannerUserId || 1,
          scannerDevice: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 30)}` : 'Admin Terminal',
        }),
      });

      const data: VerifyResult = await response.json();

      // Update metrics & history
      setMetrics((prev) => {
        const next = { ...prev, total: prev.total + 1 };
        if (data.valid) next.valid += 1;
        else if (data.scanResult === 'ALREADY_USED') next.duplicate += 1;
        else next.rejected += 1;
        return next;
      });

      setRecentScans((prev) => [
        { ...data, timestamp: Date.now() },
        ...prev.slice(0, 19),
      ]);

      // Trigger audio & haptic feedback
      if (soundEnabled) {
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

      // Display high-visibility overlay
      setCurrentOverlay(data);

      if (data.valid && onTicketVerified) {
        onTicketVerified(data.ticket);
      }
    } catch (err: any) {
      console.error('Verify error:', err);
      const fallbackResult: VerifyResult = {
        valid: false,
        scanResult: 'NETWORK_ERROR',
        message: 'सर्व्हरशी संपर्क होऊ शकला नाही (Network/Verification Error)',
        ticketCode: rawCode,
      };
      setCurrentOverlay(fallbackResult);
      if (soundEnabled) playScanSound('error');
    } finally {
      setIsVerifying(false);
      // Brief cooldown before next camera scan to prevent double reading
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 1500);
    }
  }, [gateName, scannerUserId, soundEnabled, isVerifying, onTicketVerified]);

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
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
          return { width: Math.max(220, edge), height: Math.max(220, edge) };
        },
        aspectRatio: 1.0,
      };

      const cameraSelection: any = targetCamera || { facingMode: 'environment' };

      try {
        await html5Qr.start(
          cameraSelection,
          config,
          (decodedText) => {
            if (!isCooldownRef.current && !currentOverlay) {
              void verifyCode(decodedText);
            }
          },
          () => {}
        );
      } catch (errFallback) {
        // Fallback: Try with facingMode environment or user
        console.warn('Primary camera selection failed, trying environment fallback:', errFallback);
        await html5Qr.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isCooldownRef.current && !currentOverlay) {
              void verifyCode(decodedText);
            }
          },
          () => {}
        );
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
          alert('या डिव्हाइसवर फ्लॅशलाइट उपलब्ध नाही (Torch not supported on this lens)');
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
      alert('चित्रातून QR कोड वाचता आला नाही: ' + (err || 'Invalid image'));
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 sm:px-4 py-2">
      {/* Hidden container for file scanner helper */}
      <div id="admin-file-reader-dummy" className="hidden" />

      {/* Header & Gate Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight">
                  गेट तिकीट स्कॅनर (Admin Gate Scanner)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wide">
                  Live DB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                अधिकृत कॅमेरा स्कॅनिंग • डेटाबेस थेट पडताळणी • तात्काळ प्रवेश मंजुरी
              </p>
            </div>
          </div>

          {/* Gate Selector & Sound Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
              <input
                type="text"
                value={gateName}
                onChange={(e) => setGateName(e.target.value)}
                placeholder="Gate Name"
                className="bg-transparent text-white font-semibold focus:outline-none w-32 sm:w-40 text-xs"
              />
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'आवाज सुरू (Sound ON)' : 'आवाज बंद (Muted)'}
              className={`p-2.5 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-slate-800 text-amber-400 border-amber-500/30'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Metrics Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-medium text-slate-400">एकूण स्कॅन (Total)</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {metrics.total}
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-semibold text-emerald-400">प्रवेश मंजूर (Valid)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {metrics.valid}
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-semibold text-amber-400">पुनरावृत्ती (Duplicate)</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-0.5">
              {metrics.duplicate}
            </div>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-semibold text-rose-400">नाकारले (Rejected)</div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-0.5">
              {metrics.rejected}
            </div>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Camera Viewport & Overlay */}
        <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-square sm:aspect-[4/3] max-w-lg mx-auto flex items-center justify-center min-h-[300px]">
          {/* Html5Qrcode viewfinder mount - must stay rendered so dimensions are calculable */}
          <div
            id={scannerContainerId}
            className="w-full h-full min-h-[300px]"
          />

          {/* Idle Camera Placeholder */}
          {!cameraActive && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 space-y-4 z-10">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Camera className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  कॅमेरा बंद आहे (Camera Offline)
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  तिकीट QR कोड स्कॅन करण्यासाठी खालील &quot;कॅमेरा सुरू करा&quot; बटण दाबा
                </p>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs text-left max-w-xs mx-auto">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>त्रुटी</span>
                  </div>
                  <p className="mt-1">{cameraError}</p>
                </div>
              )}

              <button
                onClick={() => void startCamera()}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm transition shadow-lg flex items-center gap-2 mx-auto"
              >
                <Camera className="w-4 h-4" />
                <span>कॅमेरा सुरू करा (Start Camera)</span>
              </button>
            </div>
          )}

          {/* Target Reticle Frame when active */}
          {cameraActive && !currentOverlay && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-amber-400/80 rounded-3xl relative shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                {/* Reticle corner accents */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                {/* Sweeping laser line animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce mt-32 opacity-80" />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* HIGH CONTRAST VERIFIED / INVALID OVERLAY                         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentOverlay && (
            <div className="absolute inset-0 z-30 flex flex-col justify-between p-5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
              {/* Top Banner Status */}
              {currentOverlay.valid ? (
                /* ─── SUCCESS / VERIFIED PASS ─── */
                <div className="bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 rounded-2xl p-4 sm:p-5 text-center shadow-[0_0_40px_rgba(16,185,129,0.35)] space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-300 animate-pulse">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider mb-1">
                      सत्यापित पास • VERIFIED PASS
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
                      प्रवेश मंजूर (Entry Approved)
                    </h2>
                    <p className="text-xs font-semibold text-emerald-300 mt-1">
                      {currentOverlay.message}
                    </p>
                  </div>

                  {currentOverlay.ticket && (
                    <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 text-left text-xs space-y-2 mt-3 text-slate-200">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          प्रेक्षक (Attendee):
                        </span>
                        <span className="font-extrabold text-white text-sm">
                          {currentOverlay.ticket.attendee}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-amber-400" />
                          आसन क्रमांक (Seat):
                        </span>
                        <span className="font-black font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-sm">
                          {currentOverlay.ticket.seat || 'सामान्य (General)'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-sky-400" />
                          कार्यक्रम (Event):
                        </span>
                        <span className="font-semibold text-white truncate max-w-[190px]">
                          {currentOverlay.ticket.eventMr || currentOverlay.ticket.event}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDismissOverlay}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>पुढील तिकीट स्कॅन करा (Scan Next Ticket)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : currentOverlay.scanResult === 'ALREADY_USED' ? (
                /* ─── WARNING: ALREADY USED / FRAUD PREVENTION ─── */
                <div className="bg-amber-950/95 border-2 border-amber-400 text-amber-300 rounded-2xl p-4 sm:p-5 text-center shadow-[0_0_40px_rgba(245,158,11,0.35)] space-y-3">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300">
                    <AlertTriangle className="w-10 h-10 animate-bounce" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider mb-1">
                      सावधान! आधीच वापरलेले (ALREADY USED)
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
                      प्रवेश नाकारला (Access Denied)
                    </h2>
                    <p className="text-xs font-semibold text-amber-200 mt-1">
                      हे तिकीट याआधीच गेटवर स्कॅन केले गेले आहे!
                    </p>
                  </div>

                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5 text-left text-xs space-y-2 mt-3 text-slate-200">
                    {currentOverlay.alreadyScannedAt && (
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          पहिले स्कॅन (First Scanned):
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {new Date(currentOverlay.alreadyScannedAt).toLocaleTimeString()} ({currentOverlay.previousGate || 'Gate 1'})
                        </span>
                      </div>
                    )}

                    {currentOverlay.ticket && (
                      <>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <span className="text-slate-400">नोंदणी नाव:</span>
                          <span className="font-bold text-white">{currentOverlay.ticket.attendee}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">आसन क्र.:</span>
                          <span className="font-mono font-bold text-amber-400">{currentOverlay.ticket.seat}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleDismissOverlay}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>तपासणी पूर्ण / स्कॅन सुरू ठेवा (Resume Scanning)</span>
                  </button>
                </div>
              ) : (
                /* ─── ERROR: INVALID TICKET ─── */
                <div className="bg-rose-950/95 border-2 border-rose-500 text-rose-300 rounded-2xl p-4 sm:p-5 text-center shadow-[0_0_40px_rgba(244,63,94,0.4)] space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs uppercase tracking-wider mb-1">
                      अवैध तिकीट • INVALID TICKET
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
                      प्रवेश अमान्य (Rejected)
                    </h2>
                    <p className="text-xs font-semibold text-rose-200 mt-1">
                      {currentOverlay.message}
                    </p>
                  </div>

                  {currentOverlay.ticketCode && (
                    <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3 text-center text-xs">
                      <span className="text-slate-400 block text-[11px]">स्कॅन केलेला कोड:</span>
                      <span className="font-mono font-bold text-rose-300 text-sm mt-0.5 block break-all">
                        {currentOverlay.ticketCode}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleDismissOverlay}
                    className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>पुन्हा स्कॅन करा (Retry / Scan Again)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Control Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-800">
          {cameraActive ? (
            <>
              <button
                onClick={() => void stopCamera()}
                className="px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 font-bold text-xs flex items-center gap-2 transition"
              >
                <CameraOff className="w-4 h-4" />
                <span>कॅमेरा थांबवा</span>
              </button>

              {cameras.length > 1 && (
                <button
                  onClick={handleSwitchCamera}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 font-bold text-xs flex items-center gap-2 transition"
                >
                  <SwitchCamera className="w-4 h-4 text-sky-400" />
                  <span>कॅमेरा बदला ({cameras.length})</span>
                </button>
              )}

              <button
                onClick={handleToggleTorch}
                className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4 text-slate-400" />}
                <span>{torchOn ? 'फ्लॅशलाइट सुरू' : 'फ्लॅशलाइट टॉगल'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => void startCamera()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>कॅमेरा चालू करा</span>
            </button>
          )}

          {/* Upload QR image */}
          <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 font-bold text-xs flex items-center gap-2 transition">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>इमेज QR अपलोड करा</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Manual Code Input Form */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="उदा. TG-TKT-101 किंवा तिकीट कोड मॅन्युअली टाईप करा..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying || !manualCode.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-700 shrink-0"
            >
              {isVerifying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>कोड तपासा</span>
            </button>
          </form>
        </div>
      </div>

      {/* Recent Scans Session Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">
              सत्रातील अलीकडील स्कॅन्स (Recent Scans Log)
            </h3>
            <span className="text-xs text-slate-500 font-mono">({recentScans.length})</span>
          </div>

          {onViewVerifiedList && (
            <button
              onClick={onViewVerifiedList}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
            >
              <span>सर्व सत्यापित तिकिटे पहा</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentScans.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            या सत्रात अद्याप कोणतेही तिकीट स्कॅन केलेले नाही. कॅमेराने QR कोड स्कॅन करा.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {recentScans.map((scan, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  {scan.valid ? (
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : scan.scanResult === 'ALREADY_USED' ? (
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <XCircle className="w-4 h-4" />
                    </div>
                  )}

                  <div>
                    <div className="font-bold text-white">
                      {scan.ticket?.attendee || scan.ticketCode || 'अज्ञात ग्राहक'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-amber-400">
                        {scan.ticket?.seat ? `आसन: ${scan.ticket.seat}` : (scan.ticketCode || 'Code')}
                      </span>
                      {scan.ticket?.eventMr && (
                        <span className="truncate max-w-[120px] text-slate-500">
                          • {scan.ticket.eventMr}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      scan.valid
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                        : scan.scanResult === 'ALREADY_USED'
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {scan.valid ? 'VALID' : scan.scanResult === 'ALREADY_USED' ? 'DUPLICATE' : 'INVALID'}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {new Date(scan.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
