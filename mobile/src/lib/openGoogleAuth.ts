import { Platform } from 'react-native';
import { resolveApiBase } from '../api';

/**
 * Build Google OAuth URL for in-app WebView (preferred) or external browser fallback.
 * In-app WebView intercepts /auth/mobile-done?token=… and closes — no stuck Chrome tab.
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const base = await resolveApiBase();
  return `${base.replace(/\/$/, '')}/api/auth/google?direct=true&source=mobile`;
}

/** @deprecated Prefer getGoogleAuthUrl + in-app WebView */
export async function openGoogleAuthInApp(): Promise<string> {
  return getGoogleAuthUrl();
}

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}
