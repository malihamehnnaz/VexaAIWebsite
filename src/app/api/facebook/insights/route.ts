import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { resolveFacebookDateRangeParams, isFacebookDateRangeError, compareMetric, type MetricComparison } from '@/lib/facebook/date-range';
import { getPageIdentity, getPageInsight, getPostInsight, listPagePosts, FacebookGraphError, type PageInsightResult } from '@/lib/facebook/graph';
import { getGraphApiVersion } from '@/lib/meta/config';
import { recordPageInsight } from '@/lib/facebook/store';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { withCache } from '@/lib/google/cache';

// GET /api/facebook/insights — normalized Facebook Page organic-insights
// summary for the Marketing Website. Query params: range
// (today|yesterday|7d|30d|90d|custom, default 30d), startDate/endDate
// (custom only, max 90-day window — Meta's own Page Insights cap),
// compare=true (auto-computes the immediately preceding equivalent period),
// posts=true (also fetch post-level insights for recent posts — off by
// default since it costs one Graph API call per post per metric).
//
// Response carries BOTH of two shapes so nothing that already consumes this
// endpoint breaks:
//   - `metrics`/`timeseries` — this endpoint's original shape.
//   - `available`/`source`/`summary`/`daily`/`posts` — the shape requested
//     for parity with the Instagram organic-insights contract. `summary`
//     and `daily` are the exact same data as `metrics`/`timeseries`, just
//     under the alternate key names.
//
// Every metric is {value, previousValue, changePercent} when Meta provides
// it, or {available:false, reason} when it genuinely doesn't — Meta's real
// per-metric error message (see src/lib/facebook/graph.ts), never a
// fabricated 0/null indistinguishable from "no data". comments/shares are
// NOT summed from the separate facebook_comments/facebook_posts moderation
// tables here — that would be a derived estimate, not what Meta's own
// Insights API reports. This endpoint is exclusively Facebook ORGANIC data
// — there is no Facebook Ads integration anywhere in this codebase, so
// there is no ads data that could ever leak in here.
//
// KNOWN STATE as of 2026-09-09: every Page Insights metric currently fails
// for this Page/token — some because Meta genuinely deprecated the metric
// name (Page Insights deprecation effective June 15, 2026, confirmed via
// Meta's own current docs), others because this Business Manager System
// User token is rejected by the legacy /insights endpoint specifically
// ("(#190) This method must be called with a Page Access Token" at page
// level, "Invalid OAuth 2.0 Access Token" at post level), even though the
// same token works for posts/comments/Messenger/Instagram. See the reason
// string attached to each metric below, and src/lib/facebook/graph.ts's
// header comment for the full empirical breakdown. This is a genuine,
// current Meta-side restriction — not a code bug — and needs a Meta-side
// fix (either a Page-login-derived Page token, or the System User granted
// Insights access for this Page in Business Manager). No code change is
// needed once that happens — real values will simply start flowing through.

const CACHE_TTL_SECONDS = 300;
const RECENT_POSTS_LIMIT = 10;

// Current, non-deprecated metric names (verified 2026-09-09 — see
// src/lib/facebook/graph.ts's header comment for the full empirical
// breakdown of which names Meta still recognizes vs. rejects outright).
// There is no current page-level "impressions" metric — Meta's 2026
// overhaul folded that concept into page_total_media_view_unique.
const FLOW_METRICS = ['page_total_media_view_unique', 'page_daily_follows_unique', 'page_post_engagements', 'page_actions_post_reactions_total', 'page_video_views'];
const SNAPSHOT_METRICS = ['page_follows'];

// Post-level metric names are NOT yet name-validated: every post-level
// request fails with "Invalid OAuth 2.0 Access Token" before Meta ever
// gets to checking whether the metric name itself is valid (unlike the
// page-level "(#100) invalid metric" vs "(#190) wrong token" split, which
// clearly separates the two problems). These are best-documented current
// candidates; once the token problem is fixed, whatever error remains (if
// any) will reveal whether the names themselves need correcting too.
const POST_METRICS = ['post_impressions', 'post_engaged_users'];

// Meta's Page Insights API has no page-level metric for total comments or
// total shares (confirmed against the current reference) — page_post_engagements
// is the closest thing, but it's a combined bucket (reactions+comments+shares),
// not broken out. Reported explicitly as unavailable rather than aggregated
// from the separate facebook_comments moderation table, which would mix two
// different data sources under one metric name.
const COMMENTS_UNAVAILABLE_REASON = 'Meta\'s Page Insights API has no page-level "total comments" metric. page_post_engagements reports a combined reactions+comments+shares bucket only, not comments alone.';
const SHARES_UNAVAILABLE_REASON = 'Meta\'s Page Insights API has no page-level "total shares" metric, for the same reason as comments.';

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

interface MetricSeries {
  flow: Record<string, PageInsightResult>;
  snapshot: Record<string, PageInsightResult>;
}

async function fetchInsightSeries(pageId: string, range: { startDate: string; endDate: string }): Promise<MetricSeries> {
  const graphApiVersion = getGraphApiVersion();
  const [flowResults, snapshotResults] = await Promise.all([
    Promise.all(FLOW_METRICS.map(m => getPageInsight(pageId, m, range.startDate, range.endDate))),
    Promise.all(SNAPSHOT_METRICS.map(m => getPageInsight(pageId, m, range.startDate, range.endDate))),
  ]);

  const flow: Record<string, PageInsightResult> = {};
  for (const r of flowResults) flow[r.metric] = r;
  const snapshot: Record<string, PageInsightResult> = {};
  for (const r of snapshotResults) snapshot[r.metric] = r;

  // Best-effort history — a write failure here shouldn't fail the request.
  // Deduplicated per (page, post_id='', metric, date) via the table's
  // unique constraint, so repeated syncs never create duplicate rows.
  const allDaily = [...flowResults, ...snapshotResults].flatMap(r => r.daily.map(d => ({ metric: r.metric, ...d })));
  await Promise.all(allDaily.map(d =>
    recordPageInsight({ pageId, metric: d.metric, value: d.value, date: d.date, graphApiVersion }).catch(() => { /* non-fatal */ })
  ));

  return { flow, snapshot };
}

interface PostInsightSummary {
  postId: string;
  message: string | null;
  permalink: string | null;
  createdAt: string | null;
  insights: Record<string, { value: number | null; available: boolean; reason?: string }>;
}

async function fetchRecentPostInsights(pageId: string): Promise<PostInsightSummary[]> {
  const graphApiVersion = getGraphApiVersion();
  const { items } = await listPagePosts(pageId, undefined, RECENT_POSTS_LIMIT);

  return Promise.all(items.map(async post => {
    const results = await Promise.all(POST_METRICS.map(m => getPostInsight(pageId, post.id, m)));

    const insights: PostInsightSummary['insights'] = {};
    for (const r of results) {
      insights[r.metric] = r.value != null
        ? { value: r.value, available: true }
        : { value: null, available: false, reason: r.unavailableReason ?? 'No data returned' };
    }

    // Best-effort history — mirrors the page-level persistence above.
    const today = new Date().toISOString().slice(0, 10);
    await Promise.all(results.map(r =>
      recordPageInsight({ pageId, postId: post.id, metric: r.metric, value: r.value, date: today, graphApiVersion }).catch(() => { /* non-fatal */ })
    ));

    return {
      postId: post.id,
      message: post.message ?? null,
      permalink: post.permalink_url ?? null,
      createdAt: post.created_time ?? null,
      insights,
    };
  }));
}

function sumFlow(result: PageInsightResult | undefined): number | null {
  if (!result || result.daily.length === 0) return null;
  const values = result.daily.map(d => d.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0);
}

function lastSnapshot(result: PageInsightResult | undefined): number | null {
  if (!result || result.daily.length === 0) return null;
  const last = [...result.daily].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return last?.value ?? null;
}

type MetricOrUnavailable = MetricComparison | { available: false; reason: string };

// A metric is reported unavailable only when Meta actively rejected it this
// request (a real, current reason attached) — not merely because the sum
// happened to be 0 for a metric Meta did accept.
function metricResult(current: PageInsightResult | undefined, currentValue: number | null, previousValue: number | null): MetricOrUnavailable {
  if (currentValue == null && current?.unavailableReason) {
    return { available: false, reason: current.unavailableReason };
  }
  return compareMetric(currentValue, previousValue);
}

function buildTimeseries(flow: Record<string, PageInsightResult>, snapshot: Record<string, PageInsightResult>): Array<Record<string, string | number | null>> {
  const dates = new Set<string>();
  for (const series of [...Object.values(flow), ...Object.values(snapshot)]) {
    for (const d of series.daily) dates.add(d.date);
  }
  const sortedDates = [...dates].sort();

  const lookup = (result: PageInsightResult | undefined, date: string): number | null =>
    result?.daily.find(d => d.date === date)?.value ?? null;

  return sortedDates.map(date => ({
    date,
    reach: lookup(flow.page_total_media_view_unique, date),
    views: lookup(flow.page_total_media_view_unique, date),
    followers: lookup(snapshot.page_follows, date),
    followerGrowth: lookup(flow.page_daily_follows_unique, date),
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
  const includePosts = params.get('posts') === 'true';

  try {
    const cacheKey = `fb:insights:v3:${includePosts}:${JSON.stringify(resolved.info)}`;
    const { current, previous, pageIdentity, posts } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [current, previous, pageIdentity, posts] = await Promise.all([
        fetchInsightSeries(GP_CAFE_PAGE_ID, resolved.current),
        resolved.comparison ? fetchInsightSeries(GP_CAFE_PAGE_ID, resolved.comparison) : Promise.resolve(null),
        getPageIdentity(GP_CAFE_PAGE_ID).catch(() => null),
        includePosts ? fetchRecentPostInsights(GP_CAFE_PAGE_ID).catch(() => []) : Promise.resolve([]),
      ]);
      return { current, previous, pageIdentity, posts };
    });

    const reach = metricResult(current.flow.page_total_media_view_unique, sumFlow(current.flow.page_total_media_view_unique), previous ? sumFlow(previous.flow.page_total_media_view_unique) : null);
    const followerGrowth = metricResult(current.flow.page_daily_follows_unique, sumFlow(current.flow.page_daily_follows_unique), previous ? sumFlow(previous.flow.page_daily_follows_unique) : null);
    const followers = metricResult(current.snapshot.page_follows, lastSnapshot(current.snapshot.page_follows), previous ? lastSnapshot(previous.snapshot.page_follows) : null);
    const engagement = metricResult(current.flow.page_post_engagements, sumFlow(current.flow.page_post_engagements), previous ? sumFlow(previous.flow.page_post_engagements) : null);
    const reactions = metricResult(current.flow.page_actions_post_reactions_total, sumFlow(current.flow.page_actions_post_reactions_total), previous ? sumFlow(previous.flow.page_actions_post_reactions_total) : null);
    const videoViews = metricResult(current.flow.page_video_views, sumFlow(current.flow.page_video_views), previous ? sumFlow(previous.flow.page_video_views) : null);

    const metrics = {
      reach,
      views: reach, // same underlying metric (page_total_media_view_unique) — Meta's 2026 model folds reach/views together
      followers,
      followerGrowth,
      engagement,
      reactions,
      comments: { available: false as const, reason: COMMENTS_UNAVAILABLE_REASON },
      shares: { available: false as const, reason: SHARES_UNAVAILABLE_REASON },
      videoViews,
    };

    const anyMetricAvailable = Object.values(metrics).some(m => !('available' in m) || m.available !== false);
    const timeseries = buildTimeseries(current.flow, current.snapshot);

    return corsJson(request, {
      success: true,
      // Instagram-organic-insights-parity shape:
      available: anyMetricAvailable,
      source: 'facebook_organic',
      page: { id: pageIdentity?.id ?? GP_CAFE_PAGE_ID, name: pageIdentity?.name ?? null },
      dateRange: resolved.info,
      summary: metrics,
      daily: timeseries,
      posts: includePosts ? posts : undefined,
      // Original shape, kept for backward compatibility:
      platform: 'facebook',
      metrics,
      timeseries,
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
