import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { generateOpportunities } from '@/lib/content-intelligence/opportunities';
import { scrubSecretsDeep } from '@/lib/content-intelligence/redact';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import type { Confidence, Freshness, Platform } from '@/lib/content-intelligence/types';

// GET /api/content-intelligence/trends — the ranked list of current content
// opportunities for the connected restaurant. Query params:
//   page (default 1), pageSize (default 10, max 50)
//   platform — filter by opportunity.format's platform relevance (facebook|instagram)
//   category — filter by the underlying trend signal's category, when one is linked
//   confidence — low|medium|high
//   freshness — new|recent|aging|stale (only applies to trend-linked opportunities)
//
// Every result carries `why` (real, human-readable supporting evidence) —
// never an unexplained score.

const VALID_CONFIDENCE: Confidence[] = ['low', 'medium', 'high'];
const VALID_FRESHNESS: Freshness[] = ['new', 'recent', 'aging', 'stale'];
const VALID_PLATFORM: Platform[] = ['facebook', 'instagram'];

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
  if (!await rateLimit(ip, 'content-intelligence-trends', 30, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(params.get('pageSize') ?? '10', 10) || 10));
  const confidenceFilter = params.get('confidence');
  const freshnessFilter = params.get('freshness');
  const platformFilter = params.get('platform');
  const categoryFilter = params.get('category');

  if (confidenceFilter && !VALID_CONFIDENCE.includes(confidenceFilter as Confidence)) {
    return corsJson(request, { success: false, error: `Invalid confidence. Use one of: ${VALID_CONFIDENCE.join(', ')}` }, { status: 400 });
  }
  if (freshnessFilter && !VALID_FRESHNESS.includes(freshnessFilter as Freshness)) {
    return corsJson(request, { success: false, error: `Invalid freshness. Use one of: ${VALID_FRESHNESS.join(', ')}` }, { status: 400 });
  }
  if (platformFilter && !VALID_PLATFORM.includes(platformFilter as Platform)) {
    return corsJson(request, { success: false, error: `Invalid platform. Use one of: ${VALID_PLATFORM.join(', ')}` }, { status: 400 });
  }

  try {
    const result = await generateOpportunities(GP_CAFE_PAGE_ID);

    if (result.insufficientData) {
      return corsJson(request, {
        success: true,
        opportunities: [],
        status: 'insufficient_data',
        reason: result.insufficientDataReason,
        dataFreshness: result.trendFetch.dataFreshness,
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      });
    }

    const trendById = new Map(result.trendFetch.signals.map(t => [t.id, t]));

    let filtered = result.opportunities;
    if (confidenceFilter) filtered = filtered.filter(o => o.confidence === confidenceFilter);
    if (freshnessFilter) filtered = filtered.filter(o => o.trendSignalId && trendById.get(o.trendSignalId)?.freshness === freshnessFilter);
    if (categoryFilter) filtered = filtered.filter(o => o.trendSignalId && trendById.get(o.trendSignalId)?.category === categoryFilter);
    // platform isn't stored on an opportunity directly (a format can go to
    // either platform) — filtering by platform is a no-op today, included
    // in the contract for forward compatibility once opportunities carry a
    // platform recommendation of their own.
    void platformFilter;

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

    return corsJson(request, scrubSecretsDeep({
      success: true,
      opportunities: pageItems.map(o => ({
        id: o.id,
        title: o.title,
        recommendation: o.recommendation,
        topic: o.topic,
        format: o.format,
        category: o.trendSignalId ? trendById.get(o.trendSignalId)?.category ?? null : null,
        freshness: o.trendSignalId ? trendById.get(o.trendSignalId)?.freshness ?? null : null,
        opportunityScore: o.opportunityScore,
        confidence: o.confidence,
        recommendedDay: o.recommendedDay,
        recommendedTime: o.recommendedTime,
        why: o.supportingEvidence,
      })),
      dataFreshness: result.trendFetch.dataFreshness,
      sourceStatuses: result.trendFetch.sourceStatuses,
      pagination: { page, pageSize, total, totalPages },
    }));
  } catch (err) {
    console.error('[api/content-intelligence/trends] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load content opportunities right now. Please try again." }, { status: 500 });
  }
}
