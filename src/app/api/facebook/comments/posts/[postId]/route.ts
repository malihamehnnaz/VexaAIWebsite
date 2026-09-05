import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getPostWithComments } from '@/lib/facebook/store';
import { syncIfStale } from '@/lib/facebook/sync';

// GET /api/facebook/comments/posts/:postId — for the separate marketing
// website. Returns the post plus all its comments/replies, oldest first
// (chronological). Always scoped to GP's - Guilty Pleasure Café — the
// postId itself is only ever looked up within that Page's stored data
// (see src/lib/facebook/store.ts), so no other Page's post can be returned.

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

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'facebook-comments-post-detail', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { postId } = await params;
  if (!postId) {
    return corsJson(request, { success: false, error: 'Missing postId' }, { status: 400 });
  }

  try {
    await syncIfStale();

    const detail = await getPostWithComments(postId);
    if (!detail) {
      return corsJson(request, { success: false, error: 'Post not found' }, { status: 404 });
    }

    return corsJson(request, { success: true, post: detail.post, comments: detail.comments });
  } catch (err) {
    console.error('[api/facebook/comments/posts/[postId]] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load this post. Please try again." }, { status: 500 });
  }
}
