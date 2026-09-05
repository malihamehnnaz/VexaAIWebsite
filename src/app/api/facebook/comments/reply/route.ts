import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getCommentByCommentId, recordOwnReply } from '@/lib/facebook/store';
import { postCommentReply, FacebookGraphError } from '@/lib/facebook/graph';
import { containsDangerousContent, sanitizeText } from '@/lib/sanitize';
import { GP_CAFE_PAGE_ID, isSupportedCommentsPageId } from '@/lib/facebook/config';

// POST /api/facebook/comments/reply — for the separate marketing website.
// Sends a reply through Meta's Graph API for the given comment, then
// records it and marks the original comment "replied". No AI generation —
// the reply text comes directly from the marketing-site user.

const MAX_REPLY_CHARS = 5000;

interface ReplyRequestBody {
  pageId?: unknown;
  commentId?: unknown;
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

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  // Tighter than the read endpoints — this sends a real reply to a real customer.
  if (!await rateLimit(ip, 'facebook-comments-reply', 20, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as ReplyRequestBody | null;
  const pageId = typeof body?.pageId === 'string' ? body.pageId.trim() : '';
  const commentId = typeof body?.commentId === 'string' ? body.commentId.trim() : '';
  const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!pageId || !commentId || !rawMessage) {
    return corsJson(request, { success: false, error: 'pageId, commentId, and message are required' }, { status: 400 });
  }
  if (!isSupportedCommentsPageId(pageId)) {
    return corsJson(request, { success: false, error: 'Unsupported Page ID' }, { status: 403 });
  }
  if (rawMessage.length > MAX_REPLY_CHARS) {
    return corsJson(request, { success: false, error: 'message is too long' }, { status: 400 });
  }
  if (containsDangerousContent(rawMessage)) {
    return corsJson(request, { success: false, error: 'message contains disallowed content' }, { status: 400 });
  }
  const message = sanitizeText(rawMessage, MAX_REPLY_CHARS);

  try {
    // Only reply to a comment we've actually seen on GP's page — prevents
    // replying to an arbitrary/unknown Facebook comment ID.
    const comment = await getCommentByCommentId(commentId);
    if (!comment) {
      return corsJson(request, { success: false, error: 'Comment not found' }, { status: 404 });
    }

    let replyCommentId: string;
    try {
      const result = await postCommentReply(GP_CAFE_PAGE_ID, commentId, message);
      replyCommentId = result.replyCommentId;
    } catch (err) {
      // Meta rejected it or the request failed — do not mark as replied.
      const detail = err instanceof FacebookGraphError ? err.message : 'unknown error';
      console.error('[api/facebook/comments/reply] send failed:', detail);
      return corsJson(request, { success: false, error: 'Unable to send the reply to Facebook' }, { status: 502 });
    }

    await recordOwnReply({ postId: comment.postId, parentCommentId: commentId, replyCommentId, message });

    return corsJson(request, {
      success: true,
      reply: { commentId: replyCommentId, parentCommentId: commentId, postId: comment.postId, message, status: 'sent' },
      comment: { commentId, status: 'replied' },
    });
  } catch (err) {
    console.error('[api/facebook/comments/reply] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: 'Unable to send the reply to Facebook' }, { status: 500 });
  }
}
