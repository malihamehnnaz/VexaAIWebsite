import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { markCommentRead } from '@/lib/instagram/store';

// POST /api/instagram/comments/:commentId/read — call when a comment is
// opened/viewed. Only transitions new -> read (a no-op, not an error, if
// already read/replied).

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

export async function POST(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-comment-read', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { commentId } = await params;
  if (!commentId) {
    return corsJson(request, { success: false, error: 'Missing commentId' }, { status: 400 });
  }

  try {
    const status = await markCommentRead(commentId);
    if (!status) {
      return corsJson(request, { success: false, error: 'Comment not found' }, { status: 404 });
    }
    return corsJson(request, { success: true, commentId, status });
  } catch (err) {
    console.error('[api/instagram/comments/[commentId]/read] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: 'Unable to update comment status' }, { status: 500 });
  }
}
