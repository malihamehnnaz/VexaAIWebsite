// Shared error → HTTP response mapping for the /api/google/analytics/* and
// /api/google/status routes — keeps each route thin and ensures no internal
// detail (Google error bodies, DB error text) leaks to the client.

import { NextResponse } from 'next/server';
import { GoogleConnectionError } from '@/lib/google/store';
import { Ga4ApiError } from '@/lib/google/ga4';

export function googleErrorResponse(err: unknown): NextResponse {
  if (err instanceof GoogleConnectionError) {
    if (err.code === 'db_error') {
      console.error('[google-analytics] database error:', err.message);
    }
    const status = err.code === 'not_connected' ? 409 : err.code === 'reauth_required' ? 401 : 500;
    const message = err.code === 'not_connected'
      ? 'Google Analytics is not connected'
      : err.code === 'reauth_required'
        ? 'Google authorization has expired or was revoked — please reconnect'
        : 'Unable to load the Google connection';
    return NextResponse.json({ success: false, error: message, code: err.code }, { status });
  }

  if (err instanceof Ga4ApiError) {
    const status = err.status === 403 ? 403 : err.status === 404 ? 404 : err.status === 429 ? 429 : 502;
    const message = err.status === 403
      ? 'This Google account does not have permission to view this GA4 property'
      : err.status === 404
        ? 'GA4 property not found'
        : err.status === 429
          ? 'Google Analytics rate limit reached — try again shortly'
          : 'Unable to retrieve Google Analytics data';
    return NextResponse.json({ success: false, error: message }, { status });
  }

  console.error('[google-analytics] unexpected error:', err instanceof Error ? err.message : err);
  return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
}
