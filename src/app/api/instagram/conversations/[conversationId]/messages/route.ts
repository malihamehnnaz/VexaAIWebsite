import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getConversationById, listConversationMessages, upsertMessage, markConversationRead } from '@/lib/instagram/store';
import { sendInstagramMessage, InstagramGraphError } from '@/lib/instagram/graph';
import { containsDangerousContent, sanitizeText } from '@/lib/sanitize';
import { syncIfStale } from '@/lib/instagram/sync';

// GET  /api/instagram/conversations/:conversationId/messages — chronological
//      message history; also marks the conversation read.
// POST /api/instagram/conversations/:conversationId/messages — send a DM.
//      `success: true` only once Meta confirms the send.

const MAX_MESSAGE_CHARS = 1000; // Instagram Send API's own limit

interface SendMessageBody {
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

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-conversation-messages', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { conversationId } = await params;
  if (!conversationId) {
    return corsJson(request, { success: false, error: 'Missing conversationId' }, { status: 400 });
  }

  try {
    await syncIfStale();

    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return corsJson(request, { success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const limitParam = new URL(request.url).searchParams.get('limit');
    const messages = await listConversationMessages(conversationId, limitParam ? parseInt(limitParam, 10) : undefined);

    await markConversationRead(conversationId);

    return corsJson(request, { success: true, conversationId, messages });
  } catch (err) {
    console.error('[api/instagram/conversations/[id]/messages GET] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load these messages. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-send-message', 20, '1 m')) {
    return corsJson(request, { success: false, error: { type: 'RATE_LIMITED', message: 'Rate limited' } }, { status: 429 });
  }

  const { conversationId } = await params;
  if (!conversationId) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'Missing conversationId' } }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as SendMessageBody | null;
  const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!rawMessage) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'message is required' } }, { status: 400 });
  }
  if (rawMessage.length > MAX_MESSAGE_CHARS) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'message is too long' } }, { status: 400 });
  }
  if (containsDangerousContent(rawMessage)) {
    return corsJson(request, { success: false, error: { type: 'INVALID_REQUEST', message: 'message contains disallowed content' } }, { status: 400 });
  }
  const message = sanitizeText(rawMessage, MAX_MESSAGE_CHARS);

  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation || !conversation.participantId) {
      return corsJson(request, { success: false, error: { type: 'NOT_FOUND', message: 'Conversation not found' } }, { status: 404 });
    }

    let metaMessageId: string | null;
    try {
      const result = await sendInstagramMessage(conversation.participantId, message);
      metaMessageId = result.metaMessageId;
    } catch (err) {
      const detail = err instanceof InstagramGraphError ? err.message : 'unknown error';
      console.error('[api/instagram/conversations/[id]/messages POST] send failed:', detail);
      return corsJson(request, { success: false, error: { type: 'META_API_ERROR', message: 'Unable to send the message through Instagram' } }, { status: 502 });
    }

    const savedId = metaMessageId ?? `local:${conversationId}:${Date.now()}`;
    await upsertMessage({
      messageId: savedId,
      conversationId,
      senderId: null,
      recipientId: conversation.participantId,
      message,
      timestamp: new Date().toISOString(),
      direction: 'outbound',
    });

    return corsJson(request, { success: true, message: { id: savedId, conversationId, text: message, direction: 'outbound', status: 'sent' } });
  } catch (err) {
    console.error('[api/instagram/conversations/[id]/messages POST] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: { type: 'INTERNAL_ERROR', message: 'Unable to send the message through Instagram' } }, { status: 500 });
  }
}
