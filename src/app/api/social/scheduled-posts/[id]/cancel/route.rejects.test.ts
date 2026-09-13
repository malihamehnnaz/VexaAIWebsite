import { describe, it, expect, vi } from 'vitest';

// Split into its own file — see route.test.ts's comment for why.
const { cancelScheduledPostMock } = vi.hoisted(() => ({ cancelScheduledPostMock: vi.fn() }));
vi.mock('@/lib/social-scheduling/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/social-scheduling/store')>('@/lib/social-scheduling/store');
  return { ...actual, cancelScheduledPost: cancelScheduledPostMock };
});
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { POST } from './route';
import { NotEditableError } from '@/lib/social-scheduling/store';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const authedReq = () => new Request('https://www.vexaai.se/x', { method: 'POST', headers: { Authorization: 'Bearer test' } });

describe('POST /api/social/scheduled-posts/:id/cancel — rejects', () => {
  it('rejects cancelling an already-published post', async () => {
    cancelScheduledPostMock.mockImplementation(async () => { throw new NotEditableError('published'); });
    const response = await POST(authedReq(), ctx('post-1'));
    expect(response.status).toBe(409);
  });
});
