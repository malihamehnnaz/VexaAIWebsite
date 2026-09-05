// Shared admin-session check for new routes (Google OAuth/GA4). Mirrors the
// same cookie + verifySessionToken() pattern already used inline in
// src/app/api/admin-check, admin-data, and src/middleware.ts — extracted here
// so the several new Google routes don't each duplicate it. Existing admin
// routes are left exactly as they are.

import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-panel-auth')?.value ?? '';
  return token ? await verifySessionToken(token) : false;
}
