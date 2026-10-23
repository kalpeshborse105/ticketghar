import 'dotenv/config';
import { mintOrderPdfToken } from '../src/lib/order-access-crypto';

async function main() {
  const token = mintOrderPdfToken(62, 12);
  console.log('Minted token:', token);

  const url = `http://localhost:3000/api/orders/MT-2026-92797/pdf?t=${encodeURIComponent(token)}`;
  console.log('Fetching local:', url);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const buf = await res.arrayBuffer();
    console.log('Body length:', buf.byteLength);
  } catch (err: any) {
    console.error('Fetch failed:', err);
  }
}
main();
