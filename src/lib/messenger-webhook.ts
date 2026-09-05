// Facebook Messenger webhook support (Meta "Messenger API Setup" → Configure
// webhooks). This module holds token/signature verification and the event
// dispatcher; src/app/webhook/route.ts stays a thin HTTP adapter on top of it
// so webhook processing is kept separate from the rest of the app's logic.
//
// Docs: https://developers.facebook.com/docs/messenger-platform/webhooks

// ── Constant-time comparisons ────────────────────────────────────────────────
// Same approach as src/lib/session.ts: compare every character so a failed
// match doesn't leak timing information about how many characters matched.

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Meta verify-token check (GET /webhook) ───────────────────────────────────

export function isValidVerifyToken(providedToken: string | null): boolean {
  const expected = process.env.META_VERIFY_TOKEN;
  if (!expected || !providedToken) return false;
  return constantTimeEqual(providedToken, expected);
}

// ── Optional payload signature check (POST /webhook) ─────────────────────────
// Meta signs every POST with an X-Hub-Signature-256 header (HMAC-SHA256 over
// the raw body, keyed with the app secret). Verifying it is optional here —
// it only activates once META_APP_SECRET is configured — so the endpoint
// still works for initial setup/testing without it. Set META_APP_SECRET in
// production so forged requests are rejected.

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function isValidSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true; // signature verification disabled: app secret not configured

  const prefix = 'sha256=';
  if (!signatureHeader || !signatureHeader.startsWith(prefix)) return false;

  const provided = signatureHeader.slice(prefix.length);
  const expected = await hmacSha256Hex(appSecret, rawBody);
  return constantTimeEqual(provided, expected);
}

// ── Types (subset of the Messenger webhook payload we act on) ────────────────

interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    quick_reply?: { payload?: string };
    attachments?: Array<{ type?: string; payload?: { url?: string } }>;
  };
  postback?: { title?: string; payload?: string };
  delivery?: unknown;
  read?: unknown;
}

interface PageEntry {
  id?: string;
  time?: number;
  messaging?: MessagingEvent[];
}

interface WebhookBody {
  object?: string;
  entry?: PageEntry[];
}

function isWebhookBody(value: unknown): value is WebhookBody {
  return typeof value === 'object' && value !== null;
}

// ── Safe logging ──────────────────────────────────────────────────────────────
// Never log tokens/secrets. In production, log only counts/ids — not message
// content, which may contain user-entered text — full payloads are only
// logged in development for debugging.

export function logWebhookEvent(body: unknown): void {
  if (!isWebhookBody(body)) {
    console.warn('[webhook] received payload with unexpected shape');
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[webhook] event:', JSON.stringify(body));
    return;
  }

  const entries = body.entry ?? [];
  console.log('[webhook] event received:', JSON.stringify({
    object: body.object,
    entries: entries.length,
    messaging: entries.reduce((sum, e) => sum + (e.messaging?.length ?? 0), 0),
  }));
}

// ── Event dispatch (extensible) ───────────────────────────────────────────────
// Add new branches here — or plug in the existing AI chatbot/reply flow — as
// more Messenger event types need handling.

async function handleMessage(event: MessagingEvent): Promise<void> {
  const senderId = event.sender?.id ?? 'unknown';

  if (event.message?.quick_reply) {
    console.log(`[webhook] quick reply from ${senderId}: ${event.message.quick_reply.payload ?? ''}`);
    return;
  }

  console.log(`[webhook] message from ${senderId} (mid=${event.message?.mid ?? 'n/a'})`);
  // TODO: reply via the Send API (POST to graph.facebook.com/<version>/me/messages
  // with a PAGE_ACCESS_TOKEN) once this integration needs to respond to users.
}

async function handlePostback(event: MessagingEvent): Promise<void> {
  const senderId = event.sender?.id ?? 'unknown';
  console.log(`[webhook] postback from ${senderId}: ${event.postback?.payload ?? ''}`);
}

async function handleMessagingEvent(event: MessagingEvent): Promise<void> {
  try {
    if (event.message) {
      await handleMessage(event);
    } else if (event.postback) {
      await handlePostback(event);
    } else if (event.delivery) {
      console.log('[webhook] delivery receipt received');
    } else if (event.read) {
      console.log('[webhook] read receipt received');
    } else {
      console.log('[webhook] unhandled messaging event type');
    }
  } catch (err) {
    console.error('[webhook] error handling messaging event:', err instanceof Error ? err.message : 'unknown error');
  }
}

export async function processWebhookBody(body: unknown): Promise<void> {
  if (!isWebhookBody(body) || body.object !== 'page') return;

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      await handleMessagingEvent(event);
    }
  }
}
