import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getOpportunityByIdMock, getRestaurantContextMock, generateContentDraftMock, saveGeneratedContentMock } = vi.hoisted(() => ({
  getOpportunityByIdMock: vi.fn(),
  getRestaurantContextMock: vi.fn(),
  generateContentDraftMock: vi.fn(),
  saveGeneratedContentMock: vi.fn(),
}));

vi.mock('@/lib/content-intelligence/store', () => ({
  getOpportunityById: getOpportunityByIdMock,
  saveGeneratedContent: saveGeneratedContentMock,
}));
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

import { POST } from './route';

function makeRequest(body: unknown): Request {
  return new Request('https://www.vexaai.se/api/content-intelligence/generate', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const OPPORTUNITY = { id: 'op-1', pageId: '106658601471856', title: 't', recommendation: 'r', topic: 'smashburgers', format: 'reel', reason: 'reason', trendSignalId: null, trendScore: 50, audienceFitScore: 50, historicalFitScore: 50, freshnessScore: 50, opportunityScore: 50, confidence: 'medium', recommendedDay: null, recommendedTime: null, supportingEvidence: [], computedAt: '2026-09-09T00:00:00Z' };
const CONTEXT = { pageId: '106658601471856', pageName: 'Test Café', instagramUsername: null, instagramFollowers: null, facebookFollowers: null };
const DRAFT = { concept: 'c', hook: 'h', caption: 'cap', cta: 'cta', hashtags: ['#food'], creativeBrief: 'brief', videoScript: null, visualDirection: 'vd' };
const SAVED = { id: 'gen-1', opportunityId: 'op-1', platform: 'instagram', format: 'reel', concept: 'c', hook: 'h', caption: 'cap', cta: 'cta', hashtags: ['#food'], creativeBrief: 'brief', videoScript: null, visualDirection: 'vd', status: 'draft', createdAt: '2026-09-09T00:00:00Z' };

beforeEach(() => {
  getOpportunityByIdMock.mockReset().mockResolvedValue(OPPORTUNITY);
  getRestaurantContextMock.mockReset().mockResolvedValue(CONTEXT);
  generateContentDraftMock.mockReset().mockResolvedValue(DRAFT);
  saveGeneratedContentMock.mockReset().mockResolvedValue(SAVED);
});

describe('POST /api/content-intelligence/generate — request validation', () => {
  it('rejects a missing opportunityId', async () => {
    const response = await POST(makeRequest({ platform: 'instagram', format: 'reel' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('opportunityId');
  });

  it('rejects an invalid platform', async () => {
    const response = await POST(makeRequest({ opportunityId: 'op-1', platform: 'tiktok', format: 'reel' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('platform');
  });

  it('accepts both valid platforms (facebook, instagram)', async () => {
    for (const platform of ['facebook', 'instagram']) {
      const response = await POST(makeRequest({ opportunityId: 'op-1', platform, format: 'photo' }));
      expect(response.status).toBe(200);
    }
  });

  it('rejects an invalid format', async () => {
    const response = await POST(makeRequest({ opportunityId: 'op-1', platform: 'instagram', format: 'gif' }));
    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const req = new Request('https://www.vexaai.se/api/content-intelligence/generate', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: '{not json' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 404 when the opportunity does not exist, rather than generating from nothing', async () => {
    getOpportunityByIdMock.mockResolvedValue(null);
    const response = await POST(makeRequest({ opportunityId: 'does-not-exist', platform: 'instagram', format: 'reel' }));
    expect(response.status).toBe(404);
  });

  it('propagates the real restaurant context and opportunity into the generation call', async () => {
    await POST(makeRequest({ opportunityId: 'op-1', platform: 'instagram', format: 'reel', tone: 'playful' }));
    expect(generateContentDraftMock).toHaveBeenCalledWith(
      OPPORTUNITY,
      CONTEXT,
      expect.objectContaining({ opportunityId: 'op-1', platform: 'instagram', format: 'reel', tone: 'playful' })
    );
  });

  it('never auto-publishes — the saved draft always has status "draft"', async () => {
    const response = await POST(makeRequest({ opportunityId: 'op-1', platform: 'instagram', format: 'reel' }));
    const body = await response.json();
    expect(body.content.status).toBe('draft');
  });
});
