import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { listPosts } from '@/lib/facebook/store';
import { syncIfStale } from '@/lib/facebook/sync';
import { GP_CAFE_PAGE_ID, isSupportedCommentsPageId } from '@/lib/facebook/config';

// GET /api/facebook/comments/posts — for the separate marketing website.
// Query params: pageId (default/only 106658601471856), limit. Newest first.

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
  if (!await rateLimit(ip, 'facebook-comments-posts', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const pageId = params.get('pageId') ?? GP_CAFE_PAGE_ID;
  if (!isSupportedCommentsPageId(pageId)) {
    return corsJson(request, { success: false, error: 'Unsupported Page ID' }, { status: 403 });
  }

  try {
    await syncIfStale();

    const limitParam = params.get('limit');
    const posts = await listPosts(limitParam ? parseInt(limitParam, 10) : undefined);

    return corsJson(request, { success: true, pageId, posts });
  } catch (err) {
    console.error('[api/facebook/comments/posts] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Facebook posts. Please try again." }, { status: 500 });
  }
}
