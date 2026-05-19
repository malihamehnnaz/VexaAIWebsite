import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Upstash client (lazy, optional) ──────────────────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

// ── Limiter cache (one per named config) ─────────────────────────────────────

const limiters = new Map<string, Ratelimit>();

function getLimiter(
  name: string,
  requests: number,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`
): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!limiters.has(name)) {
    limiters.set(
      name,
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(requests, window), prefix: `rl:${name}` })
    );
  }
  return limiters.get(name)!;
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const memStore = new Map<string, number[]>();

function memCheck(key: string, requests: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (memStore.get(key) ?? []).filter(t => now - t < windowMs);
  if (hits.length >= requests) { memStore.set(key, hits); return false; }
  hits.push(now);
  memStore.set(key, hits);
  if (memStore.size > 2000) { const k = memStore.keys().next().value; if (k) memStore.delete(k); }
  return true;
}

const WINDOW_MS: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };

function windowToMs(window: string): number {
  const [n, unit] = window.split(' ');
  return parseInt(n) * (WINDOW_MS[unit] ?? 1000);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Uses Upstash Redis when configured, falls back to in-memory otherwise.
 */
export async function rateLimit(
  identifier: string,
  name: string,
  requests: number,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`
): Promise<boolean> {
  const limiter = getLimiter(name, requests, window);
  if (limiter) {
    try {
      const { success } = await limiter.limit(identifier);
      return success;
    } catch {
      // Upstash error — fall through to memory
    }
  }
  return memCheck(`${name}:${identifier}`, requests, windowToMs(window));
}
