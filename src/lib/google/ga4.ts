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

// Exposed for the Report Explorer (/api/google/analytics/report) — arbitrary
// caller-specified dimensions/metrics, already validated against the real
// per-property metadata (src/lib/google/metadata.ts) before this is called.
export async function runCustomReport(
  accessToken: string,
  propertyId: string,
  dimensions: string[],
  metrics: string[],
  range: DateRange,
  limit = 50
): Promise<Array<Record<string, string>>> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: dimensions.map(name => ({ name })),
    metrics: metrics.map(name => ({ name })),
    limit: String(limit),
  });
  return rowsToObjects(report);
}

// ── Overview: top-line totals for the period ─────────────────────────────────
// Original 5 fields (activeUsers/newUsers/sessions/screenPageViews/keyEvents)
// are unchanged in name and stay plain numbers — the existing Vexa dashboard
// panel already renders them as such; everything past keyEvents is new,
// additive, still-plain-number surface. sessionsPerUser/viewsPerSession are
// derived locally (not a real GA4 metric name) rather than guessed at.
// averageSessionDuration is GA4's actual metric name for what its own UI
// labels "average engagement time".

export interface Ga4Overview {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  keyEvents: number; // GA4 Data API metric name: `keyEvents` (confirmed live against this property's real metadata on 2026-09-05 — `conversions` no longer exists; Google renamed the API metric itself, not just the UI label)
  totalUsers: number;
  engagedSessions: number;
  engagementRate: number; // 0–1, as GA4 returns it
  averageEngagementTimeSeconds: number;
  eventCount: number;
  sessionsPerUser: number; // derived: sessions / totalUsers
  viewsPerSession: number; // derived: screenPageViews / sessions
  bounceRate: number; // 0–1
  totalRevenue: number; // 0 if the property has no ecommerce tracking — a real value, not a placeholder
}

const OVERVIEW_METRICS = [
  'activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'keyEvents',
  'totalUsers', 'engagedSessions', 'engagementRate', 'averageSessionDuration',
  'eventCount', 'bounceRate', 'totalRevenue',
];

export async function getOverview(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4Overview> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    metrics: OVERVIEW_METRICS.map(name => ({ name })),
  });

  const row = rowsToObjects(report)[0] ?? {};
  const sessions = Number(row.sessions ?? 0);
  const totalUsers = Number(row.totalUsers ?? 0);
  const screenPageViews = Number(row.screenPageViews ?? 0);

  return {
    activeUsers: Number(row.activeUsers ?? 0),
    newUsers: Number(row.newUsers ?? 0),
    sessions,
    screenPageViews,
    keyEvents: Number(row.keyEvents ?? 0),
    totalUsers,
    engagedSessions: Number(row.engagedSessions ?? 0),
    engagementRate: Number(row.engagementRate ?? 0),
    averageEngagementTimeSeconds: Number(row.averageSessionDuration ?? 0),
    eventCount: Number(row.eventCount ?? 0),
    sessionsPerUser: totalUsers > 0 ? sessions / totalUsers : 0,
    viewsPerSession: sessions > 0 ? screenPageViews / sessions : 0,
    bounceRate: Number(row.bounceRate ?? 0),
    totalRevenue: Number(row.totalRevenue ?? 0),
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
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: '25',
  });

  return rowsToObjects(report).map(row => ({
    channel: row.sessionDefaultChannelGroup || '(unassigned)',
    sessions: Number(row.sessions ?? 0),
    activeUsers: Number(row.activeUsers ?? 0),
    keyEvents: Number(row.keyEvents ?? 0),
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

// ── Events ────────────────────────────────────────────────────────────────────

export interface Ga4EventRow {
  eventName: string;
  eventCount: number;
  activeUsers: number;
}

export async function getEvents(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4EventRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: '50',
  });

  return rowsToObjects(report).map(row => ({
    eventName: row.eventName || '(not set)',
    eventCount: Number(row.eventCount ?? 0),
    activeUsers: Number(row.activeUsers ?? 0),
  }));
}

// ── Key events / conversions ──────────────────────────────────────────────────
// GA4's `keyEvents` metric is already scoped to key/conversion events only.
// Breaking it down by eventName shows which specific events are configured
// as key events and how each contributed. This property already has 3 named
// key events configured (confirmed live via /api/google/analytics/metadata):
// boka_bord, purchase, reservation_completed.

export interface Ga4KeyEventRow {
  eventName: string;
  keyEvents: number;
  activeUsers: number;
}

export async function getKeyEvents(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4KeyEventRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'keyEvents' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'keyEvents' }, desc: true }],
    limit: '50',
  });

  // Only rows where this event actually generated key events — keyEvents
  // comes back 0 for every non-key event name, which would otherwise flood
  // this list with irrelevant events.
  return rowsToObjects(report)
    .map(row => ({
      eventName: row.eventName || '(not set)',
      keyEvents: Number(row.keyEvents ?? 0),
      activeUsers: Number(row.activeUsers ?? 0),
    }))
    .filter(row => row.keyEvents > 0);
}

// ── Devices ───────────────────────────────────────────────────────────────────

export interface Ga4DeviceRow {
  deviceCategory: string;
  operatingSystem: string;
  browser: string;
  activeUsers: number;
  sessions: number;
}

export async function getDevices(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4DeviceRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'deviceCategory' }, { name: 'operatingSystem' }, { name: 'browser' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: '50',
  });

  return rowsToObjects(report).map(row => ({
    deviceCategory: row.deviceCategory || '(not set)',
    operatingSystem: row.operatingSystem || '(not set)',
    browser: row.browser || '(not set)',
    activeUsers: Number(row.activeUsers ?? 0),
    sessions: Number(row.sessions ?? 0),
  }));
}

// ── Geography ─────────────────────────────────────────────────────────────────
// Aggregated counts by country/region/city only — no per-user/session-level
// location data, which GA4's Data API doesn't expose anyway.

export interface Ga4GeoRow {
  country: string;
  region: string;
  city: string;
  activeUsers: number;
  sessions: number;
}

export async function getGeography(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4GeoRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'country' }, { name: 'region' }, { name: 'city' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: '50',
  });

  return rowsToObjects(report).map(row => ({
    country: row.country || '(not set)',
    region: row.region || '(not set)',
    city: row.city || '(not set)',
    activeUsers: Number(row.activeUsers ?? 0),
    sessions: Number(row.sessions ?? 0),
  }));
}

// ── Demographics ──────────────────────────────────────────────────────────────
// Only populated if Google Signals / demographics reporting is enabled on
// this property — otherwise every row legitimately comes back "(not set)".
// That's real data (demographics genuinely aren't being collected), not a
// bug — never fabricated as something more specific.

export interface Ga4DemographicsRow {
  ageBracket: string;
  gender: string;
  activeUsers: number;
}

export async function getDemographics(accessToken: string, propertyId: string, range: DateRange): Promise<Ga4DemographicsRow[]> {
  const report = await runReport(accessToken, propertyId, {
    dateRanges: [range],
    dimensions: [{ name: 'userAgeBracket' }, { name: 'userGender' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: '50',
  });

  return rowsToObjects(report).map(row => ({
    ageBracket: row.userAgeBracket || '(not set)',
    gender: row.userGender || '(not set)',
    activeUsers: Number(row.activeUsers ?? 0),
  }));
}

// ── Realtime ──────────────────────────────────────────────────────────────────
// Separate GA4 Data API endpoint (:runRealtimeReport, not :runReport) — no
// dateRanges; reports the current ~30 minute window. Never cached (see
// src/lib/google/cache.ts callers) — by definition it's supposed to be
// current-second data.

interface RunRealtimeReportBody {
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  limit?: string;
}

async function runRealtimeReport(accessToken: string, propertyId: string, body: RunRealtimeReportBody): Promise<RunReportResponse> {
  let response: Response;
  try {
    response = await fetch(`${DATA_API_BASE}/properties/${encodeURIComponent(propertyId)}:runRealtimeReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Ga4ApiError(err instanceof Error ? err.message : 'Network error calling GA4 Realtime API', 0);
  }

  const payload = await response.json().catch(() => null) as (RunReportResponse & { error?: { message?: string; status?: string } }) | null;
  if (!response.ok || !payload) {
    const message = payload?.error?.message || `GA4 Realtime API returned HTTP ${response.status}`;
    console.error('[ga4] runRealtimeReport failed:', { status: response.status, message });
    throw new Ga4ApiError(message, response.status);
  }
  return payload;
}

export interface Ga4Realtime {
  activeUsers: number;
  byCountry: Array<{ country: string; activeUsers: number }>;
  byDevice: Array<{ deviceCategory: string; activeUsers: number }>;
  byPage: Array<{ page: string; activeUsers: number }>;
}

export async function getRealtime(accessToken: string, propertyId: string): Promise<Ga4Realtime> {
  const [totalReport, countryReport, deviceReport, pageReport] = await Promise.all([
    runRealtimeReport(accessToken, propertyId, { metrics: [{ name: 'activeUsers' }] }),
    runRealtimeReport(accessToken, propertyId, { dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], limit: '20' }),
    runRealtimeReport(accessToken, propertyId, { dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }], limit: '10' }),
    runRealtimeReport(accessToken, propertyId, { dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }], limit: '20' }),
  ]);

  return {
    activeUsers: Number(rowsToObjects(totalReport)[0]?.activeUsers ?? 0),
    byCountry: rowsToObjects(countryReport).map(r => ({ country: r.country || '(not set)', activeUsers: Number(r.activeUsers ?? 0) })),
    byDevice: rowsToObjects(deviceReport).map(r => ({ deviceCategory: r.deviceCategory || '(not set)', activeUsers: Number(r.activeUsers ?? 0) })),
    byPage: rowsToObjects(pageReport).map(r => ({ page: r.unifiedScreenName || '(not set)', activeUsers: Number(r.activeUsers ?? 0) })),
  };
}
