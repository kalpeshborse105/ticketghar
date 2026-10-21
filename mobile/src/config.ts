/** Next.js hosts the same UI + API the phone should load. */
export const WEB_CANDIDATES = [
  'http://127.0.0.1:3002',
  'http://localhost:3002',
  'http://10.0.2.2:3002',
  'http://192.168.31.154:3002',
];

let resolvedBase: string | null = null;

export function getWebBase() {
  return resolvedBase || WEB_CANDIDATES[0];
}

async function probe(base: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    // Lightweight route — /api/events can take tens of seconds cold.
    const res = await fetch(`${base}/api/announcements`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/** Pick a reachable Next.js origin (USB reverse / emulator / LAN). */
export async function resolveWebBase(): Promise<string> {
  if (resolvedBase) return resolvedBase;
  for (const base of WEB_CANDIDATES) {
    if (await probe(base)) {
      resolvedBase = base;
      return base;
    }
  }
  resolvedBase = WEB_CANDIDATES[0];
  return resolvedBase;
}

export function clearWebBase() {
  resolvedBase = null;
}
