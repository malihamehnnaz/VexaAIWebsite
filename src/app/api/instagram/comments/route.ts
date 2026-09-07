import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { listComments, type CommentStatus } from '@/lib/instagram/store';
import { syncIfStale } from '@/lib/instagram/sync';

// GET /api/instagram/comments — for the Marketing Website.
// Query params: status (new|read|replied), mediaId, search, dateFrom,
// dateTo, cursor, limit (max 100). Newest first.

const VALID_STATUSES: CommentStatus[] = ['new', 'read', 'replied'];

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
  if (!await rateLimit(ip, 'instagram-comments', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const statusParam = params.get('status');
  if (statusParam && !VALID_STATUSES.includes(statusParam as CommentStatus)) {
    return corsJson(request, { success: false, error: 'Invalid status filter' }, { status: 400 });
  }

  try {
    await syncIfStale();

    const result = await listComments({
      status: statusParam as CommentStatus | undefined,
      mediaId: params.get('mediaId') ?? undefined,
      search: params.get('search') ?? undefined,
      dateFrom: params.get('dateFrom') ?? undefined,
      dateTo: params.get('dateTo') ?? undefined,
      cursor: params.get('cursor') ?? undefined,
      limit: params.get('limit') ? parseInt(params.get('limit')!, 10) : undefined,
    });

    return corsJson(request, { success: true, comments: result.comments, pagination: { nextCursor: result.nextCursor } });
  } catch (err) {
    console.error('[api/instagram/comments] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Instagram comments. Please try again." }, { status: 500 });
  }
}
