// Outgoing Messenger replies via Meta's Send API. Kept separate from
// src/lib/messenger-webhook.ts (inbound events) and messenger-store.ts
// (persistence) so each concern stays isolated.
//
// Endpoint/body/response shape confirmed against Meta's current docs on
// 2026-09-05 (developers.facebook.com/docs/messenger-platform/send-messages
// and /docs/graph-api/changelog, latest stable version v26.0 at the time):
//   POST https://graph.facebook.com/<version>/<PAGE-ID>/messages?access_token=...
//   body: { recipient: { id }, messaging_type: "RESPONSE", message: { text } }
//   success response: { recipient_id, message_id }
// META_GRAPH_API_VERSION overrides the version if Meta ships a newer one
// later without needing a code change.

const DEFAULT_GRAPH_API_VERSION = 'v26.0';

function graphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
}

// Page Access Tokens, one per Facebook Page (this app already manages two:
// GP's - Guilty Pleasure Café and Nitol Bot). Looked up as
// META_PAGE_ACCESS_TOKEN_<pageId> first so more Pages can be added later by
// just setting another env var; falls back to the single generic
// META_PAGE_ACCESS_TOKEN for a one-Page setup. Never logged, never returned
// to any API response.
export function resolvePageAccessToken(pageId: string): string | null {
  const perPage = process.env[`META_PAGE_ACCESS_TOKEN_${pageId}`];
  if (perPage) return perPage;
  return process.env.META_PAGE_ACCESS_TOKEN || null;
}

export class MessengerSendError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'MessengerSendError';
  }
}

export interface SendTextResult {
  metaMessageId: string | null;
}

interface SendApiSuccessBody {
  recipient_id?: string;
  message_id?: string;
}

interface SendApiErrorBody {
  error?: { message?: string; type?: string; code?: number; fbtrace_id?: string };
}

export async function sendTextMessage(pageId: string, recipientId: string, text: string): Promise<SendTextResult> {
  const token = resolvePageAccessToken(pageId);
  if (!token) {
    throw new MessengerSendError(`No Page Access Token configured for page ${pageId}`);
  }

  const url = `https://graph.facebook.com/${graphApiVersion()}/${encodeURIComponent(pageId)}/messages?access_token=${encodeURIComponent(token)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text },
      }),
    });
  } catch (err) {
    // Never log `url` — it contains the access token.
    throw new MessengerSendError('Network error calling Meta Send API', err);
  }

  const payload = await response.json().catch(() => null) as (SendApiSuccessBody & SendApiErrorBody) | null;

  if (!response.ok || !payload || payload.error) {
    console.error('[messenger-send] Meta rejected the message:', {
      pageId,
      status: response.status,
      code: payload?.error?.code,
      type: payload?.error?.type,
      message: payload?.error?.message,
    });
    throw new MessengerSendError('Meta rejected the message');
  }

  return { metaMessageId: typeof payload.message_id === 'string' ? payload.message_id : null };
}
