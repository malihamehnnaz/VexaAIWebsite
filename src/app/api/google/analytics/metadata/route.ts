import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { getMetadata } from '@/lib/google/metadata';
import { googleErrorResponse } from '@/lib/google/respond';

// GET /api/google/analytics/metadata — the real dimensions/metrics
// available for this specific GA4 property (not a fixed/assumed list).
// Powers the Report Explorer (/api/google/analytics/report) and can back a
// dimension/metric picker UI in the Marketing OS. Cached for 12h (a
// property's available fields essentially never change) — see
// src/lib/google/cache.ts.

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accessToken, propertyId } = await getValidAccessToken();
    const metadata = await getMetadata(accessToken, propertyId);
    return NextResponse.json({ success: true, propertyId, metadata });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
