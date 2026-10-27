/**
 * FastGate-style QR camera via WebView + html5-qrcode (no native camera dep).
 * Posts decoded text to RN through onMessage.
 */
import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const SCANNER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #0B1220; overflow: hidden; }
    #reader { width: 100%; height: 100%; }
    #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
    #status {
      position: fixed; left: 12px; right: 12px; bottom: 14px; z-index: 5;
      background: rgba(0,0,0,0.65); color: #fff; font: 600 12px system-ui, sans-serif;
      text-align: center; padding: 8px 10px; border-radius: 10px;
    }
  </style>
</head>
<body>
  <div id="reader"></div>
  <div id="status">QR फ्रेममध्ये धरा…</div>
  <script>
    function post(payload) {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      } catch (e) {}
    }
    var lastCode = '';
    var lastAt = 0;
    var scanner = new Html5Qrcode('reader');
    var statusEl = document.getElementById('status');
    Html5Qrcode.getCameras().then(function (cams) {
      if (!cams || !cams.length) {
        statusEl.textContent = 'कॅमेरा सापडला नाही';
        post({ type: 'error', message: 'No camera found' });
        return;
      }
      var back = cams.find(function (c) {
        return /back|rear|environment|त्र/i.test(c.label || '');
      }) || cams[cams.length - 1] || cams[0];
      scanner.start(
        back.id,
        { fps: 12, qrbox: function (w, h) {
          var s = Math.floor(Math.min(w, h) * 0.72);
          return { width: s, height: s };
        }, aspectRatio: 1.0 },
        function (decoded) {
          var now = Date.now();
          if (!decoded || (decoded === lastCode && now - lastAt < 1800)) return;
          lastCode = decoded;
          lastAt = now;
          statusEl.textContent = 'पडताळत आहे…';
          post({ type: 'scan', code: decoded });
        },
        function () {}
      ).then(function () {
        statusEl.textContent = 'Live · QR फ्रेममध्ये धरा';
        post({ type: 'ready' });
      }).catch(function (err) {
        statusEl.textContent = 'कॅमेरा सुरू झाला नाही';
        post({ type: 'error', message: String(err && err.message || err) });
      });
    }).catch(function (err) {
      statusEl.textContent = 'कॅमेरा परवानगी नाही';
      post({ type: 'error', message: String(err && err.message || err) });
    });
  </script>
</body>
</html>`;

type Props = {
  active: boolean;
  onScan: (code: string) => void;
  onError?: (message: string) => void;
};

export default function QrCameraWebView({ active, onScan, onError }: Props) {
  const lastHandledRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const html = useMemo(() => SCANNER_HTML, []);

  if (!active) {
    return <View style={styles.placeholder} />;
  }

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data || '{}');
      if (data.type === 'scan' && typeof data.code === 'string') {
        const now = Date.now();
        if (data.code === lastHandledRef.current.code && now - lastHandledRef.current.at < 1600) {
          return;
        }
        lastHandledRef.current = { code: data.code, at: now };
        onScan(data.code);
      } else if (data.type === 'error' && onError) {
        onError(String(data.message || 'Camera error'));
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={styles.web}
      onMessage={onMessage}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
      mediaCapturePermissionGrantType="grant"
      allowsFullscreenVideo={false}
      setSupportMultipleWindows={false}
    />
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
});
