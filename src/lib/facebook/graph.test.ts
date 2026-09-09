import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/meta/config', () => ({
  getGraphApiVersion: () => 'v26.0',
  resolvePageAccessToken: (pageId: string) => (pageId === 'no-token-page' ? null : 'fake-page-token'),
}));

import { getPageInsight, getPostInsight } from './graph';

// Covers requirement 9's Meta API scenarios: successful response, missing
// metric, permission error, expired/invalid token, empty history,
// rate-limit/transient error. Every scenario is a real, distinctly-shaped
// Graph API response — the same shapes actually observed in production
// (see graph.ts's header comment) — not invented approximations.

const PAGE_ID = '106658601471856';

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPageInsight', () => {
  it('parses a successful daily series response', async () => {
    mockFetchOnce(200, {
      data: [{
        name: 'page_total_media_view_unique',
        period: 'day',
        values: [
          { value: 120, end_time: '2026-08-10T07:00:00+0000' },
          { value: 95, end_time: '2026-08-11T07:00:00+0000' },
        ],
      }],
    });

    const result = await getPageInsight(PAGE_ID, 'page_total_media_view_unique', '2026-08-10', '2026-08-11');

    expect(result.unavailableReason).toBeUndefined();
    expect(result.daily).toEqual([
      { date: '2026-08-10', value: 120 },
      { date: '2026-08-11', value: 95 },
    ]);
  });

  it('sums an object-shaped value (e.g. reactions-by-type) into a single real number', async () => {
    mockFetchOnce(200, {
      data: [{
        name: 'page_actions_post_reactions_total',
        period: 'day',
        values: [{ value: { like: 10, love: 3, wow: 2 }, end_time: '2026-08-10T07:00:00+0000' }],
      }],
    });

    const result = await getPageInsight(PAGE_ID, 'page_actions_post_reactions_total', '2026-08-10', '2026-08-10');
    expect(result.daily).toEqual([{ date: '2026-08-10', value: 15 }]);
  });

  it('treats an empty Page history as an empty series, not an error', async () => {
    mockFetchOnce(200, { data: [] });
    const result = await getPageInsight(PAGE_ID, 'page_follows', '2026-08-10', '2026-08-10');
    expect(result.daily).toEqual([]);
    expect(result.unavailableReason).toBeUndefined();
  });

  it('reports a genuinely deprecated metric name with Meta\'s real error, never fabricated data', async () => {
    mockFetchOnce(400, { error: { message: '(#100) The value must be a valid insights metric', type: 'OAuthException', code: 100 } });
    const result = await getPageInsight(PAGE_ID, 'page_fans', '2026-08-10', '2026-08-10');
    expect(result.daily).toEqual([]);
    expect(result.unavailableReason).toContain('valid insights metric');
  });

  it('reports a wrong-token-type rejection with Meta\'s real error', async () => {
    mockFetchOnce(400, { error: { message: '(#190) This method must be called with a Page Access Token', type: 'OAuthException', code: 190 } });
    const result = await getPageInsight(PAGE_ID, 'page_post_engagements', '2026-08-10', '2026-08-10');
    expect(result.unavailableReason).toContain('Page Access Token');
  });

  it('reports an expired/invalid token error', async () => {
    mockFetchOnce(401, { error: { message: 'Error validating access token: Session has expired.', type: 'OAuthException', code: 190 } });
    const result = await getPageInsight(PAGE_ID, 'page_follows', '2026-08-10', '2026-08-10');
    expect(result.unavailableReason).toContain('expired');
  });

  it('reports a permission error distinctly, without fabricating a value', async () => {
    mockFetchOnce(403, { error: { message: '(#10) This endpoint requires the read_insights permission', type: 'OAuthException', code: 10 } });
    const result = await getPageInsight(PAGE_ID, 'page_post_engagements', '2026-08-10', '2026-08-10');
    expect(result.unavailableReason).toContain('permission');
  });

  it('handles a rate-limit/transient error without throwing out of the caller', async () => {
    mockFetchOnce(429, { error: { message: '(#4) Application request limit reached', type: 'OAuthException', code: 4 } });
    const result = await getPageInsight(PAGE_ID, 'page_follows', '2026-08-10', '2026-08-10');
    expect(result.daily).toEqual([]);
    expect(result.unavailableReason).toContain('request limit');
  });

  it('never calls Meta and returns an empty result when no Page token is configured', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;
    const result = await getPageInsight('no-token-page', 'page_follows', '2026-08-10', '2026-08-10');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.daily).toEqual([]);
  });
});

describe('getPostInsight', () => {
  it('parses a successful lifetime-total post metric', async () => {
    mockFetchOnce(200, { data: [{ name: 'post_impressions', values: [{ value: 340 }] }] });
    const result = await getPostInsight(PAGE_ID, '106658601471856_123', 'post_impressions');
    expect(result.value).toBe(340);
    expect(result.unavailableReason).toBeUndefined();
  });

  it('reports an invalid-token rejection at post level distinctly from page level', async () => {
    mockFetchOnce(400, { error: { message: 'Invalid OAuth 2.0 Access Token', type: 'OAuthException', code: 190 } });
    const result = await getPostInsight(PAGE_ID, '106658601471856_123', 'post_impressions');
    expect(result.value).toBeNull();
    expect(result.unavailableReason).toBe('Invalid OAuth 2.0 Access Token');
  });
});
