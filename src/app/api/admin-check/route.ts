import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const ok = cookieStore.get('admin-panel-auth')?.value === '1';
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
