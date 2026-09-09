import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { rateLimit } from '@/lib/rate-limit';
import { syncIfStale } from '@/lib/google-business/sync';

// POST /api/google/business/sync — manual refresh trigger, forces a sync
// regardless of staleness (unlike GET /reviews' opportunistic one).

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function POST(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  // Tight — this can trigger a real, quota-consuming multi-page Google sync.
  if (!await rateLimit(ip, 'google-business-sync', 5, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
  }

  try {
    const result = await syncIfStale(true);
    if (result.status === 'failed') {
      return NextResponse.json({ success: false, error: result.error ?? 'Sync failed' }, { status: 502 });
    }
    return NextResponse.json({ success: true, status: result.status });
  } catch (err) {
    console.error('[api/google/business/sync] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "Sync failed. Please try again." }, { status: 500 });
  }
}
