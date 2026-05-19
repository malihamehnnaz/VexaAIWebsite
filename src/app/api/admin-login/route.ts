import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const COOKIE_NAME = 'admin-panel-auth';
const COOKIE_MAX_AGE = 60 * 60; // 1 hour

// Brute-force protection: max 5 attempts per IP per 15 minutes
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attemptStore = new Map<string, number[]>();

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (attemptStore.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attemptStore.set(ip, recent);
    return true;
  }
  recent.push(now);
  attemptStore.set(ip, recent);
  // Evict oldest if store grows too large
  if (attemptStore.size > 500) {
    const oldest = attemptStore.keys().next().value;
    if (oldest) attemptStore.delete(oldest);
  }
  return false;
}

export async function POST(request: Request) {
  const ip = await getIp();

  if (isLoginRateLimited(ip)) {
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
