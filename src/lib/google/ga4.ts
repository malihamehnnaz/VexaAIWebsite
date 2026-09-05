// Google Analytics 4 Data API report queries. Confirmed against Google's
// current docs (2026-09-05): POST https://analyticsdata.googleapis.com/v1beta/
// properties/{propertyId}:runReport, v1beta is the current (non-superseded)
// version. Kept separate from oauth.ts (token exchange) and store.ts
// (persistence) so each concern stays isolated.

const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

export class Ga4ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'Ga4ApiError';
  }
}

interface RunReportRequestBody {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  orderBys?: Array<Record<string, unknown>>;
  limit?: string;
}

interface RunReportResponse {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
}

async function runReport(accessToken: string, propertyId: string, body: RunReportRequestBody): Promise<RunReportResponse> {
  let response: Response;
  try {
    response = await fetch(`${DATA_API_BASE}/properties/${encodeURIComponent(propertyId)}:runReport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Ga4ApiError(err instanceof Error ? err.message : 'Network error calling GA4 Data API', 0);
  }

  const payload = await response.json().catch(() => null) as (RunReportResponse & { error?: { message?: string; status?: string } }) | null;

  if (!response.ok || !payload) {
    const message = payload?.error?.message || `GA4 Data API returned HTTP ${response.status}`;
    // Never log accessToken. Do log enough to distinguish permission vs.
    // not-found vs. rate-limit errors server-side.
    console.error('[ga4] runReport failed:', { status: response.status, apiStatus: payload?.error?.status, message });
    throw new Ga4ApiError(message, response.status);
  }

  return payload;
}

// ── Small helpers for turning rows into plain objects ────────────────────────

function rowsToObjects(report: RunReportResponse): Array<Record<string, string>> {
  const dimNames = (report.dimensionHeaders ?? []).map(h => h.name);
  const metricNames = (report.metricHeaders ?? []).map(h => h.name);

  return (report.rows ?? []).map(row => {
    const obj: Record<string, string> = {};
    dimNames.forEach((name, i) => { obj[name] = row.dimensionValues?.[i]?.value ?? ''; });
    metricNames.forEach((name, i) => { obj[name] = row.metricValues?.[i]?.value ?? '0'; });
    return obj;
  });
}

export interface DateRange {
  startDate: string; // 'NdaysAgo' or 'YYYY-MM-DD'
  endDate: string;
}

export function lastNDaysRange(days: number): DateRange {
  return { startDate: `${Math.max(1, Math.min(days, 365))}daysAgo`, endDate: 'today' };
}

// ── Overview: top-line totals for the period ─────────────────────────────────

export interface Ga4Overview {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  keyEvents: number; // GA4 Data API metric name is still `conversions`; "key events" is the current GA4 UI term for the same thing
}

export async function getOverview(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4Overview> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    metrics: [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'conversions' },
    ],
  });

  const row = rowsToObjects(report)[0] ?? {};
  return {
    activeUsers: Number(row.activeUsers ?? 0),
    newUsers: Number(row.newUsers ?? 0),
    sessions: Number(row.sessions ?? 0),
    screenPageViews: Number(row.screenPageViews ?? 0),
    keyEvents: Number(row.conversions ?? 0),
  };
}

// ── Acquisition: sessions by channel ─────────────────────────────────────────

export interface Ga4AcquisitionRow {
  channel: string;
  sessions: number;
  activeUsers: number;
  keyEvents: number;
}

export async function getAcquisition(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4AcquisitionRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: '25',
  });

  return rowsToObjects(report).map(row => ({
    channel: row.sessionDefaultChannelGroup || '(unassigned)',
    sessions: Number(row.sessions ?? 0),
    activeUsers: Number(row.activeUsers ?? 0),
    keyEvents: Number(row.conversions ?? 0),
  }));
}

// ── Pages: top viewed pages + top landing pages ──────────────────────────────

export interface Ga4PageRow {
  path: string;
  views: number;
  activeUsers: number;
}

export async function getTopPages(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4PageRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: '20',
  });

  return rowsToObjects(report).map(row => ({
    path: row.pagePath || '/',
    views: Number(row.screenPageViews ?? 0),
    activeUsers: Number(row.activeUsers ?? 0),
  }));
}

export async function getLandingPages(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4PageRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: '20',
  });

  return rowsToObjects(report).map(row => ({
    path: row.landingPage || '/',
    views: Number(row.sessions ?? 0),
    activeUsers: Number(row.activeUsers ?? 0),
  }));
}

// ── Trends: daily time series ─────────────────────────────────────────────────

export interface Ga4TrendPoint {
  date: string; // YYYYMMDD, as GA4 returns it
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
}

export async function getTrends(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4TrendPoint[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  return rowsToObjects(report).map(row => ({
    date: row.date || '',
    activeUsers: Number(row.activeUsers ?? 0),
    sessions: Number(row.sessions ?? 0),
    screenPageViews: Number(row.screenPageViews ?? 0),
  }));
}
