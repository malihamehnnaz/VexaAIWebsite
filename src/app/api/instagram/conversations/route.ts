import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { listConversations } from '@/lib/instagram/store';
import { syncIfStale } from '@/lib/instagram/sync';

// GET /api/instagram/conversations — for the Marketing Website.
// Query params: unread=true, search (participant username), cursor, limit.

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

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-conversations', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;

  try {
    await syncIfStale();

    const result = await listConversations({
      unreadOnly: params.get('unread') === 'true',
      search: params.get('search') ?? undefined,
      cursor: params.get('cursor') ?? undefined,
      limit: params.get('limit') ? parseInt(params.get('limit')!, 10) : undefined,
    });

    const conversations = result.conversations.map(c => ({
      id: c.conversationId,
      participant: { id: c.participantId, username: c.participantUsername },
      lastMessage: { text: c.lastMessageText, timestamp: c.lastMessageAt },
      unread: c.unread,
      updatedAt: c.updatedAt,
    }));

    return corsJson(request, { success: true, conversations, pagination: { nextCursor: result.nextCursor } });
  } catch (err) {
    console.error('[api/instagram/conversations] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Instagram conversations. Please try again." }, { status: 500 });
  }
}
