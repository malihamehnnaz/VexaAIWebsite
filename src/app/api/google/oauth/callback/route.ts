import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { saveConnectionFromCode, GoogleOAuthMissingRefreshTokenError } from '@/lib/google/store';
import { GoogleOAuthError } from '@/lib/google/oauth';

// GET /api/google/oauth/callback — Google redirects here after the user
// approves (or denies) access. Exchanges the code for tokens, stores the
// connection, and redirects back to the dashboard — never renders tokens or
// the authorization code to the browser beyond this one redirect chain.

const STATE_COOKIE = 'google-oauth-state';
const DASHBOARD_PATH = '/admin/chat-sessions';

function redirectWithError(request: Request, code: string): NextResponse {
  const response = NextResponse.redirect(new URL(`${DASHBOARD_PATH}?ga_error=${encodeURIComponent(code)}`, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const { searchParams } = new URL(request.url);
  const googleError = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (googleError) {
    // e.g. the user clicked "Cancel" on Google's consent screen.
    console.warn('[google-oauth] callback received an error from Google:', googleError);
    return redirectWithError(request, googleError === 'access_denied' ? 'access_denied' : 'google_error');
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithError(request, 'invalid_state');
  }
  if (!code) {
    return redirectWithError(request, 'missing_code');
  }

  try {
    await saveConnectionFromCode(code);
  } catch (err) {
    if (err instanceof GoogleOAuthMissingRefreshTokenError) {
      console.error('[google-oauth] callback:', err.message);
      return redirectWithError(request, 'missing_refresh_token');
    }
    if (err instanceof GoogleOAuthError) {
      // Message is safe to log — callTokenEndpoint() never includes secrets in it.
      console.error('[google-oauth] callback token exchange failed:', err.message);
      return redirectWithError(request, 'token_exchange_failed');
    }
    console.error('[google-oauth] callback unexpected error:', err instanceof Error ? err.message : err);
    return redirectWithError(request, 'unexpected_error');
  }

  const response = NextResponse.redirect(new URL(`${DASHBOARD_PATH}?ga_connected=1`, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
