/**
 * Native ticket pass downloader for MahaTicket
 * Saves PDF directly into Android's public Downloads directory with system notification
 */
import { NativeModules, Platform, ToastAndroid, Linking } from 'react-native';

const { TicketDownloader } = NativeModules;

export async function downloadTicketPdf(params: {
  url: string;
  filename: string;
  title?: string;
  description?: string;
}): Promise<boolean> {
  const { url, filename, title = 'MahaTicket Pass', description = 'Downloading official admission pass' } = params;

  if (Platform.OS === 'android' && TicketDownloader?.downloadFile) {
    try {
      ToastAndroid.show('तिकीट PDF डाऊनलोड सुरू झाले... (Download folder)', ToastAndroid.LONG);
      await TicketDownloader.downloadFile(url, filename, title, description);
      return true;
    } catch (err: any) {
      console.warn('Native DownloadManager error, falling back to browser:', err);
    }
  }

  // Fallback to browser download link
  try {
    const downloadUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
    await Linking.openURL(downloadUrl);
    return true;
  } catch (openErr) {
    if (Platform.OS === 'android') {
      ToastAndroid.show('PDF डाऊनलोड करण्यात अडचण आली.', ToastAndroid.SHORT);
    }
    return false;
  }
}
