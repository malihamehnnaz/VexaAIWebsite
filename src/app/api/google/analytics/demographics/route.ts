import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getDemographics } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';

// GET /api/google/analytics/demographics — age bracket / gender breakdown.
// Only populated if Google Signals is enabled on this property; otherwise
// every row legitimately comes back "(not set)" — real data, not an error,
// and never upgraded to something more specific than what GA4 reports.
// Query params: same `range`/custom set as overview.

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
    const cacheKey = `ga4:demographics:${propertyId}:${JSON.stringify(resolved.info)}`;
    const demographics = await withCache(cacheKey, CACHE_TTL_SECONDS, () => getDemographics(accessToken, propertyId, resolved.current));
    await markSynced();
    return NextResponse.json({ success: true, propertyId, dateRange: resolved.info, demographics });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
