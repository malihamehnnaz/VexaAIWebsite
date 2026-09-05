import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('admin-panel-auth')?.value ?? '';
  const authenticated = token ? await verifySessionToken(token) : false;

  if (!authenticated) {
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/chat-sessions',
    '/api/admin-check',
    '/api/admin-data',
    '/api/admin-db-test',
    '/api/admin-logout',
    // Google/GA4 read endpoints — each also checks the session itself
    // (same redundant pattern as the admin-data routes above). The OAuth
    // start/callback routes are deliberately NOT listed here: they redirect
    // rather than return JSON on an auth failure, which doesn't fit this
    // middleware's blanket "JSON 401 for /api/*" behavior.
    '/api/google/status',
    '/api/google/analytics/overview',
    '/api/google/analytics/acquisition',
    '/api/google/analytics/pages',
    '/api/google/analytics/trends',
  ],
};
