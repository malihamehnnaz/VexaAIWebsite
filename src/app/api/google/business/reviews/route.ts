import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { rateLimit } from '@/lib/rate-limit';
import { listStoredReviews } from '@/lib/google-business/store';
import { syncIfStale } from '@/lib/google-business/sync';

// GET /api/google/business/reviews?locationId=&hasReply=&minRating=&cursor=
// — paginated, filterable. Always served from the local store (Part 3b —
// never a live Google call on this path), refreshed opportunistically if
// stale (see sync.ts's TTL) so the admin UI still works when Google is
// unreachable or the connection needs reconnecting — a stale-but-present
// store is served rather than an error in that case.

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'google-business-reviews', 60, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const locationId = params.get('locationId') ?? undefined;
  const hasReplyParam = params.get('hasReply');
  const hasReply = hasReplyParam === 'true' ? true : hasReplyParam === 'false' ? false : undefined;
  const minRatingParam = params.get('minRating');
  const minRating = minRatingParam ? parseInt(minRatingParam, 10) : undefined;
  const cursor = params.get('cursor') ?? undefined;

  if (minRatingParam && (!Number.isFinite(minRating) || minRating! < 1 || minRating! > 5)) {
    return NextResponse.json({ success: false, error: 'minRating must be an integer 1-5' }, { status: 400 });
  }

  // Best-effort — a sync failure (e.g. needs_reconnect) never blocks
  // serving whatever is already in the local store.
  await syncIfStale().catch(() => { /* the store still gets served below regardless */ });

  try {
    const { reviews, nextCursor } = await listStoredReviews({ locationId, hasReply, minRating, cursor });
    return NextResponse.json({ success: true, reviews, nextCursor });
  } catch (err) {
    console.error('[api/google/business/reviews] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "We couldn't load reviews. Please try again." }, { status: 500 });
  }
}
