import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { disconnectGoogle } from '@/lib/google/store';

// POST /api/google/business/disconnect — clears the stored Google token
// (non-negotiable: "clearable on request"). This clears the SAME
// google_connections row GA4/Search Console also use — disconnecting here
// disconnects the whole Google connection, not just Business Profile,
// since it's one shared OAuth connection with three scopes on it. That's
// an intentional consequence of reusing one connection rather than a
// second, parallel OAuth system — documented in the README.

export async function POST(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await disconnectGoogle();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/google/business/disconnect] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Unable to disconnect' }, { status: 500 });
  }
}
