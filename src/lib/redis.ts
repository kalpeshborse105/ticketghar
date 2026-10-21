/**
 * Redis seat-hold cache for BookMyShow-style fast inventory reads.
 * DB (Postgres seat_inventory) remains source of truth.
 * When REDIS_URL is missing, uses an in-process Map with TTL (dev-safe).
 */
import Redis from 'ioredis';

type MemoryEntry = { value: string; expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();

let redisClient: Redis | null = null;
let redisInitAttempted = false;

function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

export function getRedis(): Redis | null {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;
  const url = getRedisUrl();
  if (!url) return null;
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 2500,
    });
    redisClient.on('error', (err) => {
      console.warn('[redis] client error:', err.message);
    });
    return redisClient;
  } catch (err: any) {
    console.warn('[redis] init failed, using memory fallback:', err?.message);
    redisClient = null;
    return null;
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrl());
}

function memoryGet(key: string): string | null {
  const row = memoryStore.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return row.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
}

function memoryDel(key: string) {
  memoryStore.delete(key);
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (client) {
    try {
      if (client.status !== 'ready') await client.connect().catch(() => undefined);
      return await client.get(key);
    } catch {
      return memoryGet(key);
    }
  }
  return memoryGet(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      if (client.status !== 'ready') await client.connect().catch(() => undefined);
      await client.set(key, value, 'EX', Math.max(1, ttlSeconds));
      return;
    } catch {
      /* fall through */
    }
  }
  memorySet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      if (client.status !== 'ready') await client.connect().catch(() => undefined);
      await client.del(key);
      return;
    } catch {
      /* fall through */
    }
  }
  memoryDel(key);
}

/** Seat hold keys: seat:hold:{sessionId}:{seatId} */
export function seatHoldKey(sessionId: number, seatId: number) {
  return `seat:hold:${sessionId}:${seatId}`;
}

export function sessionSeatsCacheKey(sessionId: number) {
  return `session:seats:${sessionId}`;
}

export async function markSeatsHeldInCache(
  sessionId: number,
  seatIds: number[],
  holdToken: string,
  ttlSeconds: number
): Promise<void> {
  await Promise.all(
    seatIds.map((seatId) =>
      cacheSet(
        seatHoldKey(sessionId, seatId),
        JSON.stringify({ holdToken, heldAt: Date.now() }),
        ttlSeconds
      )
    )
  );
  // Invalidate layout cache so next read reflects holds
  await cacheDel(sessionSeatsCacheKey(sessionId));
}

export async function clearSeatsHeldInCache(sessionId: number, seatIds: number[]): Promise<void> {
  await Promise.all(seatIds.map((seatId) => cacheDel(seatHoldKey(sessionId, seatId))));
  await cacheDel(sessionSeatsCacheKey(sessionId));
}
