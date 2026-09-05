import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { listConversations } from '@/lib/messenger-store';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/messenger/conversations — for the separate marketing website.
// Returns Messenger conversations grouped by (Facebook Page, customer),
// newest activity first. Optionally filter with ?pageId=...

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
  if (!await rateLimit(ip, 'messenger-conversations', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const pageId = new URL(request.url).searchParams.get('pageId') ?? undefined;

  try {
    const conversations = await listConversations(pageId);
    return corsJson(request, { success: true, conversations });
  } catch (err) {
    console.error('[api/messenger/conversations] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: 'Unable to load conversations' }, { status: 500 });
  }
}
