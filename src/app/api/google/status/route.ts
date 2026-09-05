import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getConnectionStatus } from '@/lib/google/store';

// GET /api/google/status — lightweight connection check for the dashboard
// (no GA4 query, so it's fast and can't fail due to Google API issues).
// Never returns any token. Authenticated by admin session OR bearer key
// (the separate Marketing OS).

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const status = await getConnectionStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    console.error('[api/google/status] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Unable to check connection status' }, { status: 500 });
  }
}
