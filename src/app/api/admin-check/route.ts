import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-panel-auth')?.value ?? '';
  const ok = token ? await verifySessionToken(token) : false;
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
