import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { getValidAccessToken, markSynced } from '@/lib/google/store';
import { getAcquisition, lastNDaysRange } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';

// GET /api/google/analytics/acquisition?days=28 — sessions/users/key events
// broken down by default channel group (traffic source).

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
    const channels = await getAcquisition(accessToken, propertyId, lastNDaysRange(daysParam(request)));
    await markSynced();
    return NextResponse.json({ success: true, propertyId, channels });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
