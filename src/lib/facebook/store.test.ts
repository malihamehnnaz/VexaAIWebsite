import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ upsert: upsertMock }));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { recordPageInsight } from './store';

// Covers requirement 9's "duplicate sync" scenario: repeated syncs must be
// idempotent (upsert on a real unique constraint), never a blind insert
// that would create duplicate rows.

beforeEach(() => {
  upsertMock.mockClear();
  fromMock.mockClear();
});

describe('recordPageInsight', () => {
  it('upserts a page-level metric with post_id defaulted to the empty-string sentinel', async () => {
    await recordPageInsight({ pageId: '106658601471856', metric: 'page_follows', value: 9064, date: '2026-08-10' });

    expect(fromMock).toHaveBeenCalledWith('facebook_insights');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ page_id: '106658601471856', post_id: '', level: 'page', metric: 'page_follows', value: 9064, date: '2026-08-10' }),
      { onConflict: 'page_id,post_id,metric,date' }
    );
  });

  it('upserts a post-level metric with level set to "post" and a real post_id', async () => {
    await recordPageInsight({ pageId: '106658601471856', postId: '106658601471856_123', metric: 'post_impressions', value: 340, date: '2026-09-09' });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ post_id: '106658601471856_123', level: 'post' }),
      { onConflict: 'page_id,post_id,metric,date' }
    );
  });

  it('is idempotent on repeated identical syncs — same onConflict key each time, no duplicate-insert path', async () => {
    const input = { pageId: '106658601471856', metric: 'page_follows', value: 9064, date: '2026-08-10' };
    await recordPageInsight(input);
    await recordPageInsight(input);

    expect(upsertMock).toHaveBeenCalledTimes(2);
    // Both calls use the same conflict target, i.e. the same row identity —
    // a real Postgres UNIQUE constraint (not simulated here) is what
    // actually prevents the second call from creating a duplicate row.
    for (const call of upsertMock.mock.calls) {
      expect(call[1]).toEqual({ onConflict: 'page_id,post_id,metric,date' });
    }
  });

  it('throws with a clear message when Supabase reports an error', async () => {
    upsertMock.mockResolvedValueOnce({ error: { message: 'connection refused' } });
    await expect(recordPageInsight({ pageId: '106658601471856', metric: 'page_follows', value: 1, date: '2026-08-10' }))
      .rejects.toThrow(/facebook_insights upsert failed/);
  });

  it('never writes a fabricated value — a genuinely null metric is stored as null, not coerced to 0', async () => {
    await recordPageInsight({ pageId: '106658601471856', metric: 'page_follows', value: null, date: '2026-08-10' });
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ value: null }), expect.anything());
  });
});
