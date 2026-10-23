/**
 * Native ticket pass downloader for MahaTicket.
 * Prefer authenticated DownloadManager (Bearer) or short-lived ?t= token URLs.
 */
import { NativeModules, Platform, ToastAndroid, Linking, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { TicketDownloader } = NativeModules;

let downloadInFlight = false;

async function resolveAuthHeader(): Promise<string | null> {
  try {
    const token =
      (await AsyncStorage.getItem('@tg_session_token')) ||
      (await AsyncStorage.getItem('@mahaticket_session_token'));
    if (token && token.includes('.') && !token.startsWith('mt-tok') && !token.startsWith('mt-token')) {
      return `Bearer ${token}`;
    }
  } catch {}
  return null;
}

function withSingleDownloadFlag(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('download', '1');
    return u.toString();
  } catch {
    if (url.includes('download=1')) return url;
    return url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
  }
}

export async function downloadTicketPdf(params: {
  url: string;
  filename: string;
  title?: string;
  description?: string;
  /** Short-lived server-minted PDF token (preferred over public URL) */
  pdfToken?: string | null;
}): Promise<boolean> {
  if (downloadInFlight) {
    if (Platform.OS === 'android') {
      ToastAndroid.show('डाउनलोड आधीच सुरू आहे...', ToastAndroid.SHORT);
    }
    return false;
  }
  downloadInFlight = true;

  try {
    const {
      filename,
      title = 'MahaTicket Pass',
      description = 'Downloading official admission pass',
      pdfToken,
    } = params;

    let url = params.url;
    if (pdfToken) {
      try {
        const u = new URL(url);
        u.searchParams.set('t', pdfToken);
        url = u.toString();
      } catch {
        url = url.includes('?') ? `${url}&t=${encodeURIComponent(pdfToken)}` : `${url}?t=${encodeURIComponent(pdfToken)}`;
      }
    }
    url = withSingleDownloadFlag(url);
    const safeFilename = (filename || 'MahaTicket-Pass.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const authHeader = await resolveAuthHeader();

    if (Platform.OS === 'android' && TicketDownloader) {
      try {
        ToastAndroid.show('तिकीट PDF डाऊनलोड सुरू झाले... (Download folder)', ToastAndroid.LONG);
        if (typeof TicketDownloader.downloadFileWithAuth === 'function') {
          await TicketDownloader.downloadFileWithAuth(
            url,
            safeFilename,
            title,
            description,
            authHeader
          );
        } else {
          await TicketDownloader.downloadFile(url, safeFilename, title, description);
        }
        return true;
      } catch (err: unknown) {
        console.warn('Native DownloadManager error, falling back:', err);
      }
    }

    // Fallback: open URL that includes short-lived token when available
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('PDF डाऊनलोड करण्यात अडचण आली.', ToastAndroid.SHORT);
      }
      return false;
    }
  } finally {
    downloadInFlight = false;
  }
}

export async function shareTicketMessage(params: {
  title: string;
  message: string;
  url?: string;
}): Promise<boolean> {
  try {
    await Share.share({
      title: params.title,
      message: params.message,
      url: params.url,
    });
    return true;
  } catch {
    return false;
  }
}
