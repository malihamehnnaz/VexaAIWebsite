// Server-side cache for GA4 report responses — keyed by report + property +
// date range + any other params, so the same request from either the Vexa
// dashboard or the Marketing OS within the TTL window doesn't hit Google
// again. Uses Upstash Redis when configured (shared across serverless
// instances — same optional client already used by src/lib/rate-limit.ts),
// falling back to a per-instance in-memory Map otherwise. Realtime data
// intentionally never goes through this (see the realtime route) — it's
// supposed to be current-second data, not cached.

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let redisChecked = false;

function getRedis(): Redis | null {
  if (redisChecked) return redis;
  redisChecked = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
  } catch {
    redis = null;
  }
  return redis;
}

const memStore = new Map<string, { expiresAt: number; value: unknown }>();

export async function getCached<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) {
    try {
      const value = await r.get<T>(key);
      return value ?? null;
    } catch {
      // fall through to memory
    }
  }

  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { memStore.delete(key); return null; }
  return entry.value as T;
}

export async function setCached(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, value, { ex: ttlSeconds });
      return;
    } catch {
      // fall through to memory
    }
  }

  memStore.set(key, { expiresAt: Date.now() + ttlSeconds * 1000, value });
  if (memStore.size > 500) {
    const oldestKey = memStore.keys().next().value;
    if (oldestKey) memStore.delete(oldestKey);
  }
}

// Wraps a report-fetching function with cache-aside semantics: return the
// cached value if present, otherwise compute, cache, and return it.
export async function withCache<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;

  const value = await compute();
  await setCached(key, value, ttlSeconds);
  return value;
}
