/**
 * MahaTicket Android — App Entry Point
 * Event ticketing for Maharashtra theatres & live shows
 */
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation';
import { COLORS } from './src/theme/colors';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore, useEventsStore } from './src/store';

export default function App() {
  useEffect(() => {
    // 0ms instant startup cache hydration
    useAuthStore.getState().loadStoredAuth().catch(() => null);
    useEventsStore.getState().loadCachedEvents().catch(() => null);
    const decodeTokenUser = (token: string): any | null => {
      try {
        const payloadPart = token.split('.')[0];
        if (!payloadPart) return null;
        const padded = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
        const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
        let json = '';
        if (typeof Buffer !== 'undefined') {
          json = Buffer.from(b64, 'base64').toString('utf8');
        } else if (typeof atob === 'function') {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          if (typeof TextDecoder !== 'undefined') {
            json = new TextDecoder().decode(bytes);
          } else {
            json = decodeURIComponent(escape(binary));
          }
        }
        const data = JSON.parse(json);
        if (!data?.email || !data?.id) return null;
        if (data.exp && Date.now() > Number(data.exp)) return null;
        return data;
      } catch {
        return null;
      }
    };

    const handleUrl = (event: { url: string }) => {
      const url = event?.url;
      if (!url || !url.startsWith('mahaticket://')) return;

      if (url.includes('auth/callback')) {
        try {
          const matchToken = url.match(/[?&]token=([^&]+)/);
          const matchUser = url.match(/[?&]user=([^&]+)/);
          if (matchToken && matchToken[1]) {
            const token = decodeURIComponent(matchToken[1]);
            let userObj: any = null;
            if (matchUser && matchUser[1]) {
              try {
                userObj = JSON.parse(decodeURIComponent(matchUser[1]));
              } catch {
                userObj = null;
              }
            }
            if (!userObj) {
              userObj = decodeTokenUser(token);
            }
            if (userObj && token && token.includes('.')) {
              useAuthStore
                .getState()
                .setAuth(
                  {
                    id: userObj.id,
                    name: userObj.fullName || userObj.name,
                    email: userObj.email,
                    phone: userObj.phone || userObj.phoneNumber,
                    avatarUrl: userObj.avatarUrl,
                    role: userObj.role || 'customer',
                  },
                  token
                )
                .then(() => {
                  useAuthStore.getState().syncUserProfile().catch(() => null);
                })
                .catch(() => null);
              Toast.show({
                type: 'success',
                text1: 'साइन इन यशस्वी (Signed In)',
                text2: `${userObj.fullName || userObj.name || userObj.email} आपले स्वागत आहे!`,
              });
            }
          }
        } catch (e) {
          console.error('Deep link auth error:', e);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.bg}
          translucent={false}
        />
        <ErrorBoundary>
          <NavigationContainer
            theme={{
              ...DefaultTheme,
              colors: {
                ...DefaultTheme.colors,
                primary: COLORS.primary,
                background: COLORS.bg,
                card: COLORS.surface,
                text: COLORS.text,
                border: COLORS.border,
                notification: COLORS.accent,
              },
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </ErrorBoundary>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
