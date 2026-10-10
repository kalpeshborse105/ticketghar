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
  scannerOrganizerId?: number | string;
  targetEventId?: number | string;
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
  initialGateName = 'Main Entry Gate 1',
  onTicketVerified,
  onViewVerifiedList,
}) => {
  const [gateName, setGateName] = useState(initialGateName);
  const [targetEventId, setTargetEventId] = useState<string | number | undefined>(initialTargetEventId);
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
          scannerOrganizerId: scannerOrganizerId,
          targetEventId: targetEventId,
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
  }, [gateName, scannerUserId, scannerOrganizerId, targetEventId, soundEnabled, isVerifying, onTicketVerified]);

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
    <div className="w-full max-w-lg mx-auto bg-[#F9F9FF] min-h-screen text-[#141B2B] flex flex-col pb-16 font-sans">
      {/* Hidden file upload reader helper */}
      <div id="admin-file-reader-dummy" className="hidden" />

      {/* Stitch Header */}
      <header className="sticky top-0 z-30 bg-[#FFF7ED]/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between shadow-xs">
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

      {/* Dark Console Bar (Stitch Exact) */}
      <div className="bg-[#141B2B] text-white p-4 flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Ticket className="w-5 h-5 text-[#FD6B36] shrink-0" />
            <button className="flex items-center gap-1.5 text-left truncate font-bold text-base text-white">
              <span className="truncate">नियम व अटी लागू</span>
            </button>
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
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-white">आज ५:०० PM शो</span>
            <span>•</span>
            <span className="bg-[#EA580C]/25 text-orange-200 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-orange-500/30">
              {gateName || 'गेट २ (Stall Entry)'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-300">
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
                        {currentOverlay.scanResult === 'ALREADY_USED' ? '⚠ आधीच वापरलेले (DUPLICATE)' : '✗ अवैध तिकीट (INVALID)'}
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
                        {currentOverlay.ticket?.attendee || 'अनिकेत जोशी'}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">Aniket Joshi</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">आसन / SEATS</span>
                      <p className="text-base font-bold text-[#EA580C]">
                        {currentOverlay.ticket?.seat || 'स्टॉल ए • E8, E9'}
                      </p>
                      <span className="inline-block bg-orange-100 text-[#EA580C] px-2 py-0.5 rounded text-[11px] font-bold">
                        २ व्यक्ती (2 Pax)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">गेट & तिकीट ID</span>
                      <span className="text-xs font-semibold text-[#141B2B] truncate">
                        {gateName || 'गेट २'} • {currentOverlay.ticketCode || '#MT-2025-88492'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">प्रवेश स्थिती</span>
                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        currentOverlay.valid ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          currentOverlay.valid ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        {currentOverlay.valid ? 'प्रवेश मंजूर' : 'प्रवेश नाकारला'}
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
                          message: `नाव: ${currentOverlay.ticket?.attendee || 'अनिकेत जोशी'}\nकोड: ${currentOverlay.ticketCode || 'MT-88492'}`,
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

        {/* Gate Attendance Progress Card (Stitch Exact) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">गेट उपस्थिती / ATTENDANCE</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#141B2B]">{438 + metrics.valid}</span>
                <span className="text-xs text-slate-500">/ 650 तिकीटे</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-[#EA580C]">
                {Math.min(100, Math.round(((438 + metrics.valid) / 650) * 100))}%
              </span>
              <span className="text-[11px] text-emerald-600 block font-semibold">Fast Flowing</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#EA580C] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(((438 + metrics.valid) / 650) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
            <span>स्टॉल: {280 + metrics.valid}/350</span>
            <span>बाल्कनी: 158/300</span>
            <span className="text-[#EA580C] font-semibold">गती: ~14 scans/min</span>
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
              QR कोड स्कॅन होत नसल्यास किंवा कॅमेरा त्रुटी असल्यास तिकीट कोड हाताने भरा.
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="उदा. MT-2025-XXXXX"
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
                        {scan.ticket?.attendee || scan.ticketCode || 'अनिकेत जोशी'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {scan.ticket?.seat ? `आसन: ${scan.ticket.seat}` : '#MT-88491'} • {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <>
                <div className="bg-white p-3 rounded-xl flex items-center justify-between shadow-2xs border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-[#141B2B]">रोहन देशपांडे • B12</h4>
                      <p className="text-[10px] text-slate-500">#MT-88491 • ५:१० PM</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">Gate 2</span>
                </div>
                <div className="bg-white p-3 rounded-xl flex items-center justify-between shadow-2xs border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-[#141B2B]">प्रियांका कुलकर्णी • C4, C5</h4>
                      <p className="text-[10px] text-slate-500">#MT-88490 • ५:०८ PM</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">Gate 2</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Protocol Footer */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-slate-400">
            MahaTicket Verified FastGate Protocol v4.2 • बाळ गंधर्व रंगमंदिर, पुणे
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

