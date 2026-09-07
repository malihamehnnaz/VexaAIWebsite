import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { listComments, getMediaSummary } from '@/lib/instagram/store';
import { syncIfStale } from '@/lib/instagram/sync';

// GET /api/instagram/posts/:mediaId/comments — comments for one post.

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

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-post-comments', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { mediaId } = await params;
  if (!mediaId) {
    return corsJson(request, { success: false, error: 'Missing mediaId' }, { status: 400 });
  }

  try {
    await syncIfStale();

    const post = await getMediaSummary(mediaId);
    if (!post) {
      return corsJson(request, { success: false, error: 'Post not found' }, { status: 404 });
    }

    const searchParams = new URL(request.url).searchParams;
    const result = await listComments({
      mediaId,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    });

    return corsJson(request, { success: true, post, comments: result.comments, pagination: { nextCursor: result.nextCursor } });
  } catch (err) {
    console.error('[api/instagram/posts/[mediaId]/comments] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load comments for this post. Please try again." }, { status: 500 });
  }
}
