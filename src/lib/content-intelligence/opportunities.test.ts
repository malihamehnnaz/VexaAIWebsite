import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getTrendSignalsMock, getPerformanceSummaryMock, getRestaurantContextMock, saveOpportunitiesMock } = vi.hoisted(() => ({
  getTrendSignalsMock: vi.fn(),
  getPerformanceSummaryMock: vi.fn(),
  getRestaurantContextMock: vi.fn(),
  saveOpportunitiesMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/content-intelligence/trends', () => ({ getTrendSignals: getTrendSignalsMock }));
vi.mock('@/lib/content-intelligence/performance', () => ({ getPerformanceSummary: getPerformanceSummaryMock }));
vi.mock('@/lib/content-intelligence/restaurant-context', () => ({ getRestaurantContext: getRestaurantContextMock }));
vi.mock('@/lib/content-intelligence/store', () => ({ saveOpportunities: saveOpportunitiesMock }));

import { generateOpportunities } from './opportunities';
import type { TrendSignal } from './types';
import type { PerformanceSummary } from './performance';

const PAGE_ID = '106658601471856';

const EMPTY_PERFORMANCE: PerformanceSummary = {
  topPosts: [],
  formatPerformance: [],
  dayPerformance: [],
  hourPerformance: [],
  formatPerformanceAvailable: false,
  formatUnavailableReason: 'no data',
  recentPageReach: null,
  recentPageEngagement: null,
  totalHistoricalPosts: 0,
};

const REAL_PERFORMANCE: PerformanceSummary = {
  topPosts: [
    { platform: 'instagram', id: 'm1', caption: 'Our new brunch menu is here', permalink: 'https://ig.com/m1', postedAt: '2026-08-01T12:00:00Z', engagementProxy: 20, format: 'REELS' },
    { platform: 'instagram', id: 'm2', caption: 'Coffee tasting event', permalink: 'https://ig.com/m2', postedAt: '2026-08-02T18:00:00Z', engagementProxy: 5, format: 'IMAGE' },
  ],
  formatPerformance: [
    { format: 'REELS', postCount: 5, avgEngagementProxy: 18 },
    { format: 'IMAGE', postCount: 10, avgEngagementProxy: 4 },
  ],
  dayPerformance: [{ day: 'Saturday', postCount: 6, avgEngagementProxy: 15 }],
  hourPerformance: [{ hour: 12, postCount: 4, avgEngagementProxy: 17 }],
  formatPerformanceAvailable: true,
  formatUnavailableReason: null,
  recentPageReach: 5000,
  recentPageEngagement: 200,
  totalHistoricalPosts: 15,
};

const CONTEXT = { pageId: PAGE_ID, pageName: "GP's - Guilty Pleasure Café", instagramUsername: 'guiltypleasure.se', instagramFollowers: 9064, facebookFollowers: 2411 };

function trendSignal(overrides: Partial<TrendSignal> = {}): TrendSignal {
  return {
    id: 'real-uuid-1',
    topic: 'Smashburgers trending',
    category: 'restaurant trends',
    description: null,
    source: 'google_news',
    sourceUrl: 'https://example.com/a',
    detectedAt: '2026-09-09T06:00:00Z',
    freshness: 'new',
    momentumScore: 80,
    relevanceScore: 90,
    confidence: 'high',
    evidence: [{ title: 'Smashburgers trending', url: 'https://example.com/a', publishedAt: '2026-09-09T06:00:00Z', sourceName: 'Food News' }],
    ...overrides,
  };
}

beforeEach(() => {
  getRestaurantContextMock.mockResolvedValue(CONTEXT);
  saveOpportunitiesMock.mockClear();
});

describe('generateOpportunities — insufficient data', () => {
  it('reports insufficient data when there are no trends and no historical performance', async () => {
    getTrendSignalsMock.mockResolvedValue({ signals: [], sourceStatuses: [], dataFreshness: 'unavailable', fetchedAt: null });
    getPerformanceSummaryMock.mockResolvedValue(EMPTY_PERFORMANCE);

    const result = await generateOpportunities(PAGE_ID);
    expect(result.insufficientData).toBe(true);
    expect(result.opportunities).toHaveLength(0);
    expect(result.insufficientDataReason).toBeTruthy();
  });

  it('does NOT report insufficient data when real historical performance exists, even with zero trends', async () => {
    getTrendSignalsMock.mockResolvedValue({ signals: [], sourceStatuses: [{ source: 'google_news', available: false, signalCount: 0, reason: 'timeout' }], dataFreshness: 'unavailable', fetchedAt: null });
    getPerformanceSummaryMock.mockResolvedValue(REAL_PERFORMANCE);

    const result = await generateOpportunities(PAGE_ID);
    expect(result.insufficientData).toBe(false);
    expect(result.opportunities.length).toBeGreaterThan(0);
  });
});

describe('generateOpportunities — scoring and ranking', () => {
  it('computes opportunityScore as a real weighted combination, never a random/fabricated number', async () => {
    getTrendSignalsMock.mockResolvedValue({ signals: [trendSignal()], sourceStatuses: [{ source: 'google_news', available: true, signalCount: 1 }], dataFreshness: 'fresh', fetchedAt: '2026-09-09T06:00:00Z' });
    getPerformanceSummaryMock.mockResolvedValue(REAL_PERFORMANCE);

    const result = await generateOpportunities(PAGE_ID);
    const trendLinked = result.opportunities.find(o => o.trendSignalId === 'real-uuid-1');
    expect(trendLinked).toBeDefined();
    // trendScore = avg(momentum 80, relevance 90) = 85
    expect(trendLinked!.trendScore).toBe(85);
    // opportunityScore must be a finite number in [0,100], not NaN/undefined
    expect(trendLinked!.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(trendLinked!.opportunityScore).toBeLessThanOrEqual(100);
  });

  it('ranks opportunities by opportunityScore descending', async () => {
    getTrendSignalsMock.mockResolvedValue({
      signals: [trendSignal({ id: 'low', momentumScore: 10, relevanceScore: 10 }), trendSignal({ id: 'high', momentumScore: 95, relevanceScore: 95 })],
      sourceStatuses: [], dataFreshness: 'fresh', fetchedAt: '2026-09-09T06:00:00Z',
    });
    getPerformanceSummaryMock.mockResolvedValue(REAL_PERFORMANCE);

    const result = await generateOpportunities(PAGE_ID);
    for (let i = 1; i < result.opportunities.length; i++) {
      expect(result.opportunities[i - 1].opportunityScore).toBeGreaterThanOrEqual(result.opportunities[i].opportunityScore);
    }
  });

  it('never claims content will "go viral" in any generated text', async () => {
    getTrendSignalsMock.mockResolvedValue({ signals: [trendSignal()], sourceStatuses: [], dataFreshness: 'fresh', fetchedAt: '2026-09-09T06:00:00Z' });
    getPerformanceSummaryMock.mockResolvedValue(REAL_PERFORMANCE);

    const result = await generateOpportunities(PAGE_ID);
    for (const o of result.opportunities) {
      const text = `${o.title} ${o.recommendation} ${o.reason} ${o.supportingEvidence.join(' ')}`.toLowerCase();
      expect(text).not.toContain('viral');
      expect(text).not.toContain('guarantee');
    }
  });

  it('always produces at least one performance-only opportunity (trendSignalId null) when real format performance exists', async () => {
    getTrendSignalsMock.mockResolvedValue({ signals: [], sourceStatuses: [], dataFreshness: 'unavailable', fetchedAt: null });
    getPerformanceSummaryMock.mockResolvedValue(REAL_PERFORMANCE);

    const result = await generateOpportunities(PAGE_ID);
    expect(result.opportunities.some(o => o.trendSignalId === null)).toBe(true);
  });

  it('persists computed opportunities (best-effort)', async () => {
    getTrendSignalsMock.mockResolvedValue({ signals: [trendSignal()], sourceStatuses: [], dataFreshness: 'fresh', fetchedAt: '2026-09-09T06:00:00Z' });
    getPerformanceSummaryMock.mockResolvedValue(REAL_PERFORMANCE);

    await generateOpportunities(PAGE_ID);
    expect(saveOpportunitiesMock).toHaveBeenCalled();
  });
});
