import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { listMediaSummaries } from '@/lib/instagram/store';
import { syncIfStale } from '@/lib/instagram/sync';

// GET /api/instagram/posts — for the Marketing Website.
// Query params: search (caption text), type (IMAGE|VIDEO|CAROUSEL_ALBUM|
// REELS — matched against media_type/media_product_type), dateFrom/dateTo,
// cursor, limit (max 100). Newest first.

function decodeOffset(cursor: string | null): number {
  if (!cursor) return 0;
  const n = parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function encodeOffset(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
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

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-posts', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '25', 10) || 25, 1), 100);
  const offset = decodeOffset(params.get('cursor'));
  const search = params.get('search')?.toLowerCase() ?? null;
  const type = params.get('type')?.toUpperCase() ?? null;
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');

  try {
    await syncIfStale();

    // Filtering happens after the paged DB read for search/type/date, since
    // this data volume is small; a growing account would want these pushed
    // into the query instead.
    const { items, total } = await listMediaSummaries(limit, offset);
    const filtered = items.filter(post => {
      if (search && !(post.caption ?? '').toLowerCase().includes(search)) return false;
      if (type && post.mediaType !== type && post.mediaProductType !== type) return false;
      if (dateFrom && (!post.timestamp || post.timestamp < dateFrom)) return false;
      if (dateTo && (!post.timestamp || post.timestamp > dateTo)) return false;
      return true;
    });

    return corsJson(request, {
      success: true,
      posts: filtered,
      pagination: { total, nextCursor: offset + limit < total ? encodeOffset(offset + limit) : null },
    });
  } catch (err) {
    console.error('[api/instagram/posts] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load Instagram posts. Please try again." }, { status: 500 });
  }
}
