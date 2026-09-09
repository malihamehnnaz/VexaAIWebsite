import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { resolveFacebookDateRangeParams, isFacebookDateRangeError, compareMetric } from '@/lib/facebook/date-range';
import { getPageIdentity, getPageInsight, FacebookGraphError, type DailyInsightValue } from '@/lib/facebook/graph';
import { recordPageInsight } from '@/lib/facebook/store';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { withCache } from '@/lib/google/cache';

// GET /api/facebook/insights — normalized Facebook Page organic-insights
// summary for the Marketing Website, mirroring /api/instagram/overview's
// contract and conventions (same auth, same cache/rate-limit shape, same
// never-fabricate rule). Query params: range
// (today|yesterday|7d|30d|90d|custom, default 30d), startDate/endDate
// (custom only, max 90-day window — Meta's own Page Insights cap),
// compare=true (auto-computes the immediately preceding equivalent period).
//
// Every metric is {value, previousValue, changePercent} when Meta provides
// it, or {available:false, reason} when it genuinely doesn't — never a
// fabricated 0, and comments/shares are NOT summed from the separate
// facebook_comments/facebook_posts moderation tables here, because that
// would be a derived estimate, not what Meta's own Insights API reports.

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

// Confirmed against Meta's current Page Insights reference (2026-09-09).
// page_impressions_unique is documented as "deprecated above Graph API v25"
// but is still requested — its real, current behavior against this
// Page/token is what decides availability (see getPageInsight), not the doc
// note alone.
const FLOW_METRICS = ['page_impressions', 'page_impressions_unique', 'page_views_total', 'page_fan_adds', 'page_fan_removes', 'page_post_engagements', 'page_actions_post_reactions_total', 'page_video_views'];
const SNAPSHOT_METRICS = ['page_fans'];

// Meta's Page Insights API has no page-level metric for total comments or
// total shares (confirmed against the current reference) — page_post_engagements
// is the closest thing, but it's a combined bucket (reactions+comments+shares),
// not broken out. Reported explicitly as unavailable rather than aggregated
// from the separate facebook_comments moderation table, which would mix two
// different data sources under one metric name.
const COMMENTS_UNAVAILABLE_REASON = 'Meta\'s Page Insights API has no page-level "total comments" metric. page_post_engagements reports a combined reactions+comments+shares bucket only, not comments alone.';
const SHARES_UNAVAILABLE_REASON = 'Meta\'s Page Insights API has no page-level "total shares" metric, for the same reason as comments.';

interface MetricSeries {
  flow: Record<string, DailyInsightValue[]>;
  snapshot: Record<string, DailyInsightValue[]>;
}

async function fetchInsightSeries(pageId: string, range: { startDate: string; endDate: string }): Promise<MetricSeries> {
  const [flowResults, snapshotResults] = await Promise.all([
    Promise.all(FLOW_METRICS.map(m => getPageInsight(pageId, m, range.startDate, range.endDate))),
    Promise.all(SNAPSHOT_METRICS.map(m => getPageInsight(pageId, m, range.startDate, range.endDate))),
  ]);

  const flow: Record<string, DailyInsightValue[]> = {};
  for (const r of flowResults) flow[r.metric] = r.daily;
  const snapshot: Record<string, DailyInsightValue[]> = {};
  for (const r of snapshotResults) snapshot[r.metric] = r.daily;

  // Best-effort history — a write failure here shouldn't fail the request.
  // Deduplicated per (page, metric, date) via the table's unique constraint,
  // so repeated syncs never create duplicate rows.
  const allDaily = [...flowResults, ...snapshotResults].flatMap(r => r.daily.map(d => ({ metric: r.metric, ...d })));
  await Promise.all(allDaily.map(d =>
    recordPageInsight({ pageId, metric: d.metric, value: d.value, date: d.date }).catch(() => { /* non-fatal */ })
  ));

  return { flow, snapshot };
}

function sumFlow(daily: DailyInsightValue[] | undefined): number | null {
  if (!daily || daily.length === 0) return null;
  const values = daily.map(d => d.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0);
}

function lastSnapshot(daily: DailyInsightValue[] | undefined): number | null {
  if (!daily || daily.length === 0) return null;
  const last = [...daily].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return last?.value ?? null;
}

function buildTimeseries(flow: Record<string, DailyInsightValue[]>, snapshot: Record<string, DailyInsightValue[]>): Array<Record<string, string | number | null>> {
  const dates = new Set<string>();
  for (const series of [...Object.values(flow), ...Object.values(snapshot)]) {
    for (const d of series) dates.add(d.date);
  }
  const sortedDates = [...dates].sort();

  const lookup = (series: DailyInsightValue[] | undefined, date: string): number | null =>
    series?.find(d => d.date === date)?.value ?? null;

  return sortedDates.map(date => ({
    date,
    impressions: lookup(flow.page_impressions, date),
    reach: lookup(flow.page_impressions_unique, date),
    views: lookup(flow.page_views_total, date),
    followers: lookup(snapshot.page_fans, date),
    followerAdds: lookup(flow.page_fan_adds, date),
    followerRemoves: lookup(flow.page_fan_removes, date),
    engagement: lookup(flow.page_post_engagements, date),
    reactions: lookup(flow.page_actions_post_reactions_total, date),
    videoViews: lookup(flow.page_video_views, date),
  }));
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'facebook-insights', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const resolved = resolveFacebookDateRangeParams(params);
  if (isFacebookDateRangeError(resolved)) {
    return corsJson(request, { success: false, error: resolved.error }, { status: 400 });
  }

  try {
    const cacheKey = `fb:insights:${JSON.stringify(resolved.info)}`;
    const { current, previous, pageIdentity } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [current, previous, pageIdentity] = await Promise.all([
        fetchInsightSeries(GP_CAFE_PAGE_ID, resolved.current),
        resolved.comparison ? fetchInsightSeries(GP_CAFE_PAGE_ID, resolved.comparison) : Promise.resolve(null),
        getPageIdentity(GP_CAFE_PAGE_ID).catch(() => null),
      ]);
      return { current, previous, pageIdentity };
    });

    const reach = compareMetric(sumFlow(current.flow.page_impressions_unique), previous ? sumFlow(previous.flow.page_impressions_unique) : null);
    const netFollowerChange = compareMetric(
      sumFlow(current.flow.page_fan_adds) != null || sumFlow(current.flow.page_fan_removes) != null
        ? (sumFlow(current.flow.page_fan_adds) ?? 0) - (sumFlow(current.flow.page_fan_removes) ?? 0)
        : null,
      previous
        ? (sumFlow(previous.flow.page_fan_adds) != null || sumFlow(previous.flow.page_fan_removes) != null
          ? (sumFlow(previous.flow.page_fan_adds) ?? 0) - (sumFlow(previous.flow.page_fan_removes) ?? 0)
          : null)
        : null
    );

    return corsJson(request, {
      success: true,
      platform: 'facebook',
      page: { id: pageIdentity?.id ?? GP_CAFE_PAGE_ID, name: pageIdentity?.name ?? null },
      dateRange: resolved.info,
      metrics: {
        reach: reach.value == null && sumFlow(current.flow.page_impressions_unique) == null
          ? { available: false, reason: 'Meta returned no data for page_impressions_unique for this Page/window — Meta\'s docs mark it deprecated above Graph API v25, and this Page/token currently returns nothing for it.' }
          : reach,
        impressions: compareMetric(sumFlow(current.flow.page_impressions), previous ? sumFlow(previous.flow.page_impressions) : null),
        views: compareMetric(sumFlow(current.flow.page_views_total), previous ? sumFlow(previous.flow.page_views_total) : null),
        followers: compareMetric(lastSnapshot(current.snapshot.page_fans), previous ? lastSnapshot(previous.snapshot.page_fans) : null),
        followerGrowth: netFollowerChange,
        engagement: compareMetric(sumFlow(current.flow.page_post_engagements), previous ? sumFlow(previous.flow.page_post_engagements) : null),
        reactions: compareMetric(sumFlow(current.flow.page_actions_post_reactions_total), previous ? sumFlow(previous.flow.page_actions_post_reactions_total) : null),
        comments: { available: false, reason: COMMENTS_UNAVAILABLE_REASON },
        shares: { available: false, reason: SHARES_UNAVAILABLE_REASON },
        videoViews: compareMetric(sumFlow(current.flow.page_video_views), previous ? sumFlow(previous.flow.page_video_views) : null),
      },
      timeseries: buildTimeseries(current.flow, current.snapshot),
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof FacebookGraphError) {
      console.error('[api/facebook/insights] Meta error:', err.message);
      return corsJson(request, { success: false, error: { type: 'META_API_ERROR', message: 'Unable to retrieve Facebook Page insights' } }, { status: 502 });
    }
    console.error('[api/facebook/insights] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Facebook Page insights. Please try again." }, { status: 500 });
  }
}
