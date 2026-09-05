import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { getConversationById, recordOutboundMessage, resolveConversationId } from '@/lib/messenger-store';
import { MessengerSendError, resolvePageAccessToken, sendTextMessage } from '@/lib/messenger-send';
import { containsDangerousContent, sanitizeText } from '@/lib/sanitize';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/messenger/reply — for the separate marketing website. Sends a
// plain-text reply through Meta's Send API for the given Page, then records
// it in the database. No AI generation here — the text comes directly from
// the marketing-site user (requirement: no AI replies yet).

const MAX_REPLY_CHARS = 2000; // Messenger's own text message limit

interface ReplyRequestBody {
  pageId?: unknown;
  recipientId?: unknown;
  conversationId?: unknown;
  text?: unknown;
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
  // Tighter than the read endpoints — this one sends real messages to real customers.
  if (!await rateLimit(ip, 'messenger-reply', 20, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as ReplyRequestBody | null;
  const pageId = typeof body?.pageId === 'string' ? body.pageId.trim() : '';
  const recipientId = typeof body?.recipientId === 'string' ? body.recipientId.trim() : '';
  const conversationIdInput = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
  const rawText = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!pageId || !recipientId || !rawText) {
    return corsJson(request, { success: false, error: 'pageId, recipientId, and text are required' }, { status: 400 });
  }
  if (rawText.length > MAX_REPLY_CHARS) {
    return corsJson(request, { success: false, error: 'text is too long' }, { status: 400 });
  }
  if (containsDangerousContent(rawText)) {
    return corsJson(request, { success: false, error: 'text contains disallowed content' }, { status: 400 });
  }
  const text = sanitizeText(rawText, MAX_REPLY_CHARS);

  if (!resolvePageAccessToken(pageId)) {
    return corsJson(request, { success: false, error: 'No Page Access Token configured for this Page' }, { status: 400 });
  }

  try {
    let conversationId = conversationIdInput;
    if (conversationId) {
      const conversation = await getConversationById(conversationId);
      if (!conversation || conversation.pageId !== pageId || conversation.senderId !== recipientId) {
        return corsJson(request, { success: false, error: 'conversationId does not match pageId/recipientId' }, { status: 400 });
      }
    } else {
      conversationId = await resolveConversationId(pageId, recipientId);
    }

    let metaMessageId: string | null;
    try {
      const sendResult = await sendTextMessage(pageId, recipientId, text);
      metaMessageId = sendResult.metaMessageId;
    } catch (err) {
      // Meta rejected it or the request failed — do not save as sent.
      const detail = err instanceof MessengerSendError ? err.message : 'unknown error';
      console.error('[api/messenger/reply] send failed:', detail);
      return corsJson(request, { success: false, error: 'Unable to send Messenger message' }, { status: 502 });
    }

    const saved = await recordOutboundMessage({ pageId, recipientId, conversationId, text, metaMessageId });

    return corsJson(request, {
      success: true,
      message: {
        id: saved.id,
        messageId: saved.messageId,
        conversationId: saved.conversationId,
        text: saved.text,
        direction: saved.direction,
        status: 'sent',
        timestamp: saved.timestamp,
      },
    });
  } catch (err) {
    console.error('[api/messenger/reply] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: 'Unable to send Messenger message' }, { status: 500 });
  }
}
