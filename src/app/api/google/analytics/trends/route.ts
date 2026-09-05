import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getTrends, lastNDaysRange } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';

// GET /api/google/analytics/trends?days=28 — daily active users, sessions,
// and page views for the period, for a trend chart.

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
    const trend = await getTrends(accessToken, propertyId, lastNDaysRange(daysParam(request)));
    await markSynced();
    return NextResponse.json({ success: true, propertyId, trend });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
