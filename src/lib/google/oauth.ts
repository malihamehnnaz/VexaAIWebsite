// Google OAuth 2.0 — authorization URL building and token exchange for the
// GA4 read-only integration. Uses the existing "Web client 1" OAuth client
// (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET) — no new OAuth client is created.
// Plain fetch() calls to Google's endpoints, matching this project's existing
// style (no googleapis/google-auth-library dependency needed for this).

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// Read-only scopes only — no write/admin access to any Google property.
//   analytics.readonly  — GA4 reporting (src/lib/google/ga4.ts)
//   webmasters.readonly — Search Console (src/lib/google/search-console.ts)
// openid+email are additionally requested — both non-sensitive,
// identity-only scopes — solely so the connected Google account's email can
// be shown in the dashboard ("Connected as ...").
//
// NOTE: adding a scope here only takes effect on the NEXT authorization.
// An existing connection keeps working for whatever it was already granted;
// Search Console calls will fail with an insufficient-permission error until
// the account is reconnected via /api/google/oauth (which uses
// prompt=consent, so the expanded scope is re-consented cleanly).
export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'openid',
  'email',
].join(' ');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is not set`);
  return value;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    // Forces the consent screen every time so Google reliably issues a
    // refresh_token even on a reconnect (Google only returns one on the
    // very first consent otherwise).
    prompt: 'consent',
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string; // ISO timestamp
  scope: string;
  googleAccountId: string | null;
  googleEmail: string | null;
}

interface TokenEndpointSuccess {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

interface TokenEndpointError {
  error?: string;
  error_description?: string;
}

export class GoogleOAuthError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

// Decodes the (already-verified-by-transport, server-to-server) id_token's
// payload without checking its signature — acceptable here because it came
// directly from Google's token endpoint over TLS using our client secret,
// not from a client-supplied value. Used only to display which Google
// account is connected, never for any authorization decision.
function decodeIdTokenPayload(idToken: string): { sub?: string; email?: string } {
  try {
    const payload = idToken.split('.')[1];
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json) as { sub?: string; email?: string };
  } catch {
    return {};
  }
}

async function callTokenEndpoint(body: URLSearchParams): Promise<TokenEndpointSuccess> {
  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    throw new GoogleOAuthError('Network error calling Google token endpoint', err);
  }

  const payload = await response.json().catch(() => null) as (TokenEndpointSuccess & TokenEndpointError) | null;

  if (!response.ok || !payload || payload.error) {
    // Never log `body` (contains the client secret and, for the exchange
    // call, the authorization code).
    console.error('[google-oauth] token endpoint rejected the request:', {
      status: response.status,
      error: payload?.error,
    });
    throw new GoogleOAuthError(payload?.error_description || payload?.error || 'Google token endpoint error');
  }

  return payload;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResult> {
  const payload = await callTokenEndpoint(new URLSearchParams({
    code,
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    grant_type: 'authorization_code',
  }));

  if (!payload.access_token) throw new GoogleOAuthError('Google token endpoint did not return an access_token');

  const identity = payload.id_token ? decodeIdTokenPayload(payload.id_token) : {};

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
    scope: payload.scope ?? GOOGLE_OAUTH_SCOPES,
    googleAccountId: identity.sub ?? null,
    googleEmail: identity.email ?? null,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const payload = await callTokenEndpoint(new URLSearchParams({
    refresh_token: refreshToken,
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    grant_type: 'refresh_token',
  }));

  if (!payload.access_token) throw new GoogleOAuthError('Google token endpoint did not return an access_token on refresh');

  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
  };
}
