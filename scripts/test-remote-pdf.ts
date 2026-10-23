import 'dotenv/config';
import { mintOrderPdfToken } from '../src/lib/order-access-crypto';

async function main() {
  // Order 62: userId 12
  const token = mintOrderPdfToken(62, 12);
  console.log('Minted token:', token);

  const url = `https://mahaticket.kalpkrutinfotech.com/api/orders/MT-2026-92797/pdf?t=${encodeURIComponent(token)}`;
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Body:', text.slice(0, 500));
  } catch (err: any) {
    console.error('Fetch failed:', err);
  }
}
main();
