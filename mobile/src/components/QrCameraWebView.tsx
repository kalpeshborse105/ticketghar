/**
 * FastGate camera for Android.
 * Prefer HTTPS bridge page; fallback to inline HTML with https baseUrl
 * (fixes file:// getUserMedia crashes). Never nest this inside ScrollView.
 */
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { WEB_ORIGIN } from '../lib/contact';

const SCANNER_URI = `${WEB_ORIGIN}/scanner-bridge.html?v=3`;

/** Same logic as public/scanner-bridge.html — used when remote page unavailable */
const INLINE_HTML = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
<style>
html,body{margin:0;padding:0;width:100%;height:100%;background:#0B1220;overflow:hidden}
#reader{width:100%;height:100%}
#reader video{object-fit:cover!important;width:100%!important;height:100%!important}
#status{position:fixed;left:12px;right:12px;bottom:14px;z-index:5;background:rgba(0,0,0,.7);color:#fff;font:600 12px system-ui;text-align:center;padding:8px 10px;border-radius:10px}
</style></head><body>
<div id="reader"></div><div id="status">कॅमेरा तयार…</div>
<script>
(function(){
  function post(p){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(p))}catch(e){}}
  var st=document.getElementById('status'), last='', lastAt=0, started=false, scanner=null;
  function start(){
    if(started)return;
    if(typeof Html5Qrcode==='undefined'){st.textContent='स्कॅनर लोड अयशस्वी';post({type:'error',message:'html5-qrcode missing'});return;}
    started=true;
    try{scanner=new Html5Qrcode('reader')}catch(e){started=false;post({type:'error',message:String(e&&e.message||e)});return;}
    Html5Qrcode.getCameras().then(function(cams){
      if(!cams||!cams.length){st.textContent='कॅमेरा नाही';post({type:'error',message:'No camera'});return;}
      var back=cams.find(function(c){return /back|rear|environment/i.test(c.label||'')})||cams[cams.length-1]||cams[0];
      return scanner.start(back.id,{fps:10,qrbox:function(w,h){var s=Math.floor(Math.min(w,h)*0.68);return{width:Math.max(160,s),height:Math.max(160,s)}},aspectRatio:1},function(d){
        var n=Date.now();if(!d||(d===last&&n-lastAt<1800))return;last=d;lastAt=n;st.textContent='पडताळत आहे…';post({type:'scan',code:String(d)});
      },function(){});
    }).then(function(){st.textContent='Live · QR फ्रेममध्ये धरा';post({type:'ready'})})
    .catch(function(err){started=false;st.textContent='कॅमेरा सुरू नाही';post({type:'error',message:String(err&&err.message||err)})});
  }
  setTimeout(start,400);post({type:'boot'});
})();
</script></body></html>`;

type Props = {
  active: boolean;
  onScan: (code: string) => void;
  onError?: (message: string) => void;
  onReady?: () => void;
};

export default function QrCameraWebView({ active, onScan, onError, onReady }: Props) {
  const lastHandledRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [useInline, setUseInline] = useState(false);

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
      } else if (data.type === 'ready') {
        onReady?.();
      } else if (data.type === 'error') {
        onError?.(String(data.message || 'Camera error'));
      }
    } catch {
      /* ignore */
    }
  };

  const permissionProps =
    Platform.OS === 'android'
      ? {
          onPermissionRequest: (request: any) => {
            try {
              if (request?.grant) {
                request.grant(request.resources || request.getResources?.() || []);
              } else if (request?.nativeEvent?.request?.grant) {
                const r = request.nativeEvent.request;
                r.grant(r.getResources?.() || []);
              }
            } catch {
              /* ignore */
            }
          },
        }
      : {};

  return (
    <WebView
      key={useInline ? 'inline' : 'remote'}
      source={
        useInline
          ? { html: INLINE_HTML, baseUrl: `${WEB_ORIGIN}/` }
          : { uri: SCANNER_URI }
      }
      style={styles.web}
      onMessage={onMessage}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mixedContentMode="always"
      setSupportMultipleWindows={false}
      allowsFullscreenVideo={false}
      mediaCapturePermissionGrantType="grant"
      androidLayerType="hardware"
      cacheEnabled={false}
      onError={() => {
        if (!useInline) {
          setUseInline(true);
          return;
        }
        onError?.('Scanner WebView failed');
      }}
      onHttpError={() => {
        if (!useInline) setUseInline(true);
      }}
      {...permissionProps}
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
