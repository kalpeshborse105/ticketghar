/**
 * Contact & external link constants — mirrors web /contact page
 * (https://mahaticket.kalpkrutinfotech.com/contact)
 */
import { Alert, Linking } from 'react-native';

export const WEB_ORIGIN = 'https://mahaticket.kalpkrutinfotech.com';
export const WEB_CONTACT_URL = `${WEB_ORIGIN}/contact`;
export const WEB_ADMIN_URL = `${WEB_ORIGIN}/admin`;
export const PARTNER_API_URL = `${WEB_ORIGIN}/api/partner-with-us`;

export const ANDROID_PACKAGE = 'com.mahaticket';
export const PLAY_MARKET_URL = `market://details?id=${ANDROID_PACKAGE}`;
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export const CONTACT = {
  emails: {
    support: 'support@mahaticket.in',
    bookings: 'bookings@mahaticket.in',
    partners: 'partners@mahaticket.in',
  },
  // Web page currently shows a placeholder number; leave empty until a real line is published.
  phone: '',
  whatsapp: '',
  hours: 'Monday to Saturday, 10:00 AM – 7:00 PM IST',
  closed: 'Sunday & public holidays: closed',
  responseTime: 'Email response time: within 24–48 hours',
  address: ['Kalpkrut Infotech', 'Pune, Maharashtra', 'India – 411001'],
};

export async function openUrl(url: string, failMessage = 'Could not open this link.') {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open', failMessage);
  }
}

export function openMailto(to: string, subject: string, body: string) {
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return openUrl(url, `No email app found. Please write to ${to}.`);
}

/** Opens Play Store app page; falls back to HTTPS page if market:// is unavailable. */
export async function openPlayStoreListing() {
  try {
    await Linking.openURL(PLAY_MARKET_URL);
  } catch {
    try {
      await Linking.openURL(PLAY_STORE_URL);
    } catch {
      Alert.alert('Unable to open', 'Could not open the Play Store.');
    }
  }
}
