import { describe, it, expect, vi, beforeEach } from 'vitest';

const { recordPageInsightMock, getPageInsightMock } = vi.hoisted(() => ({
  recordPageInsightMock: vi.fn().mockResolvedValue(undefined),
  getPageInsightMock: vi.fn(),
}));

vi.mock('@/lib/meta/config', () => ({ getGraphApiVersion: () => 'v26.0' }));
vi.mock('@/lib/facebook/store', () => ({ recordPageInsight: recordPageInsightMock }));
vi.mock('@/lib/facebook/graph', () => ({ getPageInsight: getPageInsightMock }));

import { backfillPageInsights } from './backfill';

// Covers requirement 9's "pagination" and "date-range synchronization"
// scenarios for the historical backfill service specifically (distinct from
// the single-request date-range tests in date-range.test.ts).

beforeEach(() => {
  getPageInsightMock.mockReset();
  recordPageInsightMock.mockClear();
});

describe('backfillPageInsights', () => {
  it('chunks a period longer than 90 days into multiple <=90-day windows (pagination)', async () => {
    getPageInsightMock.mockResolvedValue({ metric: 'page_follows', daily: [] });

    await backfillPageInsights('106658601471856', ['page_follows'], 200);

    // 200 days needs 3 windows of <=90 days each (90 + 90 + 20).
    expect(getPageInsightMock).toHaveBeenCalledTimes(3);
    const windows = getPageInsightMock.mock.calls.map(c => ({ start: c[2], end: c[3] }));
    for (const w of windows) {
      const days = (new Date(w.end).getTime() - new Date(w.start).getTime()) / 86400000 + 1;
      expect(days).toBeLessThanOrEqual(90);
    }
  });

  it('runs every requested metric against every window', async () => {
    getPageInsightMock.mockResolvedValue({ metric: 'x', daily: [] });
    await backfillPageInsights('106658601471856', ['page_follows', 'page_post_engagements'], 30);
    // 30 days = 1 window × 2 metrics.
    expect(getPageInsightMock).toHaveBeenCalledTimes(2);
  });

  it('persists only days Meta actually returned a value for — never fabricates missing days', async () => {
    getPageInsightMock.mockResolvedValue({
      metric: 'page_follows',
      daily: [
        { date: '2026-08-01', value: 100 },
        { date: '2026-08-02', value: null }, // Meta returned the day but no value
      ],
    });

    const summary = await backfillPageInsights('106658601471856', ['page_follows'], 30);

    expect(recordPageInsightMock).toHaveBeenCalledTimes(1);
    expect(recordPageInsightMock).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-01', value: 100 }));
    expect(summary.totalDaysWritten).toBe(1);
  });

  it('is idempotent — re-running an overlapping backfill relies on recordPageInsight\'s upsert, never bypasses it', async () => {
    getPageInsightMock.mockResolvedValue({ metric: 'page_follows', daily: [{ date: '2026-08-01', value: 100 }] });
    await backfillPageInsights('106658601471856', ['page_follows'], 30);
    await backfillPageInsights('106658601471856', ['page_follows'], 30);
    // Every write for every run goes through the same upserting function —
    // recordPageInsight.test.ts (store.test.ts) proves that path is
    // dedup-safe at the database level.
    expect(recordPageInsightMock).toHaveBeenCalledTimes(2);
  });

  it('records a real error per chunk and continues rather than aborting the whole backfill', async () => {
    getPageInsightMock
      .mockResolvedValueOnce({ metric: 'page_follows', daily: [], unavailableReason: '(#190) This method must be called with a Page Access Token' })
      .mockResolvedValueOnce({ metric: 'page_post_engagements', daily: [{ date: '2026-08-01', value: 5 }] });

    const summary = await backfillPageInsights('106658601471856', ['page_follows', 'page_post_engagements'], 30);

    expect(summary.chunks).toHaveLength(2);
    expect(summary.chunks[0].error).toContain('Page Access Token');
    expect(summary.chunks[0].daysWritten).toBe(0);
    expect(summary.chunks[1].error).toBeNull();
    expect(summary.chunks[1].daysWritten).toBe(1);
  });

  it('does not abort the backfill when a chunk throws unexpectedly', async () => {
    getPageInsightMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ metric: 'page_post_engagements', daily: [{ date: '2026-08-01', value: 5 }] });

    const summary = await backfillPageInsights('106658601471856', ['page_follows', 'page_post_engagements'], 30);

    expect(summary.chunks[0].error).toBe('network error');
    expect(summary.chunks[1].daysWritten).toBe(1);
  });
});
