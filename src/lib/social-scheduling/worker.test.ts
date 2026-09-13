import { describe, it, expect, vi, beforeEach } from 'vitest';

const { claimDuePostsMock, markPublishedMock, markFailedMock, publishFacebookPagePostMock } = vi.hoisted(() => ({
  claimDuePostsMock: vi.fn(),
  markPublishedMock: vi.fn(),
  markFailedMock: vi.fn(),
  publishFacebookPagePostMock: vi.fn(),
}));

vi.mock('@/lib/social-scheduling/store', () => ({
  claimDuePosts: claimDuePostsMock,
  markPublished: markPublishedMock,
  markFailed: markFailedMock,
}));
vi.mock('@/lib/social-scheduling/publish', () => ({ publishFacebookPagePost: publishFacebookPagePostMock }));

import { runTick } from './worker';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { FacebookGraphError } from '@/lib/facebook/graph';

const POST = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'post-1', platform: 'facebook', pageId: GP_CAFE_PAGE_ID, caption: 'hello', mediaUrls: [],
  status: 'publishing', scheduledAt: null, timezone: null, scheduledAtDisplay: null,
  publishedAt: null, externalPostId: null, externalPermalink: null, attemptCount: 0,
  lastAttemptAt: null, nextRetryAt: null, errorCode: null, errorMessage: null,
  opportunityId: null, createdAt: '2026-09-13T00:00:00Z', updatedAt: '2026-09-13T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  claimDuePostsMock.mockReset();
  markPublishedMock.mockReset().mockResolvedValue(undefined);
  markFailedMock.mockReset().mockResolvedValue(undefined);
  publishFacebookPagePostMock.mockReset();
});

describe('runTick', () => {
  it('does nothing (0 claimed) when there is nothing due — future/cancelled posts are never claimed by claimDuePosts in the first place', async () => {
    claimDuePostsMock.mockResolvedValue([]);
    const result = await runTick();
    expect(result).toEqual({ claimed: 0, published: 0, failed: 0, retried: 0 });
    expect(publishFacebookPagePostMock).not.toHaveBeenCalled();
  });

  it('publishes a due post and marks it published on success', async () => {
    claimDuePostsMock.mockResolvedValue([POST()]);
    publishFacebookPagePostMock.mockResolvedValue({ externalPostId: 'ext-1', externalPermalink: 'https://www.facebook.com/ext-1' });

    const result = await runTick();

    expect(publishFacebookPagePostMock).toHaveBeenCalledWith({ id: 'post-1', pageId: GP_CAFE_PAGE_ID, caption: 'hello', mediaUrls: [] });
    expect(markPublishedMock).toHaveBeenCalledWith('post-1', 'ext-1', 'https://www.facebook.com/ext-1');
    expect(result).toEqual({ claimed: 1, published: 1, failed: 0, retried: 0 });
  });

  it('marks a permanently-failed post as failed, never published', async () => {
    claimDuePostsMock.mockResolvedValue([POST({ attemptCount: 0 })]);
    publishFacebookPagePostMock.mockRejectedValue(new FacebookGraphError('Invalid token', 401, undefined, 190));

    const result = await runTick();

    expect(markPublishedMock).not.toHaveBeenCalled();
    expect(markFailedMock).toHaveBeenCalledWith('post-1', 0, expect.objectContaining({ class: 'permanent' }));
    expect(result).toEqual({ claimed: 1, published: 0, failed: 1, retried: 0 });
  });

  it('reports a transient failure under the attempt limit as "retried", not "failed"', async () => {
    claimDuePostsMock.mockResolvedValue([POST({ attemptCount: 0 })]);
    publishFacebookPagePostMock.mockRejectedValue(new FacebookGraphError('Rate limited', 400, undefined, 4));

    const result = await runTick();

    expect(markFailedMock).toHaveBeenCalledWith('post-1', 0, expect.objectContaining({ class: 'transient' }));
    expect(result).toEqual({ claimed: 1, published: 0, failed: 0, retried: 1 });
  });

  it('reports a transient failure at the attempt limit as "failed", not "retried"', async () => {
    claimDuePostsMock.mockResolvedValue([POST({ attemptCount: 2 })]); // 3rd attempt = exhausted
    publishFacebookPagePostMock.mockRejectedValue(new FacebookGraphError('Rate limited', 400, undefined, 4));

    const result = await runTick();
    expect(result).toEqual({ claimed: 1, published: 0, failed: 1, retried: 0 });
  });

  it('processes multiple claimed posts independently — one failing does not stop the others from publishing', async () => {
    claimDuePostsMock.mockResolvedValue([POST({ id: 'post-1' }), POST({ id: 'post-2' })]);
    publishFacebookPagePostMock
      .mockRejectedValueOnce(new FacebookGraphError('Invalid token', 401, undefined, 190))
      .mockResolvedValueOnce({ externalPostId: 'ext-2', externalPermalink: 'https://www.facebook.com/ext-2' });

    const result = await runTick();
    expect(result).toEqual({ claimed: 2, published: 1, failed: 1, retried: 0 });
  });

  it('duplicate-worker protection: a post claimDuePosts does not return (because another worker already claimed it) is never touched by this tick at all', async () => {
    // Simulates two overlapping ticks: this tick's claimDuePosts only
    // returns what IT successfully claimed — the atomic guard is store.ts's
    // responsibility (see store.test.ts), and this test asserts the
    // worker layer correctly only ever acts on what it was actually handed.
    claimDuePostsMock.mockResolvedValue([]);
    const result = await runTick();
    expect(result.claimed).toBe(0);
    expect(publishFacebookPagePostMock).not.toHaveBeenCalled();
  });
});
