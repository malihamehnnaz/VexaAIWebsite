import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { claimForImmediatePublish, markPublished, markFailed, getScheduledPostById } from '@/lib/social-scheduling/store';
import { publishFacebookPagePost } from '@/lib/social-scheduling/publish';
import { classifyPublishFailure } from '@/lib/social-scheduling/errors';

// POST /api/social/scheduled-posts/:id/publish-now — publishes immediately
// rather than waiting for scheduled_at. Uses the EXACT SAME publishing
// service (publishFacebookPagePost) and the exact same atomic-claim pattern
// as the scheduled worker — this route is not a second implementation of
// Meta publishing, just a different trigger for the same one.
// Only valid from 'scheduled' or 'failed' — matching claimForImmediatePublish.

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
  if (!await rateLimit(ip, 'social-scheduled-post-publish-now', 10, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { id } = await params;

  try {
    const claimed = await claimForImmediatePublish(id);
    if (!claimed) {
      const current = await getScheduledPostById(id);
      if (!current) return corsJson(request, { success: false, error: 'Not found' }, { status: 404 });
      return corsJson(request, { success: false, error: `Cannot publish a post that is already "${current.status}"` }, { status: 409 });
    }

    console.log('[social-scheduling] publishing_started', { id: claimed.id, platform: claimed.platform, pageId: claimed.pageId, trigger: 'publish-now' });

    try {
      const result = await publishFacebookPagePost({ id: claimed.id, pageId: claimed.pageId, caption: claimed.caption, mediaUrls: claimed.mediaUrls });
      await markPublished(claimed.id, result.externalPostId, result.externalPermalink);
      console.log('[social-scheduling] publishing_succeeded', { id: claimed.id, platform: claimed.platform, pageId: claimed.pageId, trigger: 'publish-now' });
      const post = await getScheduledPostById(id);
      return corsJson(request, { success: true, post });
    } catch (err) {
      const failure = classifyPublishFailure(err);
      // forceTerminal=true — a manual "publish now" click either succeeds
      // or reports a failure outright; there is no "wait and auto-retry"
      // concept for an explicit, synchronous user action.
      await markFailed(claimed.id, claimed.attemptCount, failure, true);
      console.error('[social-scheduling] publishing_failed_terminal', { id: claimed.id, platform: claimed.platform, pageId: claimed.pageId, trigger: 'publish-now', errorCode: failure.code });
      const post = await getScheduledPostById(id);
      return corsJson(request, { success: false, error: { type: 'META_API_ERROR', message: 'Unable to publish this post right now.' }, post }, { status: 502 });
    }
  } catch (err) {
    console.error('[api/social/scheduled-posts/:id/publish-now] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't publish that post. Please try again." }, { status: 500 });
  }
}
