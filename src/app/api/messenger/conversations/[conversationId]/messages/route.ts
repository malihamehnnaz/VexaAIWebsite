import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { getConversationById, listMessages } from '@/lib/messenger-store';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/messenger/conversations/:conversationId/messages — for the
// separate marketing website. Returns messages for one conversation, oldest
// first (chat display order).

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
  if (!await rateLimit(ip, 'messenger-messages', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { conversationId } = await params;
  if (!conversationId) {
    return corsJson(request, { success: false, error: 'Missing conversationId' }, { status: 400 });
  }

  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return corsJson(request, { success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await listMessages(conversationId);
    return corsJson(request, { success: true, conversationId, messages });
  } catch (err) {
    console.error('[api/messenger/conversations/[id]/messages] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: 'Unable to load messages' }, { status: 500 });
  }
}
