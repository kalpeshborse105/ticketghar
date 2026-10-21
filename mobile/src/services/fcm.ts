/**
 * Build-safe FCM scaffold for React Native.
 *
 * Wire `@react-native-firebase/messaging` only after Firebase env/native
 * setup is complete. Until then these helpers intentionally no-op so the
 * mobile app keeps building without optional Firebase packages installed.
 */

export async function registerForPush(): Promise<boolean> {
  return false;
}

export async function getToken(): Promise<string | null> {
  return null;
}
