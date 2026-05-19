import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

const COOKIE_NAME = 'admin-panel-auth';
const COOKIE_MAX_AGE = 60 * 60; // 1 hour

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function POST(request: Request) {
  const ip = await getIp();

  // 5 attempts per 15 minutes — persists across cold starts when Upstash is configured
  const allowed = await rateLimit(ip, 'admin-login', 5, '15 m');
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : '';
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { success: false, message: 'Admin password is not configured.' },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json(
      { success: false, message: 'Incorrect password.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true, message: 'Authenticated' });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '1',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
  });
  return response;
}
