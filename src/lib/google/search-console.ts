// Google Search Console API client. Confirmed against Google's current docs
// (2026-09-07):
//   POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
//     body: {startDate, endDate, dimensions[], type, dimensionFilterGroups[],
//            aggregationType, rowLimit (1–25000, default 1000), startRow, dataState}
//     response: {rows:[{keys:[], clicks, impressions, ctr, position}],
//                responseAggregationType, metadata}
//     dimensions: query | page | country | device | date | hour | searchAppearance
//   GET  https://www.googleapis.com/webmasters/v3/sites
//   GET  https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps
//     response: {sitemap:[...]}
//   POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
// Required scope: https://www.googleapis.com/auth/webmasters.readonly
//
// Mirrors src/lib/google/ga4.ts — same error class shape, same
// rows-to-objects normalization approach, same "never fabricate a value"
// rule: a metric Google doesn't return stays null rather than becoming 0.

const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3';
const SEARCH_CONSOLE_BASE = 'https://searchconsole.googleapis.com/v1';

export class SearchConsoleApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'SearchConsoleApiError';
  }
}

interface GoogleErrorBody {
  error?: { message?: string; status?: string; code?: number };
}

async function scFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new SearchConsoleApiError(err instanceof Error ? err.message : 'Network error calling Search Console API', 0);
  }

  const payload = await response.json().catch(() => null) as (T & GoogleErrorBody) | null;

  if (!response.ok || !payload || payload.error) {
    const message = payload?.error?.message || `Search Console API returned HTTP ${response.status}`;
    // Never log the access token. Log enough to tell permission vs. not-found
    // vs. rate-limit apart server-side.
    console.error('[search-console] request failed:', { status: response.status, apiStatus: payload?.error?.status, message });
    throw new SearchConsoleApiError(message, response.status);
  }

  return payload;
}

// ── Properties (sites) ────────────────────────────────────────────────────────

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string | null;
}

export async function listSites(accessToken: string): Promise<SearchConsoleSite[]> {
  const payload = await scFetch<{ siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> }>(
    `${WEBMASTERS_BASE}/sites`,
    accessToken
  );
  return (payload.siteEntry ?? [])
    .filter(entry => !!entry.siteUrl)
    .map(entry => ({ siteUrl: entry.siteUrl as string, permissionLevel: entry.permissionLevel ?? null }));
}

// ── Search Analytics ──────────────────────────────────────────────────────────

export type SearchConsoleDimension = 'query' | 'page' | 'country' | 'device' | 'date' | 'searchAppearance';

export interface SearchAnalyticsRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions?: SearchConsoleDimension[];
  rowLimit?: number;
  startRow?: number;
  type?: 'web' | 'image' | 'video' | 'news' | 'discover' | 'googleNews';
  dimensionFilterGroups?: Array<{
    groupType?: string;
    filters: Array<{ dimension: string; operator?: string; expression: string }>;
  }>;
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
}

// Google omits a metric entirely when it has no value for a row; that stays
// null here rather than being coerced to 0, which would misrepresent
// "no data" as "measured zero".
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function runSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  request: SearchAnalyticsRequest
): Promise<{ rows: SearchAnalyticsRow[]; responseAggregationType: string | null }> {
  const payload = await scFetch<{
    rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
    responseAggregationType?: string;
  }>(`${WEBMASTERS_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      startDate: request.startDate,
      endDate: request.endDate,
      ...(request.dimensions?.length ? { dimensions: request.dimensions } : {}),
      ...(request.type ? { type: request.type } : {}),
      ...(request.dimensionFilterGroups?.length ? { dimensionFilterGroups: request.dimensionFilterGroups } : {}),
      rowLimit: Math.min(Math.max(request.rowLimit ?? 1000, 1), 25000),
      startRow: Math.max(request.startRow ?? 0, 0),
    }),
  });

  return {
    rows: (payload.rows ?? []).map(row => ({
      keys: row.keys ?? [],
      clicks: num(row.clicks),
      impressions: num(row.impressions),
      ctr: num(row.ctr),
      position: num(row.position),
    })),
    responseAggregationType: payload.responseAggregationType ?? null,
  };
}

export interface SearchConsoleTotals {
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
}

// No dimensions => Google returns a single aggregate row for the period.
// An empty result means genuinely no data (a brand-new or zero-traffic
// property), reported as nulls rather than zeros.
export async function getTotals(accessToken: string, siteUrl: string, startDate: string, endDate: string): Promise<SearchConsoleTotals> {
  const { rows } = await runSearchAnalytics(accessToken, siteUrl, { startDate, endDate });
  const row = rows[0];
  if (!row) return { clicks: null, impressions: null, ctr: null, position: null };
  return { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position };
}

export interface SearchConsoleTrendPoint {
  date: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
}

export async function getDailyTrend(accessToken: string, siteUrl: string, startDate: string, endDate: string): Promise<SearchConsoleTrendPoint[]> {
  const { rows } = await runSearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['date'], rowLimit: 25000 });
  return rows.map(row => ({
    date: row.keys[0] ?? '',
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export interface SearchConsoleDimensionRow {
  key: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
}

export async function getByDimension(
  accessToken: string,
  siteUrl: string,
  dimension: SearchConsoleDimension,
  startDate: string,
  endDate: string,
  options: { rowLimit?: number; startRow?: number; filterExpression?: string } = {}
): Promise<SearchConsoleDimensionRow[]> {
  const { rows } = await runSearchAnalytics(accessToken, siteUrl, {
    startDate,
    endDate,
    dimensions: [dimension],
    rowLimit: options.rowLimit,
    startRow: options.startRow,
    ...(options.filterExpression
      ? { dimensionFilterGroups: [{ filters: [{ dimension, operator: 'contains', expression: options.filterExpression }] }] }
      : {}),
  });

  return rows.map(row => ({
    key: row.keys[0] ?? '',
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// ── Sitemaps ──────────────────────────────────────────────────────────────────

export interface SitemapContents {
  type: string | null;
  submitted: number | null;
  indexed: number | null;
}

export interface SitemapEntry {
  path: string | null;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  isPending: boolean | null;
  isSitemapsIndex: boolean | null;
  type: string | null;
  warnings: number | null;
  errors: number | null;
  contents: SitemapContents[];
}

export async function listSitemaps(accessToken: string, siteUrl: string): Promise<SitemapEntry[]> {
  const payload = await scFetch<{
    sitemap?: Array<{
      path?: string; lastSubmitted?: string; lastDownloaded?: string; isPending?: boolean;
      isSitemapsIndex?: boolean; type?: string; warnings?: string | number; errors?: string | number;
      contents?: Array<{ type?: string; submitted?: string | number; indexed?: string | number }>;
    }>;
  }>(`${WEBMASTERS_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, accessToken);

  // Google returns these counters as strings (int64 over JSON); parsed here
  // so the Marketing Website gets real numbers, with null for absent values.
  const int = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  return (payload.sitemap ?? []).map(entry => ({
    path: entry.path ?? null,
    lastSubmitted: entry.lastSubmitted ?? null,
    lastDownloaded: entry.lastDownloaded ?? null,
    isPending: entry.isPending ?? null,
    isSitemapsIndex: entry.isSitemapsIndex ?? null,
    type: entry.type ?? null,
    warnings: int(entry.warnings),
    errors: int(entry.errors),
    contents: (entry.contents ?? []).map(c => ({ type: c.type ?? null, submitted: int(c.submitted), indexed: int(c.indexed) })),
  }));
}

// ── URL Inspection ────────────────────────────────────────────────────────────
// The only indexing data Google exposes via API is per-URL inspection. There
// is no public API for the bulk "Pages"/index-coverage report — see the
// /api/search-console/indexing route, which reports that explicitly rather
// than returning fabricated zeros.

export interface UrlInspectionResult {
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  pageFetchState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  crawledAs: string | null;
  sitemaps: string[];
  referringUrls: string[];
}

export async function inspectUrl(accessToken: string, siteUrl: string, inspectionUrl: string): Promise<UrlInspectionResult> {
  const payload = await scFetch<{
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string; coverageState?: string; robotsTxtState?: string; indexingState?: string;
        lastCrawlTime?: string; pageFetchState?: string; googleCanonical?: string; userCanonical?: string;
        crawledAs?: string; sitemap?: string[]; referringUrls?: string[];
      };
    };
  }>(`${SEARCH_CONSOLE_BASE}/urlInspection/index:inspect`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ inspectionUrl, siteUrl }),
  });

  const r = payload.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: r.verdict ?? null,
    coverageState: r.coverageState ?? null,
    robotsTxtState: r.robotsTxtState ?? null,
    indexingState: r.indexingState ?? null,
    lastCrawlTime: r.lastCrawlTime ?? null,
    pageFetchState: r.pageFetchState ?? null,
    googleCanonical: r.googleCanonical ?? null,
    userCanonical: r.userCanonical ?? null,
    crawledAs: r.crawledAs ?? null,
    sitemaps: r.sitemap ?? [],
    referringUrls: r.referringUrls ?? [],
  };
}
