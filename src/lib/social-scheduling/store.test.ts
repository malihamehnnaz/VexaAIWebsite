import { describe, it, expect, vi, beforeEach } from 'vitest';

// A minimal, generic chainable fake for the Supabase query builder — every
// method returns the same chain object (so any call sequence works), and
// the chain itself is awaitable (resolves to whatever `result` this test
// configured). This lets each test configure exactly the {data, error} a
// particular call site needs without hand-writing a bespoke mock per method
// chain.
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'eq', 'in', 'not', 'or', 'lte', 'lt', 'gte', 'order', 'range', 'limit'];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.single = vi.fn(() => Promise.resolve(result));
  // Awaiting the chain directly (no terminal method called) — used by
  // listScheduledPosts and the candidate-select in claimDuePosts.
  chain.then = (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: fromMock }) }));

import {
  createScheduledPost, listScheduledPosts, updateScheduledPost, cancelScheduledPost,
  claimDuePosts, markPublished, markFailed, retryFailedPost, claimForImmediatePublish,
  ScheduledPostNotFoundError, NotEditableError,
} from './store';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

const BASE_ROW = {
  id: 'post-1', opportunity_id: null, page_id: GP_CAFE_PAGE_ID, platform: 'facebook' as const,
  caption: 'Hello world', media_urls: null, status: 'scheduled' as const,
  scheduled_at: '2026-09-20T08:30:00.000Z', timezone: 'Australia/Sydney',
  published_at: null, external_post_id: null, external_permalink: null,
  attempt_count: 0, last_attempt_at: null, next_retry_at: null, error_code: null, error_message: null,
  created_at: '2026-09-13T00:00:00Z', updated_at: '2026-09-13T00:00:00Z',
};

beforeEach(() => {
  fromMock.mockReset();
});

describe('createScheduledPost', () => {
  it('inserts with status scheduled and returns the DTO', async () => {
    const chain = makeChain({ data: BASE_ROW, error: null });
    fromMock.mockReturnValue(chain);

    const result = await createScheduledPost({
      platform: 'facebook', pageId: GP_CAFE_PAGE_ID, caption: 'Hello world', mediaUrls: undefined,
      scheduledAt: '2026-09-20T18:30:00', timezone: 'Australia/Sydney', opportunityId: null,
      scheduledAtUtc: '2026-09-20T08:30:00.000Z',
    });

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled', page_id: GP_CAFE_PAGE_ID, scheduled_at: '2026-09-20T08:30:00.000Z' }));
    expect(result.id).toBe('post-1');
    expect(result.scheduledAtDisplay).toBe('20 Sep 2026, 18:30');
  });
});

describe('listScheduledPosts', () => {
  it('applies platform/status filters', async () => {
    const chain = makeChain({ data: [BASE_ROW], error: null });
    fromMock.mockReturnValue(chain);

    const { posts } = await listScheduledPosts({ platform: 'facebook', status: 'scheduled' });
    expect(chain.eq).toHaveBeenCalledWith('platform', 'facebook');
    expect(chain.eq).toHaveBeenCalledWith('status', 'scheduled');
    expect(posts).toHaveLength(1);
  });
});

describe('updateScheduledPost', () => {
  it('rejects updating a post that is already publishing', async () => {
    fromMock.mockReturnValue(makeChain({ data: { ...BASE_ROW, status: 'publishing' }, error: null }));
    await expect(updateScheduledPost('post-1', { caption: 'new text' })).rejects.toThrow(NotEditableError);
  });

  it('rejects updating a post that is already published', async () => {
    fromMock.mockReturnValue(makeChain({ data: { ...BASE_ROW, status: 'published' }, error: null }));
    await expect(updateScheduledPost('post-1', { caption: 'new text' })).rejects.toThrow(NotEditableError);
  });

  it('allows updating a scheduled post', async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      // 1st from(): the read in getScheduledPostById; 2nd: the update.
      return call === 1
        ? makeChain({ data: BASE_ROW, error: null })
        : makeChain({ data: { ...BASE_ROW, caption: 'updated' }, error: null });
    });
    const result = await updateScheduledPost('post-1', { caption: 'updated' });
    expect(result.caption).toBe('updated');
  });

  it('throws NotFound for a nonexistent post', async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    await expect(updateScheduledPost('nope', { caption: 'x' })).rejects.toThrow(ScheduledPostNotFoundError);
  });
});

describe('cancelScheduledPost — idempotency', () => {
  it('is a successful no-op when the post is already cancelled', async () => {
    fromMock.mockReturnValue(makeChain({ data: { ...BASE_ROW, status: 'cancelled' }, error: null }));
    const result = await cancelScheduledPost('post-1');
    expect(result.status).toBe('cancelled');
  });

  it('rejects cancelling an already-published post', async () => {
    fromMock.mockReturnValue(makeChain({ data: { ...BASE_ROW, status: 'published' }, error: null }));
    await expect(cancelScheduledPost('post-1')).rejects.toThrow(NotEditableError);
  });

  it('cancels a scheduled post', async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      return call === 1
        ? makeChain({ data: BASE_ROW, error: null }) // the read
        : makeChain({ data: { ...BASE_ROW, status: 'cancelled' }, error: null }); // the update
    });
    const result = await cancelScheduledPost('post-1');
    expect(result.status).toBe('cancelled');
  });
});

describe('claimDuePosts — atomic claim safety', () => {
  it('claims a candidate via a conditional UPDATE guarded on status=scheduled (the property that makes concurrent claiming safe)', async () => {
    let call = 0;
    const updateChain = makeChain({ data: { ...BASE_ROW, status: 'publishing' }, error: null });
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: [], error: null }); // reclaimStuckPublishingPosts' update
      if (call === 2) return makeChain({ data: [{ id: 'post-1' }], error: null }); // candidate select
      return updateChain; // the claim update
    });

    const claimed = await claimDuePosts(5);

    expect(updateChain.eq).toHaveBeenCalledWith('status', 'scheduled');
    expect(claimed).toHaveLength(1);
    expect(claimed[0].status).toBe('publishing');
  });

  it('does not claim a candidate that another worker already claimed (0 rows returned from the conditional update)', async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: [], error: null }); // reclaim
      if (call === 2) return makeChain({ data: [{ id: 'post-1' }], error: null }); // candidate select
      return makeChain({ data: null, error: null }); // lost the race — 0 rows
    });

    const claimed = await claimDuePosts(5);
    expect(claimed).toHaveLength(0);
  });

  it('reclaims a post stuck in publishing past the timeout as a failed "unknown outcome", never as a fresh retry', async () => {
    let call = 0;
    const reclaimChain = makeChain({ data: [{ id: 'stuck-post' }], error: null });
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return reclaimChain;
      return makeChain({ data: [], error: null }); // no due candidates after that
    });

    await claimDuePosts(5);
    expect(reclaimChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error_code: 'stuck_unknown_outcome' }));
  });
});

describe('markPublished / markFailed', () => {
  it('markPublished sets status=published with the external id/permalink, guarded on status=publishing', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await markPublished('post-1', 'ext-123', 'https://www.facebook.com/ext-123');
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', external_post_id: 'ext-123' }));
    expect(chain.eq).toHaveBeenCalledWith('status', 'publishing');
  });

  it('markFailed re-queues (status=scheduled) with backoff for a transient failure under the attempt limit', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await markFailed('post-1', 0, { class: 'transient', code: 'meta_4', message: 'Rate limited' });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled', attempt_count: 1, next_retry_at: expect.any(String) }));
  });

  it('markFailed sets terminal status=failed once attempts are exhausted, even for a transient error class', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await markFailed('post-1', 2, { class: 'transient', code: 'meta_4', message: 'Rate limited' }); // 3rd attempt = exhausted (MAX_PUBLISH_ATTEMPTS=3)
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('markFailed sets terminal status=failed immediately for a permanent error, regardless of attempt count', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await markFailed('post-1', 0, { class: 'permanent', code: 'meta_190', message: 'Invalid token' });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', attempt_count: 1 }));
  });

  it('markFailed with forceTerminal=true never re-queues, even for a transient failure under the limit', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await markFailed('post-1', 0, { class: 'transient', code: 'meta_4', message: 'Rate limited' }, true);
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});

describe('retryFailedPost', () => {
  it('rejects retrying a post that is not failed', async () => {
    fromMock.mockReturnValue(makeChain({ data: { ...BASE_ROW, status: 'scheduled' }, error: null }));
    await expect(retryFailedPost('post-1')).rejects.toThrow(NotEditableError);
  });

  it('resets attempt_count and re-queues a failed post', async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      return call === 1
        ? makeChain({ data: { ...BASE_ROW, status: 'failed', attempt_count: 3 }, error: null })
        : makeChain({ data: { ...BASE_ROW, status: 'scheduled', attempt_count: 0 }, error: null });
    });
    const result = await retryFailedPost('post-1');
    expect(result.status).toBe('scheduled');
    expect(result.attemptCount).toBe(0);
  });
});

describe('claimForImmediatePublish', () => {
  it('claims from scheduled or failed only', async () => {
    const chain = makeChain({ data: { ...BASE_ROW, status: 'publishing' }, error: null });
    fromMock.mockReturnValue(chain);
    const result = await claimForImmediatePublish('post-1');
    expect(chain.in).toHaveBeenCalledWith('status', ['scheduled', 'failed']);
    expect(result?.status).toBe('publishing');
  });

  it('returns null when nothing was claimable (e.g. already publishing/published)', async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await claimForImmediatePublish('post-1');
    expect(result).toBeNull();
  });
});
