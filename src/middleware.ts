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
    // Google/GA4 and OAuth routes are deliberately NOT listed here. This
    // middleware only understands the admin session cookie — but /api/google/
    // analytics/* and /api/google/status are now also called server-to-server
    // by the separate Guilty Pleasure Marketing OS (bearer-token auth, no
    // cookie at all; see src/lib/google/auth.ts), and the OAuth start/
    // callback routes redirect rather than return JSON on an auth failure.
    // Listing the analytics/status routes here would 401 the Marketing OS's
    // requests before they ever reached that dual-auth check. Each route
    // still enforces its own auth inline.
  ],
};
