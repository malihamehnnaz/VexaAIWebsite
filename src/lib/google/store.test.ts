import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fromMock, refreshMock, decryptMock, encryptMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  refreshMock: vi.fn(),
  decryptMock: vi.fn(),
  encryptMock: vi.fn((s: string) => `encrypted(${s})`),
}));

vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ from: fromMock }) }));
vi.mock('@/lib/google/crypto', () => ({ encryptSecret: encryptMock, decryptSecret: decryptMock }));
vi.mock('@/lib/google/oauth', async () => {
  const actual = await vi.importActual<typeof import('./oauth')>('./oauth');
  return { ...actual, refreshGoogleAccessToken: refreshMock, exchangeCodeForTokens: vi.fn() };
});

import { getValidAccessToken, disconnectGoogle, GoogleConnectionError } from './store';
import { GoogleOAuthError } from './oauth';

const BASE_ROW = {
  id: 'row-1',
  google_account_id: 'g-account',
  google_email: 'owner@example.com',
  refresh_token_encrypted: 'encrypted(refresh-token)',
  access_token_encrypted: null as string | null,
  access_token_expires_at: null as string | null,
  property_id: '542598893',
  scopes: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/business.manage',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_sync_at: null,
  status: 'connected' as 'connected' | 'disconnected' | 'needs_reconnect',
  metadata: null,
};

function mockConnectionRow(row: typeof BASE_ROW | null) {
  const select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
    }),
  });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  fromMock.mockReturnValue({ select, update });
  return { select, update };
}

beforeEach(() => {
  vi.clearAllMocks();
  encryptMock.mockImplementation((s: string) => `encrypted(${s})`);
});

describe('getValidAccessToken — refresh path', () => {
  it('returns the cached access token without refreshing when still valid', async () => {
    mockConnectionRow({ ...BASE_ROW, access_token_encrypted: 'encrypted(cached-token)', access_token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    decryptMock.mockReturnValue('cached-token');

    const result = await getValidAccessToken();
    expect(result.accessToken).toBe('cached-token');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('refreshes when the cached token is within the expiry buffer', async () => {
    const { update } = mockConnectionRow({ ...BASE_ROW, access_token_encrypted: 'encrypted(old-token)', access_token_expires_at: new Date(Date.now() + 30_000).toISOString() });
    decryptMock.mockReturnValue('refresh-token');
    refreshMock.mockResolvedValue({ accessToken: 'new-token', expiresAt: new Date(Date.now() + 3600_000).toISOString() });

    const result = await getValidAccessToken();
    expect(result.accessToken).toBe('new-token');
    expect(refreshMock).toHaveBeenCalledWith('refresh-token');
    expect(update).toHaveBeenCalled();
  });

  it('refreshes when there is no cached access token at all', async () => {
    mockConnectionRow({ ...BASE_ROW, access_token_encrypted: null, access_token_expires_at: null });
    decryptMock.mockReturnValue('refresh-token');
    refreshMock.mockResolvedValue({ accessToken: 'brand-new-token', expiresAt: new Date(Date.now() + 3600_000).toISOString() });

    const result = await getValidAccessToken();
    expect(result.accessToken).toBe('brand-new-token');
  });

  it('de-duplicates concurrent refreshes within the same process — only one refresh call for two simultaneous requests', async () => {
    mockConnectionRow({ ...BASE_ROW, access_token_encrypted: null, access_token_expires_at: null });
    decryptMock.mockReturnValue('refresh-token');
    let resolveRefresh: (v: { accessToken: string; expiresAt: string }) => void;
    refreshMock.mockReturnValue(new Promise(resolve => { resolveRefresh = resolve; }));

    const p1 = getValidAccessToken();
    const p2 = getValidAccessToken();
    resolveRefresh!({ accessToken: 'shared-token', expiresAt: new Date(Date.now() + 3600_000).toISOString() });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.accessToken).toBe('shared-token');
    expect(r2.accessToken).toBe('shared-token');
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('throws not_connected when there is no stored connection at all', async () => {
    mockConnectionRow(null);
    await expect(getValidAccessToken()).rejects.toMatchObject({ code: 'not_connected' });
  });

  it('throws reauth_required immediately, without calling refresh, when status is already needs_reconnect', async () => {
    mockConnectionRow({ ...BASE_ROW, status: 'needs_reconnect' });
    await expect(getValidAccessToken()).rejects.toMatchObject({ code: 'reauth_required' });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe('getValidAccessToken — revocation path (invalid_grant)', () => {
  it('clears the stored token and marks needs_reconnect on invalid_grant, without throwing unhandled', async () => {
    const { update } = mockConnectionRow({ ...BASE_ROW, access_token_encrypted: null, access_token_expires_at: null });
    decryptMock.mockReturnValue('revoked-refresh-token');
    refreshMock.mockRejectedValue(new GoogleOAuthError('Token has been expired or revoked.', undefined, 'invalid_grant'));

    await expect(getValidAccessToken()).rejects.toMatchObject({ code: 'reauth_required' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      refresh_token_encrypted: null,
      access_token_encrypted: null,
      status: 'needs_reconnect',
    }));
  });

  it('does NOT mark needs_reconnect for a non-invalid_grant refresh failure (e.g. a transient network/server error)', async () => {
    const { update } = mockConnectionRow({ ...BASE_ROW, access_token_encrypted: null, access_token_expires_at: null });
    decryptMock.mockReturnValue('refresh-token');
    refreshMock.mockRejectedValue(new GoogleOAuthError('Network error calling Google token endpoint'));

    await expect(getValidAccessToken()).rejects.toMatchObject({ code: 'reauth_required' });
    // update() may still be called for other reasons in the future, but
    // never with a needs_reconnect status for a transient failure.
    for (const call of update.mock.calls) {
      expect(call[0]).not.toMatchObject({ status: 'needs_reconnect' });
    }
  });

  it('never logs or throws the refresh token itself in the error path', async () => {
    mockConnectionRow({ ...BASE_ROW, access_token_encrypted: null, access_token_expires_at: null });
    decryptMock.mockReturnValue('super-secret-refresh-token-value');
    refreshMock.mockRejectedValue(new GoogleOAuthError('Token has been expired or revoked.', undefined, 'invalid_grant'));

    try {
      await getValidAccessToken();
    } catch (err) {
      expect((err as GoogleConnectionError).message).not.toContain('super-secret-refresh-token-value');
    }
  });
});

describe('disconnectGoogle', () => {
  it('clears both tokens and sets status to disconnected', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
    fromMock.mockReturnValue({ update });

    await disconnectGoogle();

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      refresh_token_encrypted: null,
      access_token_encrypted: null,
      access_token_expires_at: null,
      status: 'disconnected',
    }));
  });

  it('surfaces a db_error if the update fails, rather than silently succeeding', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'connection refused' } }) }) });
    fromMock.mockReturnValue({ update });

    await expect(disconnectGoogle()).rejects.toMatchObject({ code: 'db_error' });
  });
});
