import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getTopPages, getLandingPages } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';

// GET /api/google/analytics/pages — top viewed pages and top landing pages.
// Query params: same `range`/custom set as overview. Authenticated by admin
// session OR bearer key.

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
    const cacheKey = `ga4:pages:${propertyId}:${JSON.stringify(resolved.info)}`;
    const { topPages, landingPages } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [topPages, landingPages] = await Promise.all([
        getTopPages(accessToken, propertyId, resolved.current),
        getLandingPages(accessToken, propertyId, resolved.current),
      ]);
      return { topPages, landingPages };
    });
    await markSynced();
    return NextResponse.json({ success: true, propertyId, dateRange: resolved.info, topPages, landingPages });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
