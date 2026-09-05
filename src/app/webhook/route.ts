import { NextResponse } from 'next/server';
import {
  isValidSignature,
  isValidVerifyToken,
  logWebhookEvent,
  processWebhookBody,
} from '@/lib/messenger-webhook';

// Facebook Messenger webhook — Meta Developer Console → Messenger API Setup →
// Configure webhooks. Deliberately placed at the top-level /webhook (not under
// /api) so the callback URL is exactly https://YOUR-DOMAIN.com/webhook. This
// file is a server route handler, so it is served by the Next.js backend and
// is never touched by frontend/SPA page routing — there is no page at this
// path to conflict with it.
//
// Verification/signature logic and event handling live in
// src/lib/messenger-webhook.ts, kept separate from the rest of the app.

// GET — Meta's webhook verification handshake.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!process.env.META_VERIFY_TOKEN) {
    console.error('[webhook] verification failed: META_VERIFY_TOKEN is not configured');
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (mode === 'subscribe' && isValidVerifyToken(token)) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }

  console.warn('[webhook] verification failed: mode or verify token did not match');
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — Messenger webhook events (messages, postbacks, delivery/read receipts).
export async function POST(request: Request) {
  const rawBody = await request.text();

  const signatureOk = await isValidSignature(rawBody, request.headers.get('x-hub-signature-256'));
  if (!signatureOk) {
    console.warn('[webhook] rejected event: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('[webhook] rejected event: invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  logWebhookEvent(body);

  // Process, then always return 200 — a non-200 response makes Meta retry
  // delivery, so handler errors are caught and logged rather than surfaced.
  try {
    await processWebhookBody(body);
  } catch (err) {
    console.error('[webhook] error processing event:', err instanceof Error ? err.message : 'unknown error');
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
