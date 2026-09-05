import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { listComments, type CommentStatus } from '@/lib/facebook/store';
import { syncIfStale } from '@/lib/facebook/sync';
import { GP_CAFE_PAGE_ID, isSupportedCommentsPageId } from '@/lib/facebook/config';

// GET /api/facebook/comments — for the separate marketing website.
// Query params: pageId (default/only 106658601471856), status
// (new|read|replied), postId, search, dateFrom, dateTo (ISO timestamps),
// cursor, limit (max 100). Newest first.

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
  if (!await rateLimit(ip, 'facebook-comments', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const pageId = params.get('pageId') ?? GP_CAFE_PAGE_ID;
  if (!isSupportedCommentsPageId(pageId)) {
    return corsJson(request, { success: false, error: 'Unsupported Page ID' }, { status: 403 });
  }

  const statusParam = params.get('status');
  if (statusParam && !VALID_STATUSES.includes(statusParam as CommentStatus)) {
    return corsJson(request, { success: false, error: 'Invalid status filter' }, { status: 400 });
  }

  try {
    await syncIfStale();

    const result = await listComments({
      status: statusParam as CommentStatus | undefined,
      postId: params.get('postId') ?? undefined,
      search: params.get('search') ?? undefined,
      dateFrom: params.get('dateFrom') ?? undefined,
      dateTo: params.get('dateTo') ?? undefined,
      cursor: params.get('cursor') ?? undefined,
      limit: params.get('limit') ? parseInt(params.get('limit')!, 10) : undefined,
    });

    return corsJson(request, {
      success: true,
      pageId,
      comments: result.comments,
      pagination: { nextCursor: result.nextCursor },
    });
  } catch (err) {
    console.error('[api/facebook/comments] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Facebook comments. Please try again." }, { status: 500 });
  }
}
