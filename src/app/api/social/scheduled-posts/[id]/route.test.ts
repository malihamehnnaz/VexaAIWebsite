import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getScheduledPostByIdMock, updateScheduledPostMock } = vi.hoisted(() => ({
  getScheduledPostByIdMock: vi.fn(),
  updateScheduledPostMock: vi.fn(),
}));
vi.mock('@/lib/social-scheduling/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/social-scheduling/store')>('@/lib/social-scheduling/store');
  return { ...actual, getScheduledPostById: getScheduledPostByIdMock, updateScheduledPost: updateScheduledPostMock };
});
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { GET, PATCH } from './route';
import { NotEditableError, ScheduledPostNotFoundError } from '@/lib/social-scheduling/store';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  getScheduledPostByIdMock.mockReset();
  updateScheduledPostMock.mockReset();
});

describe('GET /api/social/scheduled-posts/:id', () => {
  it('rejects unauthenticated', async () => {
    const response = await GET(new Request('https://www.vexaai.se/x'), ctx('post-1'));
    expect(response.status).toBe(401);
  });

  it('returns 404 for a nonexistent post', async () => {
    getScheduledPostByIdMock.mockResolvedValue(null);
    const response = await GET(new Request('https://www.vexaai.se/x', { headers: { Authorization: 'Bearer test' } }), ctx('nope'));
    expect(response.status).toBe(404);
  });

  it('returns the full status for a real post', async () => {
    getScheduledPostByIdMock.mockResolvedValue({ id: 'post-1', status: 'scheduled' });
    const response = await GET(new Request('https://www.vexaai.se/x', { headers: { Authorization: 'Bearer test' } }), ctx('post-1'));
    const body = await response.json();
    expect(body.post.id).toBe('post-1');
  });
});

describe('PATCH /api/social/scheduled-posts/:id', () => {
  function patchReq(body: unknown) {
    return new Request('https://www.vexaai.se/x', { method: 'PATCH', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) });
  }

  it('rejects a publishing/published post (not editable) with 409', async () => {
    updateScheduledPostMock.mockRejectedValue(new NotEditableError('publishing'));
    const response = await PATCH(patchReq({ caption: 'new' }), ctx('post-1'));
    expect(response.status).toBe(409);
  });

  it('returns 404 for a nonexistent post', async () => {
    updateScheduledPostMock.mockRejectedValue(new ScheduledPostNotFoundError('nope'));
    const response = await PATCH(patchReq({ caption: 'new' }), ctx('nope'));
    expect(response.status).toBe(404);
  });

  it('allows rescheduling a still-editable post', async () => {
    updateScheduledPostMock.mockResolvedValue({ id: 'post-1', status: 'scheduled', scheduledAt: '2026-09-21T08:30:00.000Z' });
    const response = await PATCH(patchReq({ scheduledAt: '2026-09-21T18:30:00', timezone: 'Australia/Sydney' }), ctx('post-1'));
    expect(response.status).toBe(200);
    expect(updateScheduledPostMock).toHaveBeenCalledWith('post-1', expect.objectContaining({ scheduledAtUtc: '2026-09-21T08:30:00.000Z' }));
  });

  it('rejects an invalid reschedule (invalid timezone)', async () => {
    const response = await PATCH(patchReq({ scheduledAt: '2026-09-21T18:30:00', timezone: 'Not/AZone' }), ctx('post-1'));
    expect(response.status).toBe(400);
  });
});
