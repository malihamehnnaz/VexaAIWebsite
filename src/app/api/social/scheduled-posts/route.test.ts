import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createScheduledPostMock, listScheduledPostsMock } = vi.hoisted(() => ({
  createScheduledPostMock: vi.fn(),
  listScheduledPostsMock: vi.fn(),
}));
vi.mock('@/lib/social-scheduling/store', () => ({ createScheduledPost: createScheduledPostMock, listScheduledPosts: listScheduledPostsMock }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/messenger-api', () => ({
  isAuthorizedRequest: (request: Request) => request.headers.get('Authorization') === 'Bearer test',
  unauthorizedResponse: () => new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
  corsJson: (_req: Request, body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  corsPreflight: () => new Response(null, { status: 204 }),
}));

import { POST, GET } from './route';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

function req(body: unknown, headers: Record<string, string> = { Authorization: 'Bearer wrong' }): Request {
  return new Request('https://www.vexaai.se/api/social/scheduled-posts', { method: 'POST', headers, body: JSON.stringify(body) });
}

beforeEach(() => {
  createScheduledPostMock.mockReset();
  listScheduledPostsMock.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-13T00:00:00Z'));
});

describe('POST /api/social/scheduled-posts', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await POST(new Request('https://www.vexaai.se/api/social/scheduled-posts', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
  });

  it('rejects an unsupported/invalid Page', async () => {
    const response = await POST(req({ platform: 'facebook', pageId: '000000000000000', caption: 'hi', scheduledAt: '2026-09-20T18:30:00', timezone: 'UTC' }, { Authorization: 'Bearer test' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Page');
  });

  it('rejects a past scheduled time', async () => {
    const response = await POST(req({ platform: 'facebook', pageId: GP_CAFE_PAGE_ID, caption: 'hi', scheduledAt: '2026-01-01T00:00:00', timezone: 'UTC' }, { Authorization: 'Bearer test' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('future');
  });

  it('rejects an empty caption with no media', async () => {
    const response = await POST(req({ platform: 'facebook', pageId: GP_CAFE_PAGE_ID, caption: '', scheduledAt: '2026-09-20T18:30:00', timezone: 'UTC' }, { Authorization: 'Bearer test' }));
    expect(response.status).toBe(400);
  });

  it('accepts a valid future schedule and performs the correct timezone conversion', async () => {
    createScheduledPostMock.mockResolvedValue({ id: 'post-1', status: 'scheduled', scheduledAt: '2026-09-20T08:30:00.000Z' });

    const response = await POST(req({ platform: 'facebook', pageId: GP_CAFE_PAGE_ID, caption: 'Come visit!', scheduledAt: '2026-09-20T18:30:00', timezone: 'Australia/Sydney' }, { Authorization: 'Bearer test' }));

    expect(response.status).toBe(201);
    expect(createScheduledPostMock).toHaveBeenCalledWith(expect.objectContaining({ scheduledAtUtc: '2026-09-20T08:30:00.000Z' }));
  });
});

describe('GET /api/social/scheduled-posts', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await GET(new Request('https://www.vexaai.se/api/social/scheduled-posts'));
    expect(response.status).toBe(401);
  });

  it('lists posts with filters applied', async () => {
    listScheduledPostsMock.mockResolvedValue({ posts: [], nextCursor: null });
    const response = await GET(new Request('https://www.vexaai.se/api/social/scheduled-posts?platform=facebook&status=scheduled', { headers: { Authorization: 'Bearer test' } }));
    expect(response.status).toBe(200);
    expect(listScheduledPostsMock).toHaveBeenCalledWith(expect.objectContaining({ platform: 'facebook', status: 'scheduled' }));
  });

  it('rejects an invalid status filter', async () => {
    const response = await GET(new Request('https://www.vexaai.se/api/social/scheduled-posts?status=bogus', { headers: { Authorization: 'Bearer test' } }));
    expect(response.status).toBe(400);
  });
});
