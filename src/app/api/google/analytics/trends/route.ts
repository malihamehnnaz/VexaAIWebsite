import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getTrends } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';

// GET /api/google/analytics/trends — daily active users/sessions/page views
// for the period, for a trend chart. Query params: same `range`/custom set
// as overview. Authenticated by admin session OR bearer key.

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
    const cacheKey = `ga4:trends:${propertyId}:${JSON.stringify(resolved.info)}`;
    const trend = await withCache(cacheKey, CACHE_TTL_SECONDS, () => getTrends(accessToken, propertyId, resolved.current));
    await markSynced();
    return NextResponse.json({ success: true, propertyId, dateRange: resolved.info, trend });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
