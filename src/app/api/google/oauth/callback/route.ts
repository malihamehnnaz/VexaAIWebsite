import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveConnectionFromCode, GoogleOAuthMissingRefreshTokenError } from '@/lib/google/store';
import { GoogleOAuthError } from '@/lib/google/oauth';

// GET /api/google/oauth/callback — Google redirects here after the user
// approves (or denies) access. Exchanges the code for tokens, stores the
// connection, and redirects back to the dashboard — never renders tokens or
// the authorization code to the browser beyond this one redirect chain.
//
// IMPORTANT: this route does NOT check the admin session cookie. That cookie
// is set with SameSite=Strict (src/app/api/admin-login/route.ts), and Strict
// cookies are never sent by the browser on a cross-site navigation —
// including this one, since Google's redirect back to us originates from
// accounts.google.com. A prior version gated this route on that cookie and
// it silently always failed here, bailing out before ever reading `code`/
// `state`, before any token exchange, before any database write (diagnosed
// 2026-09-05: prod showed 307/9ms/zero external API calls/zero DB rows —
// all consistent with exiting on that very first check). The `state` cookie
// (SameSite=Lax, so it *does* survive this redirect) is the correct and
// sufficient security boundary for an OAuth callback: it's httpOnly,
// single-use, short-lived, and only exists because this same browser
// recently completed the admin-gated /api/google/oauth start step.

const STATE_COOKIE = 'google-oauth-state';
const DASHBOARD_PATH = '/admin/chat-sessions';

function redirectWithError(request: Request, code: string): NextResponse {
  console.log('[Google OAuth] callback_redirect', { outcome: 'error', code });
  const response = NextResponse.redirect(new URL(`${DASHBOARD_PATH}?ga_error=${encodeURIComponent(code)}`, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  console.log('[Google OAuth] callback_started');

  const { searchParams } = new URL(request.url);
  const googleError = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Diagnostic only — booleans/counts, never the actual values.
  console.log('[Google OAuth] code_present', { present: !!code });
  console.log('[Google OAuth] state_present', { present: !!state });

  if (googleError) {
    // e.g. the user clicked "Cancel" on Google's consent screen.
    console.warn('[google-oauth] callback received an error from Google:', googleError);
    return redirectWithError(request, googleError === 'access_denied' ? 'access_denied' : 'google_error');
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  console.log('[Google OAuth] state_cookie_present', { present: !!expectedState });

  const stateValid = !!state && !!expectedState && state === expectedState;
  console.log('[Google OAuth] state_valid', { valid: stateValid });

  if (!stateValid) {
    console.warn('[Google OAuth] state validation failed', {
      hadStateParam: !!state,
      hadStateCookie: !!expectedState,
    });
    return redirectWithError(request, 'invalid_state');
  }
  if (!code) {
    return redirectWithError(request, 'missing_code');
  }

  try {
    // token_exchange_started/succeeded and connection_save_started/succeeded
    // are logged inside saveConnectionFromCode() (src/lib/google/store.ts),
    // at the point each actually happens.
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

  console.log('[Google OAuth] callback_redirect', { outcome: 'success' });
  const response = NextResponse.redirect(new URL(`${DASHBOARD_PATH}?ga_connected=1`, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
