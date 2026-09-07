import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { googleErrorResponse } from '@/lib/google/respond';
import { withCache } from '@/lib/google/cache';
import { rateLimit } from '@/lib/rate-limit';
import { listSitemaps } from '@/lib/google/search-console';
import { resolveProperty } from '@/lib/google/search-console-property';

// GET /api/search-console/sitemaps — submitted sitemaps for the property.
//
// Every field here comes straight from Google's Sitemaps API; fields Google
// omits for a given sitemap are null rather than invented. `contents` is
// Google's own per-type breakdown (submitted vs indexed URL counts) — note
// that Google reports these as strings over JSON, parsed to numbers here.
//
// Query params: property.

const CACHE_TTL_SECONDS = 3600; // sitemaps change rarely

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'sc-sitemaps', 60, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited', code: 'rate_limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;

  try {
    const { accessToken } = await getValidAccessToken();
    const property = await resolveProperty(accessToken, params.get('property'));

    const sitemaps = await withCache(`sc:sitemaps:${property}`, CACHE_TTL_SECONDS, () => listSitemaps(accessToken, property));

    return NextResponse.json({ success: true, property, sitemaps });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
