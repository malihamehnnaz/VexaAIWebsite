import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runTickMock } = vi.hoisted(() => ({ runTickMock: vi.fn() }));
vi.mock('@/lib/social-scheduling/worker', () => ({ runTick: runTickMock }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { POST, GET } from './route';

beforeEach(() => runTickMock.mockReset());

// The "tick throws -> returns 500" case is covered in its own file
// (route.throws.test.ts) — reproducibly, a test in THIS file that makes the
// mock reject gets misattributed as an unhandled rejection by this Vitest
// version whenever a second test exists in the same file (confirmed via
// isolated repro: identical code passes alone, fails the instant a sibling
// test is added, regardless of order/`.json()` use) — a test-runner
// attribution quirk, not a real bug (the route's own try/catch demonstrably
// runs correctly every time, per its logged error line).
describe('POST /api/social/scheduler/run', () => {
  it('rejects unauthenticated', async () => {
    const response = await POST(new Request('https://www.vexaai.se/x', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it('runs a tick and reports the outcome counts', async () => {
    runTickMock.mockResolvedValue({ claimed: 2, published: 1, failed: 1, retried: 0 });
    const response = await POST(new Request('https://www.vexaai.se/x', { method: 'POST', headers: { Authorization: 'Bearer test' } }));
    const body = await response.json();
    expect(body).toEqual({ success: true, claimed: 2, published: 1, failed: 1, retried: 0 });
  });

  it('also accepts GET (some free external cron services only send GET)', async () => {
    runTickMock.mockResolvedValue({ claimed: 0, published: 0, failed: 0, retried: 0 });
    const response = await GET(new Request('https://www.vexaai.se/x', { headers: { Authorization: 'Bearer test' } }));
    expect(response.status).toBe(200);
  });
});
