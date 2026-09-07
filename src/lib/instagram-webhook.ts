// Instagram webhook events — dispatched from the existing POST /webhook
// alongside Messenger and Facebook Comments events (src/lib/
// messenger-webhook.ts), never a second webhook endpoint. Meta's top-level
// `object` for Instagram is "instagram" (confirmed against Meta's current
// Graph API webhooks reference on 2026-09-07), distinct from "page" used for
// Messenger/Facebook feed. Uses the SAME X-Hub-Signature-256 validation as
// every other event type (checked once, in messenger-webhook.ts, before any
// entry is dispatched) — not weakened or duplicated here.
//
// Comments: entry[].changes[] with field="comments" — shape confirmed
// against Meta's docs (from/media/text/id/parent_id).
// Direct messages: Meta's docs are ambiguous on the exact payload shape for
// the "messages" field on this object type (ordinary entry[].changes[] vs
// Messenger-style entry[].messaging[]). Rather than risk silently
// mis-parsing an uncertain schema, both possible shapes are detected and
// both just trigger an authoritative resync from the real Graph API
// (src/lib/instagram/sync.ts's forceSyncConversations) instead of
// constructing a message row directly from the webhook payload.

import { after } from 'next/server';
import { upsertMedia, upsertComment } from '@/lib/instagram/store';
import { syncSingleMediaComments, forceSyncConversations } from '@/lib/instagram/sync';
import { isSupportedInstagramAccountId } from '@/lib/instagram/config';

interface IgChangeValue {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
  parent_id?: string;
}

interface IgChange {
  field?: string;
  value?: IgChangeValue;
}

interface IgMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
}

export interface InstagramEntry {
  id?: string; // the connected IG Business Account ID for this entry
  time?: number;
  changes?: IgChange[];
  messaging?: IgMessagingEvent[];
}

export function isInstagramEntry(entry: { changes?: unknown; messaging?: unknown }): entry is InstagramEntry {
  return Array.isArray(entry.changes) || Array.isArray(entry.messaging);
}

const LOG_PREFIX = '[INSTAGRAM WEBHOOK]';
const DM_RELATED_FIELDS = new Set(['messages', 'message_reactions', 'message_edit', 'messaging_postbacks', 'messaging_seen']);

async function handleCommentChange(value: IgChangeValue): Promise<void> {
  const commentId = value.id;
  const mediaId = value.media?.id;
  if (!commentId || !mediaId) {
    console.warn(`${LOG_PREFIX} comment change missing id/media.id — skipping`);
    return;
  }

  console.log(`${LOG_PREFIX} Comment on media ${mediaId}`);

  // Placeholder — partial-update semantics in upsertMedia() mean this never
  // blanks out real content a full sync already filled in.
  await upsertMedia({ mediaId, mediaProductType: value.media?.media_product_type });

  await upsertComment({
    commentId,
    mediaId,
    parentCommentId: value.parent_id ?? null,
    userId: value.from?.id ?? null,
    username: value.from?.username ?? null,
    text: value.text ?? null,
    // Instagram's comment webhook doesn't reliably include a timestamp —
    // the immediate resync below backfills the real one from the Graph API.
    createdAt: new Date().toISOString(),
  });

  after(() => syncSingleMediaComments(mediaId));
}

async function handleChange(change: IgChange): Promise<void> {
  if (change.field === 'comments' && change.value) {
    await handleCommentChange(change.value);
  } else if (change.field && DM_RELATED_FIELDS.has(change.field)) {
    console.log(`${LOG_PREFIX} DM-related event (${change.field}) — resyncing conversations`);
    after(() => forceSyncConversations());
  }
  // mentions/live_comments/story_insights/etc.: not part of this feature's
  // scope — intentionally not processed further.
}

export async function handleInstagramEntry(entry: InstagramEntry): Promise<void> {
  const accountId = entry.id;
  if (accountId && !isSupportedInstagramAccountId(accountId)) {
    // A different Instagram account than the one this integration supports —
    // never processed or stored.
    return;
  }

  for (const change of entry.changes ?? []) {
    try {
      await handleChange(change);
    } catch (err) {
      console.error(`${LOG_PREFIX} Error handling change:`, err instanceof Error ? err.message : 'unknown error');
    }
  }

  if (entry.messaging?.length) {
    console.log(`${LOG_PREFIX} DM event via messaging[] — resyncing conversations`);
    after(() => forceSyncConversations());
  }
}
