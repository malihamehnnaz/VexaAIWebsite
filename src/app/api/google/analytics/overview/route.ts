import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getOverview } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError, compareValue } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';

// GET /api/google/analytics/overview — top-line GA4 totals for the period.
// Query params: range (today|yesterday|7d|28d|30d|90d|this_month|last_month|
// this_year|custom, default 28d), startDate/endDate (custom only),
// comparisonStartDate/comparisonEndDate (optional — both required together).
//
// `overview.*` fields are unchanged plain numbers for the current period
// (the existing Vexa dashboard panel already renders them as such); a
// sibling `comparison` object (same field names, each a
// {current,comparison,absoluteDiff,percentDiff}) is included only when a
// comparison range was actually requested — never a fabricated one.
//
// Authenticated by EITHER the Vexa admin session (existing dashboard) OR the
// shared bearer key (the separate Marketing OS, server-to-server).

const CACHE_TTL_SECONDS = 300;

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const resolved = resolveDateRangeParams(params);
  if (isDateRangeError(resolved)) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
  }

  try {
    const { accessToken, propertyId } = await getValidAccessToken();

    const cacheKey = `ga4:overview:${propertyId}:${JSON.stringify(resolved.info)}`;
    const { overview, comparisonOverview } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const overview = await getOverview(accessToken, propertyId, resolved.current);
      const comparisonOverview = resolved.comparison
        ? await getOverview(accessToken, propertyId, resolved.comparison)
        : null;
      return { overview, comparisonOverview };
    });

    await markSynced();

    const comparison = comparisonOverview
      ? {
          activeUsers: compareValue(overview.activeUsers, comparisonOverview.activeUsers),
          newUsers: compareValue(overview.newUsers, comparisonOverview.newUsers),
          sessions: compareValue(overview.sessions, comparisonOverview.sessions),
          screenPageViews: compareValue(overview.screenPageViews, comparisonOverview.screenPageViews),
          keyEvents: compareValue(overview.keyEvents, comparisonOverview.keyEvents),
          totalUsers: compareValue(overview.totalUsers, comparisonOverview.totalUsers),
          engagedSessions: compareValue(overview.engagedSessions, comparisonOverview.engagedSessions),
          engagementRate: compareValue(overview.engagementRate, comparisonOverview.engagementRate),
          eventCount: compareValue(overview.eventCount, comparisonOverview.eventCount),
          bounceRate: compareValue(overview.bounceRate, comparisonOverview.bounceRate),
          totalRevenue: compareValue(overview.totalRevenue, comparisonOverview.totalRevenue),
        }
      : null;

    return NextResponse.json({ success: true, propertyId, dateRange: resolved.info, overview, comparison });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
