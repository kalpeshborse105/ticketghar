/**
 * In-app Google OAuth — WebView closes automatically after /auth/mobile-done success.
 * Avoids stuck Chrome tabs that never return to the MahaTicket app.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../theme';
import { useAuthStore } from '../store';
import Toast from 'react-native-toast-message';

type Props = {
  visible: boolean;
  authUrl: string;
  onClose: () => void;
  onSuccess?: () => void;
};

function decodeTokenUser(token: string): any | null {
  try {
    const payloadPart = token.split('.')[0];
    if (!payloadPart) return null;
    const padded = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
    const data = JSON.parse(json);
    if (!data?.email || !data?.id) return null;
    if (data.exp && Date.now() > Number(data.exp)) return null;
    return data;
  } catch {
    return null;
  }
}

function extractTokenFromUrl(url: string): string | null {
  try {
    if (url.startsWith('mahaticket://')) {
      const m = url.match(/[?&]token=([^&]+)/);
      return m?.[1] ? decodeURIComponent(m[1]) : null;
    }
    if (url.includes('/auth/mobile-done')) {
      const q = url.split('?')[1] || '';
      const params = new URLSearchParams(q);
      const err = params.get('error');
      if (err) return null;
      return params.get('token');
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function GoogleAuthWebView({ visible, authUrl, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const handled = useRef(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const finishWithToken = useCallback(
    async (token: string) => {
      if (handled.current) return;
      if (!token || !token.includes('.')) return;
      handled.current = true;
      const userObj = decodeTokenUser(token);
      if (!userObj) {
        handled.current = false;
        Toast.show({
          type: 'error',
          text1: 'Login failed',
          text2: 'Invalid session token. Please try again.',
        });
        onClose();
        return;
      }
      try {
        await setAuth(
          {
            id: userObj.id,
            name: userObj.fullName || userObj.name,
            email: userObj.email,
            phone: userObj.phone || userObj.phoneNumber,
            avatarUrl: userObj.avatarUrl,
            role: userObj.role || 'customer',
          },
          token
        );
        Toast.show({
          type: 'success',
          text1: 'साइन इन यशस्वी (Signed In)',
          text2: `${userObj.fullName || userObj.name || userObj.email}`,
        });
        onClose();
        onSuccess?.();
      } catch {
        handled.current = false;
        Toast.show({ type: 'error', text1: 'Could not save session' });
        onClose();
      }
    },
    [onClose, onSuccess, setAuth]
  );

  const onNav = useCallback(
    (nav: WebViewNavigation) => {
      const url = nav?.url || '';
      if (!url) return;
      if (url.startsWith('mahaticket://') || url.includes('/auth/mobile-done')) {
        const token = extractTokenFromUrl(url);
        if (token) {
          finishWithToken(token);
        } else if (url.includes('error=')) {
          Toast.show({ type: 'error', text1: 'Google login cancelled or failed' });
          onClose();
        }
      }
    },
    [finishWithToken, onClose]
  );

  const onShouldStart = useCallback(
    (req: { url: string }) => {
      const url = req?.url || '';
      if (url.startsWith('mahaticket://')) {
        const token = extractTokenFromUrl(url);
        if (token) finishWithToken(token);
        return false;
      }
      if (url.includes('/auth/mobile-done')) {
        const token = extractTokenFromUrl(url);
        if (token) {
          finishWithToken(token);
          return false;
        }
      }
      return true;
    },
    [finishWithToken]
  );

  if (!visible || !authUrl) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Icon name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Google Sign-In</Text>
          <View style={{ width: 40 }} />
        </View>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : null}
        <WebView
          source={{ uri: authUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={onNav}
          onShouldStartLoadWithRequest={Platform.OS === 'ios' ? onShouldStart : onShouldStart}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          style={styles.webview}
          userAgent={
            Platform.OS === 'android'
              ? 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MahaTicketApp/1.0'
              : undefined
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  loader: {
    ...StyleSheet.absoluteFillObject,
    top: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  webview: { flex: 1 },
});
