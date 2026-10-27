import { Platform } from 'react-native';
import { resolveApiBase } from '../api';

/**
 * Google OAuth URL for mobile — open in system Chrome/browser so existing Google
 * accounts appear. Callback lands on /auth/mobile-done → mahaticket:// deep link.
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const base = await resolveApiBase();
  return `${base.replace(/\/$/, '')}/api/auth/google?direct=true&source=mobile`;
}

export async function openGoogleAuthInApp(): Promise<string> {
  return getGoogleAuthUrl();
}

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}
