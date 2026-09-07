import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getCommentByCommentId, recordOwnCommentReply } from '@/lib/instagram/store';
import { postInstagramCommentReply, InstagramGraphError } from '@/lib/instagram/graph';
import { containsDangerousContent, sanitizeText } from '@/lib/sanitize';

// POST /api/instagram/comments/:commentId/reply — sends a reply through
// Meta's Instagram Graph API, then records it and marks the original
// comment "replied". No AI generation — text comes directly from the
// Marketing Website's user. `success: true` is only ever returned once Meta
// has actually confirmed the reply.

const MAX_REPLY_CHARS = 2200; // Instagram comment length limit

interface ReplyRequestBody {
  message?: unknown;
}

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
  if (!await rateLimit(ip, 'instagram-comment-reply', 20, '1 m')) {
    return corsJson(request, { success: false, error: { type: 'RATE_LIMITED', message: 'Rate limited' } }, { status: 429 });
  }

  const { commentId } = await params;
  if (!commentId) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'Missing commentId' } }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as ReplyRequestBody | null;
  const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!rawMessage) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'message is required' } }, { status: 400 });
  }
  if (rawMessage.length > MAX_REPLY_CHARS) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'message is too long' } }, { status: 400 });
  }
  if (containsDangerousContent(rawMessage)) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'message contains disallowed content' } }, { status: 400 });
  }
  const message = sanitizeText(rawMessage, MAX_REPLY_CHARS);

  try {
    const comment = await getCommentByCommentId(commentId);
    if (!comment) {
      return corsJson(request, { success: false, error: { type: 'NOT_FOUND', message: 'Comment not found' } }, { status: 404 });
    }

    let replyCommentId: string;
    try {
      const result = await postInstagramCommentReply(commentId, message);
      replyCommentId = result.replyCommentId;
    } catch (err) {
      const detail = err instanceof InstagramGraphError ? err.message : 'unknown error';
      console.error('[api/instagram/comments/reply] send failed:', detail);
      return corsJson(request, { success: false, error: { type: 'META_API_ERROR', message: 'Unable to send the reply to Instagram' } }, { status: 502 });
    }

    await recordOwnCommentReply({ mediaId: comment.mediaId, parentCommentId: commentId, replyCommentId, message });

    return corsJson(request, { success: true, commentId: replyCommentId, replyId: replyCommentId, message });
  } catch (err) {
    console.error('[api/instagram/comments/reply] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: { type: 'INTERNAL_ERROR', message: 'Unable to send the reply to Instagram' } }, { status: 500 });
  }
}
