// Persistence for the Google/GA4 connection, backed by the project's
// existing Supabase Postgres database (google_connections table in
// supabase_schema.sql). Kept separate from oauth.ts (token exchange) and
// ga4.ts (report queries) so each concern stays isolated.
//
// There is currently only one authenticated identity in this app (the single
// shared admin login — see src/lib/session.ts; the app_users table exists in
// the schema but isn't wired to any real multi-user auth flow anywhere in
// the codebase). So "the Vexa user" this connection is tied to is that one
// admin identity, represented by the constant below rather than a real
// per-user foreign key. If multi-user auth is added later, this is the one
// place that needs to change.
export const VEXA_ADMIN_USER_ID = 'admin';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { encryptSecret, decryptSecret } from '@/lib/google/crypto';
import { exchangeCodeForTokens, refreshGoogleAccessToken, GoogleOAuthError, type GoogleTokenResult } from '@/lib/google/oauth';

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '542598893';

interface ConnectionRow {
  id: string;
  google_account_id: string | null;
  google_email: string | null;
  refresh_token_encrypted: string | null;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
  property_id: string;
  scopes: string | null;
  created_at: string;
  updated_at: string;
  last_sync_at: string | null;
  status: ConnectionStatusValue;
  metadata: Record<string, unknown> | null;
}

export type ConnectionStatusValue = 'connected' | 'disconnected' | 'needs_reconnect';

export interface ConnectionStatus {
  connected: boolean;
  status: ConnectionStatusValue;
  propertyId: string | null;
  googleEmail: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  // Scopes Google actually granted at consent time (not what we asked for).
  // Scope strings are public identifiers, not credentials. Exposed so the
  // Marketing Website — and a reconnect self-check — can tell which
  // capabilities are really available without guessing.
  grantedScopes: string[];
  capabilities: { analytics: boolean; searchConsole: boolean; googleBusiness: boolean };
}

export class GoogleConnectionError extends Error {
  constructor(message: string, public readonly code: 'not_connected' | 'reauth_required' | 'db_error') {
    super(message);
    this.name = 'GoogleConnectionError';
  }
}

export class GoogleOAuthMissingRefreshTokenError extends Error {
  constructor() {
    super('Google did not return a refresh token and none is stored — reconnect required');
    this.name = 'GoogleOAuthMissingRefreshTokenError';
  }
}

async function getConnectionRow(): Promise<ConnectionRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', VEXA_ADMIN_USER_ID)
    .eq('provider', 'google')
    .maybeSingle();
  if (error) throw new GoogleConnectionError(error.message, 'db_error');
  return data as ConnectionRow | null;
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const row = await getConnectionRow();
  if (!row) {
    return {
      connected: false, status: 'disconnected', propertyId: null, googleEmail: null, connectedAt: null, lastSyncAt: null,
      grantedScopes: [], capabilities: { analytics: false, searchConsole: false, googleBusiness: false },
    };
  }

  const grantedScopes = (row.scopes ?? '').split(/\s+/).filter(Boolean);
  return {
    connected: row.status === 'connected',
    status: row.status,
    propertyId: row.property_id,
    googleEmail: row.google_email,
    connectedAt: row.created_at,
    lastSyncAt: row.last_sync_at,
    grantedScopes,
    capabilities: {
      analytics: grantedScopes.includes('https://www.googleapis.com/auth/analytics.readonly'),
      searchConsole: grantedScopes.includes('https://www.googleapis.com/auth/webmasters.readonly'),
      googleBusiness: grantedScopes.includes('https://www.googleapis.com/auth/business.manage'),
    },
  };
}

// Cached, resolve-once values (currently just the Business Profile account
// id — src/lib/google-business/sync.ts) live in this same row's `metadata`
// column rather than a new table, per Part 2's "cache on the tenant
// record". Merges rather than replaces, so callers never need to know what
// else is in there.
export async function mergeConnectionMetadata(patch: Record<string, unknown>): Promise<void> {
  const row = await getConnectionRow();
  if (!row) throw new GoogleConnectionError('No Google connection found', 'not_connected');
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('google_connections')
    .update({ metadata: { ...(row.metadata ?? {}), ...patch }, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (error) throw new GoogleConnectionError(error.message, 'db_error');
}

export async function getConnectionMetadata(): Promise<Record<string, unknown> | null> {
  const row = await getConnectionRow();
  return row?.metadata ?? null;
}

// Completes the OAuth flow: exchanges the code, then upserts the connection.
// If Google didn't return a refresh_token this time (only issued on first
// consent unless the caller already forced prompt=consent, which it does),
// the existing stored one is preserved rather than overwritten with nothing.
export async function saveConnectionFromCode(code: string): Promise<void> {
  console.log('[Google OAuth] token_exchange_started');
  const tokens: GoogleTokenResult = await exchangeCodeForTokens(code);
  console.log('[Google OAuth] token_exchange_succeeded');

  const supabase = getSupabaseAdmin();
  const existing = await getConnectionRow();

  const refreshTokenEncrypted = tokens.refreshToken
    ? encryptSecret(tokens.refreshToken)
    : existing?.refresh_token_encrypted;

  if (!refreshTokenEncrypted) {
    throw new GoogleOAuthMissingRefreshTokenError();
  }

  const row = {
    user_id: VEXA_ADMIN_USER_ID,
    provider: 'google',
    google_account_id: tokens.googleAccountId,
    google_email: tokens.googleEmail,
    refresh_token_encrypted: refreshTokenEncrypted,
    access_token_encrypted: encryptSecret(tokens.accessToken),
    access_token_expires_at: tokens.expiresAt,
    property_id: GA4_PROPERTY_ID,
    scopes: tokens.scope,
    // A successful (re)connection always clears any prior needs_reconnect
    // state — the whole point of the user completing this flow again.
    status: 'connected' as const,
    updated_at: new Date().toISOString(),
  };

  console.log('[Google OAuth] connection_save_started');
  const { error } = await supabase
    .from('google_connections')
    .upsert(row, { onConflict: 'user_id,provider' });
  if (error) throw new GoogleConnectionError(error.message, 'db_error');
  console.log('[Google OAuth] connection_save_succeeded');
}

const EXPIRY_BUFFER_MS = 60_000; // refresh a minute early to avoid edge-of-expiry failures

// Guards against concurrent refreshes racing each other. Scoped to what's
// actually achievable in this deployment model: Vercel serverless functions
// don't share memory across concurrent invocations, so this cannot be a
// cross-instance lock — but within one warm instance (the common case for
// back-to-back requests), two nearly-simultaneous callers now await the
// same in-flight refresh instead of each firing their own token-endpoint
// call. A genuine cross-instance race is still possible but harmless:
// Google's refresh_token grant is not single-use, so two concurrent
// refreshes from different instances each succeed independently and simply
// both write a (different, both valid) access token — the last write wins,
// nothing is corrupted or invalidated.
let refreshInFlight: Promise<{ accessToken: string; propertyId: string }> | null = null;

// Returns a currently-valid access token, refreshing it via the stored
// refresh token if the cached one is missing/expired. Never returns the
// refresh token itself.
export async function getValidAccessToken(): Promise<{ accessToken: string; propertyId: string }> {
  const row = await getConnectionRow();
  if (!row) throw new GoogleConnectionError('No Google connection found', 'not_connected');
  if (row.status === 'needs_reconnect') {
    throw new GoogleConnectionError('Google authorization needs to be reconnected', 'reauth_required');
  }

  const expiresAt = row.access_token_expires_at ? new Date(row.access_token_expires_at).getTime() : 0;
  if (row.access_token_encrypted && expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    return { accessToken: decryptSecret(row.access_token_encrypted), propertyId: row.property_id };
  }

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      return await performRefresh(row);
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function performRefresh(row: ConnectionRow): Promise<{ accessToken: string; propertyId: string }> {
  if (!row.refresh_token_encrypted) {
    throw new GoogleConnectionError('No refresh token stored — reconnect required', 'reauth_required');
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(row.refresh_token_encrypted);
  } catch (err) {
    console.error('[google-store] failed to decrypt stored refresh token:', err instanceof Error ? err.message : err);
    throw new GoogleConnectionError('Stored Google credentials could not be read', 'reauth_required');
  }

  let refreshed: { accessToken: string; expiresAt: string };
  try {
    refreshed = await refreshGoogleAccessToken(refreshToken);
  } catch (err) {
    // invalid_grant specifically means the refresh token itself was
    // revoked (the user disconnected from their Google account) or has
    // expired — that is durable, not transient, so it's the one case that
    // clears the stored token and marks needs_reconnect. Any other failure
    // (network blip, Google 5xx, rate limit) is surfaced as a plain error
    // instead — retried by the next natural call, not looped here, and the
    // connection's persisted state is left alone rather than incorrectly
    // marked as needing reconnection over what might be transient.
    const isRevoked = err instanceof GoogleOAuthError && err.code === 'invalid_grant';
    if (isRevoked) {
      console.warn('[google-store] refresh token revoked (invalid_grant) — clearing stored token, marking needs_reconnect');
      const supabase = getSupabaseAdmin();
      const { error: clearError } = await supabase
        .from('google_connections')
        .update({
          refresh_token_encrypted: null,
          access_token_encrypted: null,
          access_token_expires_at: null,
          status: 'needs_reconnect',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (clearError) console.error('[google-store] failed to persist needs_reconnect state:', clearError.message);
      throw new GoogleConnectionError('Google authorization was revoked — reconnect required', 'reauth_required');
    }

    console.error('[google-store] access token refresh failed:', err instanceof Error ? err.message : err);
    throw new GoogleConnectionError('Google token refresh failed — please try again', 'reauth_required');
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('google_connections')
    .update({
      access_token_encrypted: encryptSecret(refreshed.accessToken),
      access_token_expires_at: refreshed.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (error) throw new GoogleConnectionError(error.message, 'db_error');

  return { accessToken: refreshed.accessToken, propertyId: row.property_id };
}

// POST /disconnect (Non-negotiable: "clearable on request"). Clears both
// tokens and marks the connection disconnected — distinct from
// needs_reconnect, which means "Google revoked it out from under us";
// disconnected means the client asked us to forget it.
export async function disconnectGoogle(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('google_connections')
    .update({
      refresh_token_encrypted: null,
      access_token_encrypted: null,
      access_token_expires_at: null,
      status: 'disconnected',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', VEXA_ADMIN_USER_ID)
    .eq('provider', 'google');
  if (error) throw new GoogleConnectionError(error.message, 'db_error');
}

export async function markSynced(): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('google_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', VEXA_ADMIN_USER_ID)
    .eq('provider', 'google');
}
