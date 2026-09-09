import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getConnectionStatus } from '@/lib/google/store';
import { listStoredLocations } from '@/lib/google-business/store';
import { getLastSyncedAt } from '@/lib/google-business/store';
import type { StatusDto } from '@/lib/google-business/types';

// GET /api/google/business/status — connection state for Google Business
// Profile review management. Same connection as GA4/Search Console (one
// Google account, business.manage is a third scope on it) — this endpoint
// reports specifically whether THAT scope was granted and whether the
// connection currently needs reconnecting, distinct from GA4's own
// /api/google/status (which doesn't know or care about this feature).
//
// Never returns a token, the account id, or any Google credential — only
// the connection state and the (non-secret) location list.

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = await getConnectionStatus();

    if (!connection.connected || !connection.capabilities.googleBusiness) {
      const dto: StatusDto = {
        status: connection.status === 'needs_reconnect' ? 'needs_reconnect' : 'disconnected',
        connectedAccount: null,
        locations: [],
        lastSyncedAt: null,
      };
      return NextResponse.json({ success: true, ...dto });
    }

    const [locations, lastSyncedAt] = await Promise.all([
      listStoredLocations().catch(() => []),
      getLastSyncedAt().catch(() => null),
    ]);

    const dto: StatusDto = {
      status: 'connected',
      connectedAccount: { googleEmail: connection.googleEmail },
      locations: locations.map(l => ({ locationId: l.locationId, title: l.title, address: l.address })),
      lastSyncedAt,
    };
    return NextResponse.json({ success: true, ...dto });
  } catch (err) {
    console.error('[api/google/business/status] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Unable to check connection status' }, { status: 500 });
  }
}
