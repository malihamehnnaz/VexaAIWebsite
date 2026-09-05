import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getEvents } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';

// GET /api/google/analytics/events — real GA4 event names and counts for
// the period (whatever events actually fired — never an assumed/fixed
// list). Query params: same `range`/custom set as overview.

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
    const cacheKey = `ga4:events:${propertyId}:${JSON.stringify(resolved.info)}`;
    const events = await withCache(cacheKey, CACHE_TTL_SECONDS, () => getEvents(accessToken, propertyId, resolved.current));
    await markSynced();
    return NextResponse.json({ success: true, propertyId, dateRange: resolved.info, events });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
