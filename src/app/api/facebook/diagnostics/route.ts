import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getPageIdentity, getPageSubscribedApps, debugPageToken, getPageInsightRaw, getPostInsightRaw, probePageAccessTokenDerivation, FacebookGraphError } from '@/lib/facebook/graph';
import { GP_CAFE_PAGE_ID, isSupportedCommentsPageId } from '@/lib/facebook/config';

// GET /api/facebook/diagnostics — TEMPORARY, for troubleshooting the
// Page-subscription/permission question only. Not part of the marketing
// site's ongoing API contract. Calls Meta's own token/subscription
// introspection endpoints and returns only safe metadata — never the Page
// Access Token or App Secret themselves. Same bearer auth as every other
// Facebook Comments route; always scoped to GP's Page, never an arbitrary one.
//
// Query param: appId (required) — Meta App ID, not secret, needed to build
// the app-access-token for debug_token.

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
  if (!await rateLimit(ip, 'facebook-diagnostics', 10, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const appId = params.get('appId');
  if (!appId) {
    return corsJson(request, { success: false, error: 'appId query param is required' }, { status: 400 });
  }

  const pageId = GP_CAFE_PAGE_ID;
  if (!isSupportedCommentsPageId(pageId)) {
    return corsJson(request, { success: false, error: 'Unsupported Page ID' }, { status: 403 });
  }

  const result: Record<string, unknown> = { pageId };

  try {
    result.pageIdentity = await getPageIdentity(pageId);
  } catch (err) {
    result.pageIdentityError = err instanceof FacebookGraphError ? err.message : 'unknown error';
  }

  try {
    result.subscribedApps = await getPageSubscribedApps(pageId);
  } catch (err) {
    result.subscribedAppsError = err instanceof FacebookGraphError ? err.message : 'unknown error';
  }

  try {
    result.tokenDebug = await debugPageToken(pageId, appId);
  } catch (err) {
    result.tokenDebugError = err instanceof FacebookGraphError ? err.message : 'unknown error';
  }

  const probeMetric = params.get('probeMetric');
  if (probeMetric) {
    const until = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    try {
      result.insightProbe = await getPageInsightRaw(pageId, probeMetric, since, until);
    } catch (err) {
      result.insightProbeError = err instanceof FacebookGraphError ? err.message : 'unknown error';
    }
  }

  const probePostId = params.get('probePostId');
  const probePostMetric = params.get('probePostMetric');
  if (probePostId && probePostMetric) {
    try {
      result.postInsightProbe = await getPostInsightRaw(pageId, probePostId, probePostMetric);
    } catch (err) {
      result.postInsightProbeError = err instanceof FacebookGraphError ? err.message : 'unknown error';
    }
  }

  if (params.get('probePageTokenDerivation') === 'true') {
    result.pageTokenDerivation = await probePageAccessTokenDerivation(pageId, appId);
  }

  return corsJson(request, { success: true, ...result });
}
