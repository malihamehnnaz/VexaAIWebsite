import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { getRealtime } from '@/lib/google/ga4';
import { googleErrorResponse } from '@/lib/google/respond';

// GET /api/google/analytics/realtime — active users right now, broken down
// by country/device/page. No date range params (realtime has none — it's
// GA4's own current ~30-minute window) and deliberately never cached, per
// the requirement that realtime data stay current rather than stale.

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accessToken, propertyId } = await getValidAccessToken();
    const realtime = await getRealtime(accessToken, propertyId);
    return NextResponse.json({ success: true, propertyId, realtime });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
