/**
 * Native theater-gate QR scanner — VisionCamera useCodeScanner.
 * Crash-safe: missing native module / camera errors show UI instead of killing the app.
 * @see https://github.com/mrousavy/react-native-vision-camera
 */
import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  active: boolean;
  locked?: boolean;
  onScan: (raw: string) => void;
  onError?: (message: string) => void;
};

type CamAPI = {
  Camera: React.ComponentType<any>;
  useCameraDevice: (pos: 'front' | 'back') => any;
  useCameraPermission: () => {
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
  };
  useCodeScanner: (opts: {
    codeTypes: string[];
    onCodeScanned: (codes: { value?: string }[]) => void;
  }) => any;
};

let camApi: CamAPI | null = null;
let camLoadError: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  camApi = require('react-native-vision-camera') as CamAPI;
} catch (e: any) {
  camLoadError = e?.message || 'VisionCamera native module missing';
}

class ScannerErrorBoundary extends Component<
  { children: React.ReactNode; onCrash: (msg: string) => void },
  { crashed: boolean; message: string }
> {
  state = { crashed: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { crashed: true, message: error?.message || 'Camera crash' };
  }

  componentDidCatch(error: Error) {
    this.props.onCrash(error?.message || 'Camera crash');
  }

  render() {
    if (this.state.crashed) {
      return (
        <View style={styles.center}>
          <Icon name="alert-circle" size={40} color="#FB7185" />
          <Text style={styles.title}>Camera crash</Text>
          <Text style={styles.sub}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function GateQrScannerInner({ active, locked = false, onScan, onError }: Props) {
  // camApi guaranteed by parent before mount
  const { Camera, useCameraDevice, useCameraPermission, useCodeScanner } = camApi!;
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [torch, setTorch] = useState(false);
  const lastRawRef = useRef('');
  const lastAtRef = useRef(0);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!active || hasPermission) return;
    void (async () => {
      try {
        const ok = await requestPermission();
        if (!ok) {
          onErrorRef.current?.(
            'कॅमेरा परवानगी नाकारली. Settings → Permissions → Camera → Allow.'
          );
        }
      } catch (e: any) {
        onErrorRef.current?.(e?.message || 'Permission error');
      }
    })();
  }, [active, hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!active || locked) return;
      const raw = (codes[0]?.value || '').trim();
      if (!raw) return;
      const now = Date.now();
      if (raw === lastRawRef.current && now - lastAtRef.current < 1800) return;
      lastRawRef.current = raw;
      lastAtRef.current = now;
      try {
        onScanRef.current(raw);
      } catch {
        /* ignore */
      }
    },
  });

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => undefined);
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Icon name="camera-off" size={40} color="#F97316" />
        <Text style={styles.title}>कॅमेरा परवानगी आवश्यक</Text>
        <Text style={styles.sub}>Gate QR स्कॅनसाठी Camera Allow करा.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => void requestPermission()}>
          <Text style={styles.btnText}>परवानगी मागा</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={openSettings}>
          <Text style={styles.linkText}>App Settings उघडा</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Icon name="camera-off" size={40} color="#F97316" />
        <Text style={styles.title}>कॅमेरा सापडला नाही</Text>
        <Text style={styles.sub}>डिव्हाइसवर बॅक कॅमेरा उपलब्ध नाही.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!!active}
        codeScanner={codeScanner}
        torch={torch && device.hasTorch ? 'on' : 'off'}
        enableZoomGesture={false}
        onError={(e: { message?: string }) => {
          onErrorRef.current?.(e?.message || 'Camera error');
        }}
      />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.viewfinder} />
        <Text style={styles.hint}>
          {locked ? 'तपासत आहे…' : 'तिकीट QR फ्रेममध्ये धरा · दूरूनही स्कॅन'}
        </Text>
      </View>

      {device.hasTorch ? (
        <TouchableOpacity
          style={styles.torchBtn}
          onPress={() => setTorch((t) => !t)}
          accessibilityLabel="Torch"
        >
          <Icon name={torch ? 'flashlight' : 'flashlight-off'} size={20} color="#FFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function GateQrScanner(props: Props) {
  if (!camApi) {
    return (
      <View style={styles.center}>
        <Icon name="camera-off" size={40} color="#F97316" />
        <Text style={styles.title}>Native scanner unavailable</Text>
        <Text style={styles.sub}>{camLoadError || 'Install APK with VisionCamera'}</Text>
      </View>
    );
  }

  return (
    <ScannerErrorBoundary
      onCrash={(msg) => {
        props.onError?.(msg);
      }}
    >
      <GateQrScannerInner {...props} />
    </ScannerErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  btn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  linkBtn: { padding: 8 },
  linkText: { color: '#FDBA74', fontWeight: '700', fontSize: 13 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#22C55E',
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 18,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  torchBtn: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
