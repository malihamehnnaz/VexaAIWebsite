import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression test for a real leak found via live testing: syncIfStale's
// internal error message (raw Supabase/Google API detail — e.g. "Could not
// find the table 'public.google_business_locations' in the schema cache")
// was being returned verbatim in the HTTP response body. Non-negotiable:
// "they don't crash the request pipeline or leak upstream response bodies
// to the caller."

const { syncIfStaleMock } = vi.hoisted(() => ({ syncIfStaleMock: vi.fn() }));
vi.mock('@/lib/google-business/sync', () => ({ syncIfStale: syncIfStaleMock }));
vi.mock('@/lib/google/auth', () => ({ isAuthorizedForGa4: () => true }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));

import { POST } from './route';

const INTERNAL_ERROR_DETAIL = "google_business_locations list failed: Could not find the table 'public.google_business_locations' in the schema cache";

beforeEach(() => {
  syncIfStaleMock.mockReset();
});

describe('POST /api/google/business/sync', () => {
  it('never returns the raw internal error message in the response body on failure', async () => {
    syncIfStaleMock.mockResolvedValue({ ran: true, status: 'failed', error: INTERNAL_ERROR_DETAIL });

    const response = await POST(new Request('https://www.vexaai.se/api/google/business/sync', { method: 'POST', headers: { Authorization: 'Bearer test' } }));
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).not.toContain(INTERNAL_ERROR_DETAIL);
    expect(text).not.toContain('schema cache');
    expect(text).not.toContain('google_business_locations');
  });

  it('returns success:true with the real status on a successful sync', async () => {
    syncIfStaleMock.mockResolvedValue({ ran: true, status: 'success', error: null });
    const response = await POST(new Request('https://www.vexaai.se/api/google/business/sync', { method: 'POST', headers: { Authorization: 'Bearer test' } }));
    const body = await response.json();
    expect(body).toEqual({ success: true, status: 'success' });
  });
});
