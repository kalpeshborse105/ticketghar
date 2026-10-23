import { Linking, Platform } from 'react-native';
import { resolveApiBase } from '../api';

/**
 * Open Google OAuth inside Chrome Custom Tabs (Android) so the
 * mahaticket:// deep-link returns into the app instead of a stuck browser tab.
 */
export async function openGoogleAuthInApp(): Promise<void> {
  const base = await resolveApiBase();
  const targetUrl = `${base.replace(/\/$/, '')}/api/auth/google?direct=true&source=mobile`;

  if (Platform.OS === 'android') {
    // Chrome Custom Tabs via Intent — stays associated with the app task
    const hostPath = targetUrl.replace(/^https?:\/\//, '');
    const intentUrl =
      `intent://${hostPath}` +
      '#Intent;scheme=https;package=com.android.chrome;' +
      'S.browser_fallback_url=' +
      encodeURIComponent(targetUrl) +
      ';end';
    try {
      await Linking.openURL(intentUrl);
      return;
    } catch {
      // fall through to https
    }
  }

  await Linking.openURL(targetUrl);
}
