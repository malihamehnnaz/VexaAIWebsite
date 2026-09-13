import { describe, it, expect, vi, beforeEach } from 'vitest';

const { claimForImmediatePublishMock, markPublishedMock, markFailedMock, getScheduledPostByIdMock, publishFacebookPagePostMock } = vi.hoisted(() => ({
  claimForImmediatePublishMock: vi.fn(),
  markPublishedMock: vi.fn(),
  markFailedMock: vi.fn(),
  getScheduledPostByIdMock: vi.fn(),
  publishFacebookPagePostMock: vi.fn(),
}));
vi.mock('@/lib/social-scheduling/store', () => ({
  claimForImmediatePublish: claimForImmediatePublishMock,
  markPublished: markPublishedMock,
  markFailed: markFailedMock,
  getScheduledPostById: getScheduledPostByIdMock,
}));
vi.mock('@/lib/social-scheduling/publish', () => ({ publishFacebookPagePost: publishFacebookPagePostMock }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { POST } from './route';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { FacebookGraphError } from '@/lib/facebook/graph';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const authedReq = () => new Request('https://www.vexaai.se/x', { method: 'POST', headers: { Authorization: 'Bearer test' } });
const CLAIMED = { id: 'post-1', pageId: GP_CAFE_PAGE_ID, platform: 'facebook', caption: 'hello', mediaUrls: [], attemptCount: 0 };

beforeEach(() => {
  claimForImmediatePublishMock.mockReset();
  markPublishedMock.mockReset().mockResolvedValue(undefined);
  markFailedMock.mockReset().mockResolvedValue(undefined);
  getScheduledPostByIdMock.mockReset();
  publishFacebookPagePostMock.mockReset();
});

describe('POST /api/social/scheduled-posts/:id/publish-now', () => {
  it('rejects unauthenticated', async () => {
    const response = await POST(new Request('https://www.vexaai.se/x', { method: 'POST' }), ctx('post-1'));
    expect(response.status).toBe(401);
  });

  it('rejects a post that cannot be claimed (already publishing/published) with 409', async () => {
    claimForImmediatePublishMock.mockResolvedValue(null);
    getScheduledPostByIdMock.mockResolvedValue({ id: 'post-1', status: 'published' });
    const response = await POST(authedReq(), ctx('post-1'));
    expect(response.status).toBe(409);
  });

  it('returns 404 when the post does not exist at all', async () => {
    claimForImmediatePublishMock.mockResolvedValue(null);
    getScheduledPostByIdMock.mockResolvedValue(null);
    const response = await POST(authedReq(), ctx('nope'));
    expect(response.status).toBe(404);
  });

  it('publishes using the shared publishing service and records the real external post id', async () => {
    claimForImmediatePublishMock.mockResolvedValue(CLAIMED);
    publishFacebookPagePostMock.mockResolvedValue({ externalPostId: 'ext-1', externalPermalink: 'https://www.facebook.com/ext-1' });
    getScheduledPostByIdMock.mockResolvedValue({ id: 'post-1', status: 'published', externalPostId: 'ext-1' });

    const response = await POST(authedReq(), ctx('post-1'));

    expect(publishFacebookPagePostMock).toHaveBeenCalledWith({ id: 'post-1', pageId: GP_CAFE_PAGE_ID, caption: 'hello', mediaUrls: [] });
    expect(markPublishedMock).toHaveBeenCalledWith('post-1', 'ext-1', 'https://www.facebook.com/ext-1');
    expect(response.status).toBe(200);
  });

  it('records a real Meta failure as terminal (forceTerminal) rather than fabricating success', async () => {
    claimForImmediatePublishMock.mockResolvedValue(CLAIMED);
    publishFacebookPagePostMock.mockRejectedValue(new FacebookGraphError('Invalid token', 401, undefined, 190));
    getScheduledPostByIdMock.mockResolvedValue({ id: 'post-1', status: 'failed' });

    const response = await POST(authedReq(), ctx('post-1'));

    expect(markFailedMock).toHaveBeenCalledWith('post-1', 0, expect.objectContaining({ class: 'permanent' }), true);
    expect(response.status).toBe(502);
  });
});
