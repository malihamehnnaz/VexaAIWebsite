import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { retryFailedPost, ScheduledPostNotFoundError, NotEditableError } from '@/lib/social-scheduling/store';

// POST /api/social/scheduled-posts/:id/retry — only valid for a 'failed'
// post. Resets the attempt budget and re-queues it (scheduled_at = now())
// for the next worker tick to pick up — it does not publish synchronously
// itself, so it goes through the exact same claim/publish path as any
// other scheduled post (no second publishing code path for a retry).

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
  if (!await rateLimit(ip, 'social-scheduled-post-retry', 20, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { id } = await params;
  try {
    const post = await retryFailedPost(id);
    console.log('[social-scheduling] retry_scheduled', { id: post.id, platform: post.platform, pageId: post.pageId });
    return corsJson(request, { success: true, post });
  } catch (err) {
    if (err instanceof ScheduledPostNotFoundError) {
      return corsJson(request, { success: false, error: 'Not found' }, { status: 404 });
    }
    if (err instanceof NotEditableError) {
      return corsJson(request, { success: false, error: `Only a "failed" post can be retried (current status: "${err.currentStatus}")` }, { status: 409 });
    }
    console.error('[api/social/scheduled-posts/:id/retry] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't retry that post." }, { status: 500 });
  }
}
