import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { generateOpportunities } from '@/lib/content-intelligence/opportunities';
import { scrubSecretsDeep } from '@/lib/content-intelligence/redact';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

// GET /api/content-intelligence/next-best-post — the single highest-ranked
// current content opportunity for the connected restaurant. Uses the
// connected Page's context (GP_CAFE_PAGE_ID today — not hard-coded into the
// underlying opportunity-generation logic, which accepts any pageId).
//
// "opportunityScore" is a real, documented weighted combination of trend/
// audience-fit/historical-fit/freshness scores (see opportunities.ts) —
// never a promise that content will perform any particular way.

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
  if (!await rateLimit(ip, 'content-intelligence-next-best-post', 30, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  try {
    const result = await generateOpportunities(GP_CAFE_PAGE_ID);

    if (result.insufficientData || result.opportunities.length === 0) {
      return corsJson(request, {
        success: true,
        opportunity: null,
        status: 'insufficient_data',
        reason: result.insufficientDataReason ?? 'No content opportunities could be generated from current signals.',
        dataFreshness: result.trendFetch.dataFreshness,
      });
    }

    const top = result.opportunities[0];
    return corsJson(request, scrubSecretsDeep({
      success: true,
      opportunity: {
        id: top.id,
        title: top.title,
        recommendation: top.recommendation,
        format: top.format,
        recommendedDay: top.recommendedDay,
        recommendedTime: top.recommendedTime,
        opportunityScore: top.opportunityScore,
        confidence: top.confidence,
        why: top.supportingEvidence,
      },
      dataFreshness: result.trendFetch.dataFreshness,
      sourceStatuses: result.trendFetch.sourceStatuses,
    }));
  } catch (err) {
    console.error('[api/content-intelligence/next-best-post] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't generate a recommendation right now. Please try again." }, { status: 500 });
  }
}
