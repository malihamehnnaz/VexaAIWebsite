import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-panel-auth')?.value === '1';

  const response = NextResponse.json({ ok: isAuthenticated });
  response.cookies.set({
    name: 'admin-panel-auth',
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
  });
  return response;
}
