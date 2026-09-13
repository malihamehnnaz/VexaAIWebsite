import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { cancelScheduledPost, ScheduledPostNotFoundError, NotEditableError } from '@/lib/social-scheduling/store';

// POST /api/social/scheduled-posts/:id/cancel — idempotent: cancelling an
// already-cancelled post succeeds as a no-op. A cancelled post can never
// subsequently be published (the worker's due-query only ever selects
// status='scheduled').

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'social-scheduled-post-cancel', 30, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { id } = await params;
  try {
    const post = await cancelScheduledPost(id);
    console.log('[social-scheduling] schedule_cancelled', { id: post.id });
    return corsJson(request, { success: true, post });
  } catch (err) {
    if (err instanceof ScheduledPostNotFoundError) {
      return corsJson(request, { success: false, error: 'Not found' }, { status: 404 });
    }
    if (err instanceof NotEditableError) {
      return corsJson(request, { success: false, error: `Cannot cancel a post that is already "${err.currentStatus}"` }, { status: 409 });
    }
    console.error('[api/social/scheduled-posts/:id/cancel] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't cancel that scheduled post." }, { status: 500 });
  }
}
