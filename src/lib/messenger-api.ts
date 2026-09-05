// Shared CORS + authentication helpers for the /api/messenger/* routes that
// the separate marketing website calls. Kept apart from the admin panel's
// cookie-based session auth (src/lib/session.ts) since this is a different
// caller (a server/browser on another origin, not our own logged-in admin).

import { NextResponse } from 'next/server';
import { constantTimeEqual } from '@/lib/utils';

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';

function getAllowedOrigins(): string[] {
  return (process.env.MESSENGER_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

// Only reflects the request's Origin back when it's on the allowlist — never
// a wildcard, since these routes return customer conversation data.
function resolveCorsOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  return getAllowedOrigins().includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

// Use in place of NextResponse.json so every response — success or error —
// carries the right CORS headers for the caller's origin.
export function corsJson(request: Request, body: unknown, init?: ResponseInit): NextResponse {
  const origin = resolveCorsOrigin(request);
  return NextResponse.json(body, {
    ...init,
    headers: { ...corsHeaders(origin), ...(init?.headers ?? {}) },
  });
}

// Shared OPTIONS handler — browsers preflight every request here because
// Authorization is a non-"simple" header.
export function corsPreflight(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(resolveCorsOrigin(request)) });
}

// Bearer-token check against MESSENGER_API_KEY. Fails closed if the env var
// isn't set — there is no "open by default" mode for this API.
export function isAuthorizedRequest(request: Request): boolean {
  const expected = process.env.MESSENGER_API_KEY;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;

  return constantTimeEqual(header.slice(prefix.length), expected);
}

export function unauthorizedResponse(request: Request): NextResponse {
  return corsJson(request, { success: false, error: 'Unauthorized' }, { status: 401 });
}
