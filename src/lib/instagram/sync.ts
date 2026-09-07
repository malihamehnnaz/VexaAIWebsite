// Supplemental Graph API sync for Instagram — mirrors src/lib/facebook/sync.ts.
// The webhook is the primary real-time path for comments/messages; this
// covers initial backfill and a bounded periodic refresh, gated by a
// staleness check so Meta isn't hit on every request.

import { getAccountFields, listMedia, listMediaComments, listInstagramConversations, getConversationMessages } from '@/lib/instagram/graph';
import { upsertAccount, upsertMedia, upsertComment, upsertConversation, upsertMessage } from '@/lib/instagram/store';
import { IG_BUSINESS_ACCOUNT_ID } from '@/lib/instagram/config';

const SYNC_STALE_MS = 60_000;
const MAX_MEDIA_PER_SYNC = 25;
const MAX_COMMENT_PAGES_PER_MEDIA = 2;
const MAX_CONVERSATIONS_PER_SYNC = 25;

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

async function syncMediaComments(mediaId: string): Promise<void> {
  let after: string | undefined;
  for (let page = 0; page < MAX_COMMENT_PAGES_PER_MEDIA; page++) {
    const { items, nextCursor } = await listMediaComments(mediaId, after);
    for (const comment of items) {
      await upsertComment({
        commentId: comment.id,
        mediaId,
        parentCommentId: comment.parent_id ?? null,
        userId: comment.from?.id ?? null,
        username: comment.username ?? comment.from?.username ?? null,
        text: comment.text ?? null,
        createdAt: comment.timestamp ?? null,
      });
    }
    if (!nextCursor) break;
    after = nextCursor;
  }
}

// Shared by the periodic full sync and the webhook's immediate "wake up" —
// see forceSyncConversations() for why DM webhook events resync rather than
// parse the webhook payload directly.
async function syncConversations(): Promise<void> {
  const { items: conversations } = await listInstagramConversations(undefined, MAX_CONVERSATIONS_PER_SYNC);
  for (const convo of conversations) {
    const participant = convo.participants?.data?.find(p => p.id !== IG_BUSINESS_ACCOUNT_ID);
    await upsertConversation({ conversationId: convo.id, participantId: participant?.id ?? null, participantUsername: participant?.username ?? null });

    const { items: messages } = await getConversationMessages(convo.id);
    for (const msg of messages) {
      const direction = msg.from?.id === IG_BUSINESS_ACCOUNT_ID ? 'outbound' : 'inbound';
      await upsertMessage({
        messageId: msg.id,
        conversationId: convo.id,
        senderId: msg.from?.id ?? null,
        recipientId: msg.to?.data?.[0]?.id ?? null,
        message: msg.message ?? null,
        timestamp: msg.created_time ?? null,
        direction,
      });
    }
  }
}

async function runFullSync(): Promise<void> {
  try {
    const account = await getAccountFields(IG_BUSINESS_ACCOUNT_ID);
    await upsertAccount({ username: account.username ?? null, name: account.name ?? null, followersCount: account.followers_count ?? null });
  } catch (err) {
    console.error('[instagram-sync] account fields sync failed:', err instanceof Error ? err.message : err);
  }

  try {
    const { items: media } = await listMedia(IG_BUSINESS_ACCOUNT_ID, undefined, MAX_MEDIA_PER_SYNC);
    for (const item of media) {
      await upsertMedia({
        mediaId: item.id,
        caption: item.caption ?? null,
        mediaType: item.media_type ?? null,
        mediaProductType: item.media_product_type ?? null,
        timestamp: item.timestamp ?? null,
        permalink: item.permalink ?? null,
        mediaUrl: item.media_url ?? null,
        thumbnailUrl: item.thumbnail_url ?? null,
      });
      await syncMediaComments(item.id);
    }
  } catch (err) {
    console.error('[instagram-sync] media sync failed:', err instanceof Error ? err.message : err);
  }

  try {
    await syncConversations();
  } catch (err) {
    console.error('[instagram-sync] conversations sync failed:', err instanceof Error ? err.message : err);
  }
}

export async function syncIfStale(): Promise<void> {
  if (Date.now() - lastSyncAt < SYNC_STALE_MS) return;

  if (!syncInFlight) {
    syncInFlight = runFullSync()
      .then(() => { lastSyncAt = Date.now(); })
      .catch(err => console.error('[instagram-sync] sync failed:', err instanceof Error ? err.message : err))
      .finally(() => { syncInFlight = null; });
  }

  await syncInFlight;
}

// Used by the webhook handler for a single media item after a comment event.
export async function syncSingleMediaComments(mediaId: string): Promise<void> {
  try {
    await syncMediaComments(mediaId);
  } catch (err) {
    console.error('[instagram-sync] single-media comment sync failed:', err instanceof Error ? err.message : err);
  }
}

// Used by the webhook handler as an immediate "wake up" whenever a DM-related
// event arrives. Instagram's DM webhook payload shape is documented
// ambiguously (Meta's own reference doesn't clearly confirm
// entry[].messaging[] vs entry[].changes[] with field="messages" for this
// object type), so rather than risk mis-parsing an uncertain schema, the
// webhook triggers this authoritative resync from the real Graph API
// instead — bypasses the staleness gate since a real event just arrived.
export async function forceSyncConversations(): Promise<void> {
  try {
    await syncConversations();
  } catch (err) {
    console.error('[instagram-sync] forced conversation sync failed:', err instanceof Error ? err.message : err);
  }
}
