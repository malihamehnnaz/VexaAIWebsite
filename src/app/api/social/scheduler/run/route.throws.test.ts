import { describe, it, expect, vi } from 'vitest';

// Split into its own file — see route.test.ts's comment for why.
const { runTickMock } = vi.hoisted(() => ({ runTickMock: vi.fn() }));
vi.mock('@/lib/social-scheduling/worker', () => ({ runTick: runTickMock }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { POST } from './route';

describe('POST /api/social/scheduler/run — tick throws', () => {
  it('returns 500 without crashing if the tick itself throws', async () => {
    runTickMock.mockImplementation(async () => { throw new Error('db unreachable'); });
    const response = await POST(new Request('https://www.vexaai.se/x', { method: 'POST', headers: { Authorization: 'Bearer test' } }));
    expect(response.status).toBe(500);
  });
});
