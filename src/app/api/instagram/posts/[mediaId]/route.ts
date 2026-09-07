import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getMediaSummary } from '@/lib/instagram/store';
import { getMediaInsights, InstagramGraphError } from '@/lib/instagram/graph';
import { syncIfStale } from '@/lib/instagram/sync';
import { withCache } from '@/lib/google/cache';

// GET /api/instagram/posts/:mediaId — post detail + per-media insights.
// Metrics unsupported for this media_product_type (e.g. `shares` on an
// image post) come back null, never a fabricated 0.

const CACHE_TTL_SECONDS = 300;

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

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'instagram-post-detail', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { mediaId } = await params;
  if (!mediaId) {
    return corsJson(request, { success: false, error: 'Missing mediaId' }, { status: 400 });
  }

  try {
    await syncIfStale();

    const post = await getMediaSummary(mediaId);
    if (!post) {
      return corsJson(request, { success: false, error: 'Post not found' }, { status: 404 });
    }

    const insights = await withCache(`ig:media-insights:${mediaId}`, CACHE_TTL_SECONDS, () => getMediaInsights(mediaId));

    return corsJson(request, { success: true, post, insights });
  } catch (err) {
    if (err instanceof InstagramGraphError) {
      console.error('[api/instagram/posts/[mediaId]] Meta error:', err.message);
      return corsJson(request, { success: false, error: { type: 'META_API_ERROR', message: 'Unable to retrieve post insights' } }, { status: 502 });
    }
    console.error('[api/instagram/posts/[mediaId]] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load this post. Please try again." }, { status: 500 });
  }
}
