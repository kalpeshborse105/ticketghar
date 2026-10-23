import { Linking, Platform } from 'react-native';
import { resolveApiBase } from '../api';

/**
 * Open Google OAuth for the Android app.
 * Do NOT force com.android.chrome — that leaves the user stuck in a Chrome tab
 * after /auth/mobile-done because Custom-Tabs / app-task association is lost.
 * Plain https Linking.openURL uses the system browser / Custom Tabs tied to the app.
 */
export async function openGoogleAuthInApp(): Promise<void> {
  const base = await resolveApiBase();
  const targetUrl = `${base.replace(/\/$/, '')}/api/auth/google?direct=true&source=mobile`;

  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(targetUrl);
      return;
    } catch {
      // fall through
    }
  }

  await Linking.openURL(targetUrl);
}
