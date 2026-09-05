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

// Defensive array coercion — Meta's payload shape is trusted but not
// guaranteed; a malformed/unexpected body should never crash the endpoint.
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ── Safe logging ──────────────────────────────────────────────────────────────
// Prefixed "[FACEBOOK WEBHOOK]" so events are easy to find/grep for in
// production logs. Never logs tokens/secrets (verify token, app secret, page
// access token, API keys) — those never flow through this module in the
// first place. Message text IS logged (by design, to confirm parsing) since
// this is a private, owner-only log stream, not a public response body.

const LOG_PREFIX = '[FACEBOOK WEBHOOK]';

export function logWebhookEvent(body: unknown): void {
  console.log(`${LOG_PREFIX} Event received`);

  if (!isWebhookBody(body)) {
    console.warn(`${LOG_PREFIX} Unexpected payload shape (not a JSON object) — skipping`);
    return;
  }

  console.log(`${LOG_PREFIX} Object: ${body.object ?? 'unknown'}`);

  for (const entry of asArray<PageEntry>(body.entry)) {
    console.log(`${LOG_PREFIX} Entry: ${JSON.stringify({
      pageId: entry?.id ?? 'unknown',
      time: entry?.time ?? null,
      messagingCount: asArray<MessagingEvent>(entry?.messaging).length,
    })}`);
  }
}

// ── Event dispatch (extensible) ───────────────────────────────────────────────
// Add new branches here — or plug in the existing AI chatbot/reply flow — as
// more Messenger event types need handling. No outgoing API calls are made
// yet; this is purely a parse-and-log confirmation step.

type MessengerEventType = 'message' | 'postback' | 'delivery' | 'read' | 'unknown';

function describeEventType(event: MessagingEvent): MessengerEventType {
  if (event.message) return 'message';
  if (event.postback) return 'postback';
  if (event.delivery) return 'delivery';
  if (event.read) return 'read';
  return 'unknown';
}

function logMessagingEvent(event: MessagingEvent): void {
  console.log(`${LOG_PREFIX} Sender ID: ${event.sender?.id ?? 'unknown'}`);
  console.log(`${LOG_PREFIX} Recipient/Page ID: ${event.recipient?.id ?? 'unknown'}`);
  console.log(`${LOG_PREFIX} Event type: ${describeEventType(event)}`);

  if (event.message?.text) {
    console.log(`${LOG_PREFIX} Message: ${event.message.text}`);
  }
  if (event.message?.mid) {
    console.log(`${LOG_PREFIX} Message ID: ${event.message.mid}`);
  }
  if (event.message?.quick_reply?.payload) {
    console.log(`${LOG_PREFIX} Quick reply payload: ${event.message.quick_reply.payload}`);
  }
  if (event.postback?.payload) {
    console.log(`${LOG_PREFIX} Postback payload: ${event.postback.payload}`);
  }
  if (event.timestamp) {
    console.log(`${LOG_PREFIX} Timestamp: ${event.timestamp}`);
  }
}

async function handleMessage(event: MessagingEvent): Promise<void> {
  void event;
  // TODO: reply via the Send API (POST to graph.facebook.com/<version>/me/messages
  // with a PAGE_ACCESS_TOKEN) once this integration needs to respond to users.
}

async function handlePostback(event: MessagingEvent): Promise<void> {
  void event;
  // TODO: route postback payloads to the relevant flow once replies are wired up.
}

async function handleMessagingEvent(event: MessagingEvent): Promise<void> {
  try {
    logMessagingEvent(event);

    if (event.message) {
      await handleMessage(event);
    } else if (event.postback) {
      await handlePostback(event);
    }
    // delivery/read receipts: logged above, nothing further to do yet.
  } catch (err) {
    console.error(`${LOG_PREFIX} Error handling messaging event:`, err instanceof Error ? err.message : 'unknown error');
  }
}

export async function processWebhookBody(body: unknown): Promise<void> {
  if (!isWebhookBody(body) || body.object !== 'page') return;

  for (const entry of asArray<PageEntry>(body.entry)) {
    for (const event of asArray<MessagingEvent>(entry?.messaging)) {
      await handleMessagingEvent(event);
    }
  }
}
