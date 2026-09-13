import { describe, it, expect, vi, beforeEach } from 'vitest';

const { retryFailedPostMock } = vi.hoisted(() => ({ retryFailedPostMock: vi.fn() }));
vi.mock('@/lib/social-scheduling/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/social-scheduling/store')>('@/lib/social-scheduling/store');
  return { ...actual, retryFailedPost: retryFailedPostMock };
});
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { POST } from './route';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const authedReq = () => new Request('https://www.vexaai.se/x', { method: 'POST', headers: { Authorization: 'Bearer test' } });

beforeEach(() => retryFailedPostMock.mockReset());

// The "retry a non-failed post -> 409" case is covered in its own file
// (route.rejects.test.ts) — see src/app/api/social/scheduler/run/
// route.test.ts's comment for why a rejecting-mock test is split out.
describe('POST /api/social/scheduled-posts/:id/retry', () => {
  it('rejects unauthenticated', async () => {
    const response = await POST(new Request('https://www.vexaai.se/x', { method: 'POST' }), ctx('post-1'));
    expect(response.status).toBe(401);
  });

  it('re-queues a failed post for the next worker tick', async () => {
    retryFailedPostMock.mockResolvedValue({ id: 'post-1', status: 'scheduled', attemptCount: 0 });
    const response = await POST(authedReq(), ctx('post-1'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.post.status).toBe('scheduled');
  });
});
