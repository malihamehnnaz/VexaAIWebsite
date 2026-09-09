import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { rateLimit } from '@/lib/rate-limit';
import { getValidAccessToken } from '@/lib/google/store';
import { getGoogleBusinessClient } from '@/lib/google-business/client-factory';
import { getStoredAccountIdForLocation, upsertReview, getStoredReview } from '@/lib/google-business/store';
import { GoogleBusinessApiError } from '@/lib/google-business/types';
import { MAX_REPLY_LENGTH } from '@/lib/google-business/config';

// PUT/DELETE /api/google/business/reviews/:locationId/:reviewId/reply
//
// PUT creates or overwrites — there is no separate create call in Google's
// API, matched here (upsertReply on the client always does the right
// thing). After a successful write, this route refetches that ONE review
// from Google to pick up its real reply state — never a full sync — per
// the explicit instruction, and because a 200 on the write does not mean
// the reply published (it may be PENDING or REJECTED moderation).

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function resolveAccountId(locationId: string): Promise<string | null> {
  return getStoredAccountIdForLocation(locationId);
}

interface RouteParams {
  params: Promise<{ locationId: string; reviewId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'google-business-reply', 20, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { locationId, reviewId } = await params;

  let body: { comment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.comment !== 'string' || !body.comment.trim()) {
    return NextResponse.json({ success: false, error: 'comment is required' }, { status: 400 });
  }
  if (body.comment.length > MAX_REPLY_LENGTH) {
    return NextResponse.json({ success: false, error: `comment must be ${MAX_REPLY_LENGTH} characters or fewer` }, { status: 400 });
  }

  try {
    const accountId = await resolveAccountId(locationId);
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Unknown locationId — sync locations first via GET /api/google/business/status' }, { status: 404 });
    }

    const { accessToken } = await getValidAccessToken();
    const client = getGoogleBusinessClient();
    await client.upsertReply(accessToken, accountId, locationId, reviewId, body.comment);

    // Refetch this ONE review — not a full sync — to persist its real,
    // post-write reply state.
    const refetched = await client.getReview(accessToken, accountId, locationId, reviewId);
    await upsertReview(locationId, refetched);

    const stored = await getStoredReview(locationId, reviewId);
    return NextResponse.json({ success: true, review: stored });
  } catch (err) {
    if (err instanceof GoogleBusinessApiError) {
      console.error('[api/google/business/reply] Google error:', err.message);
      return NextResponse.json({ success: false, error: { type: 'GOOGLE_API_ERROR', message: 'Unable to save the reply right now.' } }, { status: 502 });
    }
    console.error('[api/google/business/reply] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "We couldn't save the reply. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'google-business-reply-delete', 20, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { locationId, reviewId } = await params;

  try {
    const accountId = await resolveAccountId(locationId);
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Unknown locationId — sync locations first via GET /api/google/business/status' }, { status: 404 });
    }

    const { accessToken } = await getValidAccessToken();
    const client = getGoogleBusinessClient();
    await client.deleteReply(accessToken, accountId, locationId, reviewId);

    const refetched = await client.getReview(accessToken, accountId, locationId, reviewId);
    await upsertReview(locationId, refetched);

    const stored = await getStoredReview(locationId, reviewId);
    return NextResponse.json({ success: true, review: stored });
  } catch (err) {
    if (err instanceof GoogleBusinessApiError) {
      console.error('[api/google/business/reply] Google error:', err.message);
      return NextResponse.json({ success: false, error: { type: 'GOOGLE_API_ERROR', message: 'Unable to delete the reply right now.' } }, { status: 502 });
    }
    console.error('[api/google/business/reply] delete error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "We couldn't delete the reply. Please try again." }, { status: 500 });
  }
}
