import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getOverview, lastNDaysRange } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';

// GET /api/google/analytics/overview?days=28 — top-line GA4 totals
// (active/new users, sessions, page views, key events) for the period.

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
    const overview = await getOverview(accessToken, propertyId, lastNDaysRange(daysParam(request)));
    await markSynced();
    return NextResponse.json({ success: true, propertyId, overview });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
