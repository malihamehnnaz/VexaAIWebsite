import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { googleErrorResponse } from '@/lib/google/respond';
import { withCache } from '@/lib/google/cache';
import { rateLimit } from '@/lib/rate-limit';
import { inspectUrl } from '@/lib/google/search-console';
import { resolveProperty } from '@/lib/google/search-console-property';

// GET /api/search-console/indexing
//
// Two distinct things get called "indexing data", and Google exposes only
// one of them via API:
//
//   • Bulk index coverage — the "Pages" report in the Search Console UI
//     (how many pages are indexed / excluded, and why). Google publishes NO
//     API for this. The Search Analytics API returns search performance
//     only, and there is no coverage endpoint in the Webmasters v3 or
//     Search Console v1 APIs. This endpoint therefore reports
//     available:false with an explicit reason rather than returning
//     fabricated zeros.
//
//   • Per-URL inspection — the URL Inspection API
//     (POST /v1/urlInspection/index:inspect) IS available under the same
//     webmasters.readonly scope this integration already requests. Pass
//     ?url=<absolute URL> to get the real indexing status for one URL.
//
// Query params: property, url (optional — enables per-URL inspection).
//
// Note: Google rate-limits URL Inspection considerably more aggressively
// than Search Analytics, so it is not suitable for bulk-checking a site.

const CACHE_TTL_SECONDS = 3600;

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
  // Tighter than the reporting endpoints — URL Inspection has a much lower
  // quota at Google's end.
  if (!await rateLimit(ip, 'sc-indexing', 20, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited', code: 'rate_limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const url = params.get('url');

  try {
    const { accessToken } = await getValidAccessToken();
    const property = await resolveProperty(accessToken, params.get('property'));

    if (!url) {
      return NextResponse.json({
        success: true,
        property,
        coverage: {
          available: false,
          reason: 'Bulk index coverage is not available through any public Google API. The Search Console "Pages" report has no API equivalent; the Search Analytics API returns search performance data only.',
        },
        urlInspection: {
          available: true,
          usage: 'Pass ?url=<absolute URL> to inspect the indexing status of a single URL.',
        },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'url must be an absolute URL', code: 'invalid_url' }, { status: 400 });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ success: false, error: 'url must be http or https', code: 'invalid_url' }, { status: 400 });
    }

    const inspection = await withCache(`sc:inspect:${property}:${url}`, CACHE_TTL_SECONDS, () => inspectUrl(accessToken, property, url));

    return NextResponse.json({
      success: true,
      property,
      coverage: {
        available: false,
        reason: 'Bulk index coverage is not available through any public Google API.',
      },
      urlInspection: { available: true, url, result: inspection },
    });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
