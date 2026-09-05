import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { buildGoogleAuthUrl } from '@/lib/google/oauth';

// GET /api/google/oauth — starts the Google OAuth flow for the GA4
// read-only integration. This is a real browser navigation (the "Connect
// Google Analytics" button links here directly), not a fetch call — so an
// unauthenticated hit redirects to the admin login page rather than
// returning JSON, matching how the rest of /admin behaves for page visits.

const STATE_COOKIE = 'google-oauth-state';
const STATE_COOKIE_MAX_AGE = 600; // 10 minutes — generous for completing Google's consent screen

export async function GET(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    console.error('[google-oauth] cannot start: GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI is not configured');
    return NextResponse.redirect(new URL('/admin/chat-sessions?ga_error=not_configured', request.url));
  }

  // Random, single-use, short-lived — compared against the callback's
  // `state` query param to prevent CSRF (an attacker can't forge a callback
  // hit without also controlling this httpOnly cookie).
  const state = randomBytes(24).toString('base64url');

  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    path: '/',
    maxAge: STATE_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax', // must survive the top-level redirect back from accounts.google.com
    secure: process.env.NODE_ENV !== 'development',
  });
  return response;
}
