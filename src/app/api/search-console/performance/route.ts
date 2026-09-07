import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError, toConcreteDates } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';
import { rateLimit } from '@/lib/rate-limit';
import { getDailyTrend } from '@/lib/google/search-console';
import { resolveProperty } from '@/lib/google/search-console-property';

// GET /api/search-console/performance — the daily time series on its own
// (clicks / impressions / ctr / position per day), for charting. This is the
// same series /overview embeds as `trend`, exposed separately so the
// Marketing Website can refresh a chart without refetching totals, and so it
// can request a comparison period as its own series.
//
// Query params: property, range|startDate|endDate,
// comparisonStartDate/comparisonEndDate.

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
  if (!await rateLimit(ip, 'sc-performance', 60, '1 m')) {
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

    const cacheKey = `sc:performance:${property}:${JSON.stringify({ current, comparison })}`;
    const { series, comparisonSeries } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [series, comparisonSeries] = await Promise.all([
        getDailyTrend(accessToken, property, current.startDate, current.endDate),
        comparison ? getDailyTrend(accessToken, property, comparison.startDate, comparison.endDate) : Promise.resolve(null),
      ]);
      return { series, comparisonSeries };
    });

    return NextResponse.json({
      success: true,
      property,
      dateRange: resolved.info,
      series,
      comparisonSeries,
    });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
