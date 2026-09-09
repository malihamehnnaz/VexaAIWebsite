// Trend Intelligence service — orchestrates TrendSource implementations,
// caches results (requirement 8), and reports source failures honestly
// (requirement 9) rather than ever substituting fabricated signals.
//
// Extensibility: TREND_SOURCES is a plain array of TrendSource — adding a
// second real source (e.g. a Google Trends API, once an API key exists) is
// adding one entry here, nothing else changes.

import { googleNewsTrendSource } from '@/lib/content-intelligence/trend-sources/google-news';
import { saveTrendSignals, getRecentTrendSignals } from '@/lib/content-intelligence/store';
import type { TrendSignal, TrendSource } from '@/lib/content-intelligence/types';

const TREND_SOURCES: TrendSource[] = [googleNewsTrendSource];
const TREND_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — news doesn't need per-request freshness

export interface SourceStatus {
  source: string;
  available: boolean;
  signalCount: number;
  reason?: string;
}

export interface TrendFetchResult {
  signals: TrendSignal[];
  sourceStatuses: SourceStatus[];
  dataFreshness: 'fresh' | 'cached' | 'unavailable';
  fetchedAt: string | null;
}

async function fetchFreshFromAllSources(): Promise<{ signals: TrendSignal[]; sourceStatuses: SourceStatus[] }> {
  const results = await Promise.all(TREND_SOURCES.map(s => s.fetch()));
  const sourceStatuses: SourceStatus[] = [];
  const signals: TrendSignal[] = [];

  for (const result of results) {
    if (result.available) {
      sourceStatuses.push({ source: result.source, available: true, signalCount: result.signals.length });
      signals.push(...result.signals);
    } else {
      sourceStatuses.push({ source: result.source, available: false, signalCount: 0, reason: result.reason });
    }
  }
  return { signals, sourceStatuses };
}

// forceRefresh bypasses the cache (used sparingly — every real call still
// hits Google News RSS N times, one per query term).
export async function getTrendSignals(forceRefresh = false): Promise<TrendFetchResult> {
  if (!forceRefresh) {
    // A cache-lookup failure (e.g. the table not existing yet, before the
    // migration is applied — same pending-migration pattern as every prior
    // integration) must fall through to a fresh fetch, never crash the
    // whole pipeline over a persistence-layer problem.
    let cached: Awaited<ReturnType<typeof getRecentTrendSignals>> = null;
    try {
      cached = await getRecentTrendSignals(TREND_CACHE_TTL_MS);
    } catch (err) {
      console.error('[content-intelligence/trends] cache lookup failed, fetching fresh:', err instanceof Error ? err.message : err);
    }
    if (cached) {
      return {
        signals: cached.signals,
        sourceStatuses: [{ source: 'cache', available: true, signalCount: cached.signals.length }],
        dataFreshness: 'cached',
        fetchedAt: cached.fetchedAt,
      };
    }
  }

  const { signals, sourceStatuses } = await fetchFreshFromAllSources();

  if (signals.length === 0) {
    return { signals: [], sourceStatuses, dataFreshness: 'unavailable', fetchedAt: null };
  }

  let persisted: TrendSignal[];
  try {
    persisted = await saveTrendSignals(signals);
  } catch (err) {
    // Persistence failing shouldn't hide real, freshly-fetched signals from
    // the caller — fall back to the in-memory (synthetic-id) signals rather
    // than reporting "unavailable" when data genuinely was fetched.
    console.error('[content-intelligence/trends] failed to persist trend signals:', err instanceof Error ? err.message : err);
    persisted = signals;
  }

  return { signals: persisted, sourceStatuses, dataFreshness: 'fresh', fetchedAt: new Date().toISOString() };
}
