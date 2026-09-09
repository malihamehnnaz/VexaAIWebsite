import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression test for requirement 10: Content Intelligence responses must
// never be able to leak a Meta access token, Page Access Token, System
// User token, raw Meta API payload, a paging URL, or any credential/env
// var value — even if an upstream service accidentally returned one
// (simulating exactly the kind of regression that already happened once
// this session with a raw Insights payload's paging.previous URL).
//
// Strategy: mock the underlying services to return realistic-looking token
// strings and raw-payload-shaped objects in their responses, then assert
// the ACTUAL serialized HTTP response body from each route never contains
// them. This proves the routes allow-list their output fields rather than
// spreading upstream objects wholesale — the actual structural property
// that prevents leakage, not just "it happened not to leak this time".

const FAKE_META_TOKEN = 'EAANbq6UhE7wBSXldBeBLIncDZB4mO84p0tzuUY0K58Dde0njfafRBcllGy7S6s47XqfqahNZBqjLyRCln9u19LB54fRNyhNmtvaDUGsmDLltH2carHe9OFRS8HDRKr8BYOAeIZAnlaxaLnpUL3BCZB8ahstHDf2s06ZCOhK3yN7ZBYK0AuYWrpjMZAeaZBoJsWq72PEPCnQZD';
const FAKE_PAGING_URL = `https://graph.facebook.com/v26.0/106658601471856/insights?access_token=${FAKE_META_TOKEN}&since=1&until=2`;
const FAKE_AZURE_KEY = 'sk-fake-azure-openai-key-1234567890abcdef';
const ENV_VAR_NAMES = ['META_PAGE_ACCESS_TOKEN', 'META_APP_SECRET', 'AZURE_OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_TOKEN_ENCRYPTION_KEY'];

function assertNoLeakage(serialized: string) {
  expect(serialized).not.toContain(FAKE_META_TOKEN);
  expect(serialized).not.toContain(FAKE_PAGING_URL);
  expect(serialized).not.toContain(FAKE_AZURE_KEY);
  expect(serialized).not.toMatch(/^EAA[A-Za-z0-9]{50,}/m); // Meta token shape, start-of-line to avoid matching this file's own comment
  for (const name of ENV_VAR_NAMES) {
    expect(serialized).not.toContain(name);
  }
}

const { generateOpportunitiesMock, getOpportunityByIdMock, getRestaurantContextMock, generateContentDraftMock, saveGeneratedContentMock } = vi.hoisted(() => ({
  generateOpportunitiesMock: vi.fn(),
  getOpportunityByIdMock: vi.fn(),
  getRestaurantContextMock: vi.fn(),
  generateContentDraftMock: vi.fn(),
  saveGeneratedContentMock: vi.fn(),
}));

vi.mock('@/lib/content-intelligence/opportunities', () => ({ generateOpportunities: generateOpportunitiesMock }));
vi.mock('@/lib/content-intelligence/store', () => ({ getOpportunityById: getOpportunityByIdMock, saveGeneratedContent: saveGeneratedContentMock }));
vi.mock('@/lib/content-intelligence/restaurant-context', () => ({ getRestaurantContext: getRestaurantContextMock }));
vi.mock('@/lib/content-intelligence/generate', async () => {
  const actual = await vi.importActual<typeof import('@/lib/content-intelligence/generate')>('@/lib/content-intelligence/generate');
  return { ...actual, generateContentDraft: generateContentDraftMock };
});
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: () => true,
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));

// Simulates an upstream regression: real restaurant context accidentally
// carries a raw token field (this should never happen given
// RestaurantContext's real type, but the route must not leak it even if it
// somehow did — defense in depth, not just type-checking).
const LEAKY_CONTEXT = {
  pageId: '106658601471856',
  pageName: 'Test Café',
  instagramUsername: null,
  instagramFollowers: null,
  facebookFollowers: null,
  // Deliberately simulating a field that should never exist on a real
  // RestaurantContext — proves the route can't leak it even if it did.
  __leakedPageAccessToken: FAKE_META_TOKEN,
};

const LEAKY_OPPORTUNITY = {
  id: 'op-1', pageId: '106658601471856', title: 't', recommendation: 'r', topic: 'x', format: 'reel', reason: 'reason',
  trendSignalId: null, trendScore: 50, audienceFitScore: 50, historicalFitScore: 50, freshnessScore: 50, opportunityScore: 50,
  confidence: 'medium', recommendedDay: null, recommendedTime: null,
  supportingEvidence: [`Raw Meta response for debugging: ${JSON.stringify({ paging: { previous: FAKE_PAGING_URL } })}`], // simulates a dev accidentally logging raw Meta paging into evidence text
  computedAt: '2026-09-09T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Content Intelligence — token/credential leakage prevention', () => {
  it('next-best-post never leaks a token even if the opportunity data carries one embedded in text', async () => {
    generateOpportunitiesMock.mockResolvedValue({
      opportunities: [LEAKY_OPPORTUNITY],
      insufficientData: false,
      insufficientDataReason: null,
      trendFetch: { signals: [], sourceStatuses: [], dataFreshness: 'fresh', fetchedAt: '2026-09-09T00:00:00Z' },
      restaurantContext: LEAKY_CONTEXT,
    });

    const { GET } = await import('@/app/api/content-intelligence/next-best-post/route');
    const response = await GET(new Request('https://www.vexaai.se/api/content-intelligence/next-best-post', { headers: { Authorization: 'Bearer test' } }));
    const text = await response.text();

    // The supportingEvidence string DOES pass through as "why" (it's
    // legitimate human-readable text) — the check here is that the
    // structural fields around it (context, raw payload) never appear, and
    // no bare token substring appears anywhere in the body.
    assertNoLeakage(text);
  });

  it('generate never leaks the restaurant context object wholesale, even if it carries an unexpected token-shaped field', async () => {
    getOpportunityByIdMock.mockResolvedValue({ id: 'op-1', pageId: '106658601471856', title: 't', recommendation: 'r', topic: 'x', format: 'reel', reason: 'reason', trendSignalId: null, trendScore: 50, audienceFitScore: 50, historicalFitScore: 50, freshnessScore: 50, opportunityScore: 50, confidence: 'medium', recommendedDay: null, recommendedTime: null, supportingEvidence: [], computedAt: '2026-09-09T00:00:00Z' });
    getRestaurantContextMock.mockResolvedValue(LEAKY_CONTEXT);
    generateContentDraftMock.mockResolvedValue({ concept: 'c', hook: 'h', caption: 'cap', cta: 'cta', hashtags: [], creativeBrief: 'brief', videoScript: null, visualDirection: 'vd' });
    saveGeneratedContentMock.mockResolvedValue({ id: 'gen-1', opportunityId: 'op-1', platform: 'instagram', format: 'reel', concept: 'c', hook: 'h', caption: 'cap', cta: 'cta', hashtags: [], creativeBrief: 'brief', videoScript: null, visualDirection: 'vd', status: 'draft', createdAt: '2026-09-09T00:00:00Z' });

    const { POST } = await import('@/app/api/content-intelligence/generate/route');
    const response = await POST(new Request('https://www.vexaai.se/api/content-intelligence/generate', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: 'op-1', platform: 'instagram', format: 'reel' }),
    }));
    const text = await response.text();
    assertNoLeakage(text);
  });

  it('generate error responses never include the raw error object or a Meta error payload', async () => {
    getOpportunityByIdMock.mockResolvedValue({ id: 'op-1', pageId: '106658601471856', title: 't', recommendation: 'r', topic: 'x', format: 'reel', reason: 'reason', trendSignalId: null, trendScore: 50, audienceFitScore: 50, historicalFitScore: 50, freshnessScore: 50, opportunityScore: 50, confidence: 'medium', recommendedDay: null, recommendedTime: null, supportingEvidence: [], computedAt: '2026-09-09T00:00:00Z' });
    getRestaurantContextMock.mockResolvedValue({ pageId: '106658601471856', pageName: null, instagramUsername: null, instagramFollowers: null, facebookFollowers: null });
    generateContentDraftMock.mockRejectedValue(new Error(`Azure OpenAI request failed with header Authorization: Bearer ${FAKE_AZURE_KEY}`));

    const { POST } = await import('@/app/api/content-intelligence/generate/route');
    const response = await POST(new Request('https://www.vexaai.se/api/content-intelligence/generate', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: 'op-1', platform: 'instagram', format: 'reel' }),
    }));
    const text = await response.text();
    // The route must return a generic message, not the thrown error's text.
    expect(text).not.toContain(FAKE_AZURE_KEY);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('trends endpoint never leaks source env var names or raw Meta payload shapes', async () => {
    generateOpportunitiesMock.mockResolvedValue({
      opportunities: [LEAKY_OPPORTUNITY],
      insufficientData: false,
      insufficientDataReason: null,
      trendFetch: { signals: [], sourceStatuses: [{ source: 'google_news', available: true, signalCount: 1 }], dataFreshness: 'fresh', fetchedAt: '2026-09-09T00:00:00Z' },
      restaurantContext: LEAKY_CONTEXT,
    });

    const { GET } = await import('@/app/api/content-intelligence/trends/route');
    const response = await GET(new Request('https://www.vexaai.se/api/content-intelligence/trends', { headers: { Authorization: 'Bearer test' } }));
    const text = await response.text();
    assertNoLeakage(text);
  });
});
