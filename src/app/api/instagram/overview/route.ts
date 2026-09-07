import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { resolveInstagramDateRangeParams, isInstagramDateRangeError, compareMetric } from '@/lib/instagram/date-range';
import { getAccountFields, getAccountInsight, InstagramGraphError } from '@/lib/instagram/graph';
import { getAccount, recordInsight } from '@/lib/instagram/store';
import { IG_BUSINESS_ACCOUNT_ID } from '@/lib/instagram/config';
import { withCache } from '@/lib/google/cache';

// GET /api/instagram/overview — normalized account summary for the
// Marketing Website. Query params: range (today|yesterday|7d|30d|90d|custom,
// default 30d), startDate/endDate (custom only), compare=true (auto-computes
// the immediately preceding equivalent period).
//
// Every metric is {value, previousValue, changePercent} — a metric Meta
// doesn't provide or rejects for this account/media is `null`, never a
// fabricated 0.

const CACHE_TTL_SECONDS = 300;

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

// Metrics requiring metric_type=total_value in the current Instagram Data
// API (aggregate-over-range metrics, not time-series ones).
const TOTAL_VALUE_METRICS = ['reach', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'replies', 'profile_links_taps', 'website_clicks'];
const TIME_SERIES_METRICS = ['views', 'profile_views'];

// Plain object, not a Map — this passes through withCache's JSON
// (de)serialization (used for the Redis-backed cache path), where a Map
// would silently come back empty.
async function fetchOverviewMetrics(range: { startDate: string; endDate: string }): Promise<Record<string, number | null>> {
  const metricNames = [...TOTAL_VALUE_METRICS, ...TIME_SERIES_METRICS];
  const results = await Promise.all(
    metricNames.map(name =>
      getAccountInsight(IG_BUSINESS_ACCOUNT_ID, name, range.startDate, range.endDate, TOTAL_VALUE_METRICS.includes(name) ? 'total_value' : undefined)
    )
  );

  const byName: Record<string, number | null> = {};
  for (const r of results) {
    byName[r.name] = r.value;
    // Best-effort history — a write failure here shouldn't fail the request.
    try {
      await recordInsight({ metric: r.name, value: r.value, period: 'day', startTime: range.startDate, endTime: range.endDate });
    } catch { /* non-fatal */ }
  }
  return byName;
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-overview', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const resolved = resolveInstagramDateRangeParams(params);
  if (isInstagramDateRangeError(resolved)) {
    return corsJson(request, { success: false, error: resolved.error }, { status: 400 });
  }

  try {
    const cacheKey = `ig:overview:${JSON.stringify(resolved.info)}`;
    const { current, previous, accountFields } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [current, previous, accountFields] = await Promise.all([
        fetchOverviewMetrics(resolved.current),
        resolved.comparison ? fetchOverviewMetrics(resolved.comparison) : Promise.resolve(null),
        getAccountFields(IG_BUSINESS_ACCOUNT_ID).catch(() => null),
      ]);
      return { current, previous, accountFields };
    });

    const account = accountFields
      ? { id: accountFields.id, username: accountFields.username ?? null, name: accountFields.name ?? null }
      : await getAccount().then(a => a ? { id: a.platformAccountId, username: a.username, name: a.name } : { id: IG_BUSINESS_ACCOUNT_ID, username: null, name: null });

    const metric = (name: string) => compareMetric(current[name] ?? null, previous?.[name] ?? null);

    return corsJson(request, {
      success: true,
      account,
      dateRange: resolved.info,
      metrics: {
        reach: metric('reach'),
        views: metric('views'),
        accountsEngaged: metric('accounts_engaged'),
        totalInteractions: metric('total_interactions'),
        likes: metric('likes'),
        comments: metric('comments'),
        shares: metric('shares'),
        saves: metric('saves'),
        replies: metric('replies'),
        profileViews: metric('profile_views'),
        websiteClicks: metric('website_clicks'),
        profileLinksTaps: metric('profile_links_taps'),
        followers: { value: accountFields?.followers_count ?? null, previousValue: null, changePercent: null },
      },
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof InstagramGraphError) {
      console.error('[api/instagram/overview] Meta error:', err.message);
      return corsJson(request, { success: false, error: { type: 'META_API_ERROR', message: 'Unable to retrieve Instagram insights' } }, { status: 502 });
    }
    console.error('[api/instagram/overview] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Instagram insights. Please try again." }, { status: 500 });
  }
}
