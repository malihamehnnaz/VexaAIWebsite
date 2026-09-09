import { describe, it, expect, vi, beforeEach } from 'vitest';

const { generateOpportunitiesMock } = vi.hoisted(() => ({ generateOpportunitiesMock: vi.fn() }));
vi.mock('@/lib/content-intelligence/opportunities', () => ({ generateOpportunities: generateOpportunitiesMock }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: () => true,
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));

import { GET } from './route';

function makeRequest(): Request {
  return new Request('https://www.vexaai.se/api/content-intelligence/next-best-post', { headers: { Authorization: 'Bearer test' } });
}

beforeEach(() => {
  generateOpportunitiesMock.mockReset();
});

describe('GET /api/content-intelligence/next-best-post', () => {
  it('returns the highest-ranked opportunity, mapped to the documented response shape', async () => {
    generateOpportunitiesMock.mockResolvedValue({
      opportunities: [
        { id: 'op-1', pageId: 'p1', title: 'Post about smashburgers', recommendation: 'Do X', topic: 'smashburgers', format: 'reel', reason: 'Highest-scoring opportunity based on current signals.', trendSignalId: 't1', trendScore: 85, audienceFitScore: 80, historicalFitScore: 60, freshnessScore: 100, opportunityScore: 91, confidence: 'medium', recommendedDay: 'Saturday', recommendedTime: '12:00 UTC', supportingEvidence: ['reason 1', 'reason 2'], computedAt: '2026-09-09T00:00:00Z' },
        { id: 'op-2', pageId: 'p1', title: 'Lower ranked', recommendation: 'Do Y', topic: 'x', format: 'photo', reason: 'r', trendSignalId: null, trendScore: 40, audienceFitScore: 40, historicalFitScore: 40, freshnessScore: 50, opportunityScore: 42, confidence: 'low', recommendedDay: null, recommendedTime: null, supportingEvidence: [], computedAt: '2026-09-09T00:00:00Z' },
      ],
      insufficientData: false,
      insufficientDataReason: null,
      trendFetch: { signals: [], sourceStatuses: [{ source: 'google_news', available: true, signalCount: 3 }], dataFreshness: 'fresh', fetchedAt: '2026-09-09T00:00:00Z' },
      restaurantContext: { pageId: 'p1', pageName: 'Test', instagramUsername: null, instagramFollowers: null, facebookFollowers: null },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.opportunity.title).toBe('Post about smashburgers');
    expect(body.opportunity.opportunityScore).toBe(91);
    expect(body.opportunity.format).toBe('reel');
    expect(body.opportunity.why).toEqual(['reason 1', 'reason 2']);
    // The route must pick the FIRST (highest-ranked) opportunity, not just any.
    expect(body.opportunity.id).toBe('op-1');
  });

  it('returns insufficient_data status rather than fabricating a recommendation', async () => {
    generateOpportunitiesMock.mockResolvedValue({
      opportunities: [],
      insufficientData: true,
      insufficientDataReason: 'No current trend signals and no historical performance data are available yet.',
      trendFetch: { signals: [], sourceStatuses: [], dataFreshness: 'unavailable', fetchedAt: null },
      restaurantContext: { pageId: 'p1', pageName: null, instagramUsername: null, instagramFollowers: null, facebookFollowers: null },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.opportunity).toBeNull();
    expect(body.status).toBe('insufficient_data');
    expect(body.reason).toBeTruthy();
  });

  it('returns a 500 with a generic message (no internal details) when generation throws', async () => {
    generateOpportunitiesMock.mockRejectedValue(new Error('Supabase connection refused at 10.0.0.5'));
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
  });
});
