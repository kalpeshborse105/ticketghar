/**
 * Native ticket pass downloader for MahaTicket.
 * Prefer authenticated DownloadModule (Bearer) or short-lived ?t= token URLs.
 * Fallback: JS fetch → savePdfBase64 (avoids 0-byte DownloadManager stubs).
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
    if (token && token.trim().length > 8) {
      return `Bearer ${token.trim()}`;
    }
  } catch {
    /* ignore */
  }
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

function withPdfToken(url: string, pdfToken?: string | null): string {
  if (!pdfToken) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('t', pdfToken);
    return u.toString();
  } catch {
    return url.includes('?')
      ? `${url}&t=${encodeURIComponent(pdfToken)}`
      : `${url}?t=${encodeURIComponent(pdfToken)}`;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  // eslint-disable-next-line no-undef
  return globalThis.btoa(binary);
}

async function fetchPdfViaJs(
  url: string,
  authHeader: string | null
): Promise<Uint8Array> {
  const headers: Record<string, string> = {
    Accept: 'application/pdf,*/*',
  };
  if (authHeader) headers.Authorization = authHeader;
  const res = await fetch(url, { method: 'GET', headers });
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (!res.ok) {
    const preview = new TextDecoder().decode(bytes.slice(0, 120));
    throw new Error(`HTTP ${res.status}: ${preview}`);
  }
  if (bytes.length < 5 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') {
    throw new Error(`Not a PDF (${bytes.length} bytes)`);
  }
  return bytes;
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

    let url = withPdfToken(params.url, pdfToken);
    url = withSingleDownloadFlag(url);
    const safeFilename = (filename || 'MahaTicket-Pass.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const authHeader = await resolveAuthHeader();

    if (!pdfToken && !authHeader) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('PDF साठी लॉगिन आवश्यक आहे.', ToastAndroid.SHORT);
      }
      return false;
    }

    if (Platform.OS === 'android' && TicketDownloader) {
      // 1) Native HTTP fetch
      try {
        ToastAndroid.show('तिकीट PDF डाऊनलोड सुरू...', ToastAndroid.SHORT);
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
        ToastAndroid.show('PDF Downloads फोल्डरमध्ये सेव्ह झाले ✓', ToastAndroid.LONG);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Native PDF download error:', msg);
      }

      // 2) JS fetch + native base64 save (more reliable with session cookies/tokens)
      try {
        const bytes = await fetchPdfViaJs(url, authHeader);
        if (typeof TicketDownloader.savePdfBase64 === 'function') {
          await TicketDownloader.savePdfBase64(safeFilename, bytesToBase64(bytes));
          ToastAndroid.show('PDF Downloads फोल्डरमध्ये सेव्ह झाले ✓', ToastAndroid.LONG);
          return true;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('JS PDF fallback error:', msg);
        ToastAndroid.show(
          msg.includes('PDF') || msg.includes('HTTP')
            ? 'PDF अयशस्वी — लॉगिन तपासा व पुन्हा प्रयत्न करा'
            : 'PDF डाऊउनलोड अयशस्वी. पुन्हा प्रयत्न करा.',
          ToastAndroid.LONG
        );
      }

      if (pdfToken) {
        try {
          await Linking.openURL(url);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      await Linking.openURL(url);
      return true;
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('PDF डाऊउनलोड करण्यात अडचण आली.', ToastAndroid.SHORT);
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
