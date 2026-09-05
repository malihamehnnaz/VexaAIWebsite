import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getTopPages, getLandingPages, lastNDaysRange } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';

// GET /api/google/analytics/pages?days=28 — top viewed pages and top
// landing pages for the period.

function daysParam(request: Request): number {
  const raw = new URL(request.url).searchParams.get('days');
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : 28;
}

export async function GET(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accessToken, propertyId } = await getValidAccessToken();
    const range = lastNDaysRange(daysParam(request));
    const [topPages, landingPages] = await Promise.all([
      getTopPages(accessToken, propertyId, range),
      getLandingPages(accessToken, propertyId, range),
    ]);
    await markSynced();
    return NextResponse.json({ success: true, propertyId, topPages, landingPages });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
