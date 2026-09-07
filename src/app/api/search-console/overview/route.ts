import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError, toConcreteDates, compareNullableValue } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';
import { rateLimit } from '@/lib/rate-limit';
import { getTotals, getDailyTrend } from '@/lib/google/search-console';
import { resolveProperty } from '@/lib/google/search-console-property';

// GET /api/search-console/overview — headline totals + daily trend for the
// period, with an optional comparison period.
//
// Query params: property, range (today|yesterday|7d|28d|30d|90d|this_month|
// last_month|this_year|custom, default 28d), startDate/endDate (custom only),
// comparisonStartDate/comparisonEndDate (both required together).
//
// Metrics Google has no data for stay null — never coerced to 0, so the
// Marketing Website can distinguish "no data" from "measured zero".
// Note: Search Console data lags roughly 2–3 days, so a range ending today
// legitimately returns little or nothing for the most recent days.

const CACHE_TTL_SECONDS = 900;

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'sc-overview', 60, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited', code: 'rate_limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const resolved = resolveDateRangeParams(params);
  if (isDateRangeError(resolved)) {
    return NextResponse.json({ success: false, error: resolved.error, code: 'invalid_date_range' }, { status: 400 });
  }

  try {
    const { accessToken } = await getValidAccessToken();
    const property = await resolveProperty(accessToken, params.get('property'));

    const current = toConcreteDates(resolved.current);
    const comparison = resolved.comparison ? toConcreteDates(resolved.comparison) : null;

    const cacheKey = `sc:overview:${property}:${JSON.stringify({ current, comparison })}`;
    const { totals, previousTotals, trend } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [totals, previousTotals, trend] = await Promise.all([
        getTotals(accessToken, property, current.startDate, current.endDate),
        comparison ? getTotals(accessToken, property, comparison.startDate, comparison.endDate) : Promise.resolve(null),
        getDailyTrend(accessToken, property, current.startDate, current.endDate),
      ]);
      return { totals, previousTotals, trend };
    });

    await markSynced();

    return NextResponse.json({
      success: true,
      property,
      dateRange: resolved.info,
      metrics: totals,
      // Present only when a comparison period was actually requested, and
      // each field is null unless both sides have real values.
      comparison: previousTotals
        ? {
            clicks: compareNullableValue(totals.clicks, previousTotals.clicks),
            impressions: compareNullableValue(totals.impressions, previousTotals.impressions),
            ctr: compareNullableValue(totals.ctr, previousTotals.ctr),
            position: compareNullableValue(totals.position, previousTotals.position),
          }
        : null,
      trend,
    });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
