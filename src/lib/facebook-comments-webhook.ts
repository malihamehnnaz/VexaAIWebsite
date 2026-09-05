// Facebook Page "feed" webhook events (comment add/edit) — dispatched from
// the existing POST /webhook alongside Messenger events (src/lib/
// messenger-webhook.ts), never a second webhook endpoint. Payload shape
// (entry[].changes[].{field,value}, with comment_id/post_id/parent_id/
// message/from/created_time/verb/item under value) confirmed against
// Meta's Page webhooks reference on 2026-09-05.
//
// Strictly scoped to GP's - Guilty Pleasure Café (106658601471856) — Nitol
// Bot (211548128717427) and any other Page id are ignored entirely, never
// processed or stored. Uses the SAME X-Hub-Signature-256 validation as
// Messenger events (checked once, in messenger-webhook.ts, before either
// kind of entry is dispatched) — not weakened or duplicated here.

import { after } from 'next/server';
import { upsertComment, upsertPost } from '@/lib/facebook/store';
import { syncSinglePost } from '@/lib/facebook/sync';
import { isSupportedCommentsPageId } from '@/lib/facebook/config';

interface FeedChangeValue {
  item?: string;
  verb?: string;
  comment_id?: string;
  post_id?: string;
  parent_id?: string;
  message?: string;
  created_time?: number | string;
  from?: { id?: string; name?: string };
}

interface FeedChange {
  field?: string;
  value?: FeedChangeValue;
}

export interface FeedEntry {
  id?: string; // Page id
  time?: number;
  changes?: FeedChange[];
}

export function isFeedEntry(entry: { changes?: unknown }): entry is FeedEntry {
  return Array.isArray(entry.changes);
}

const LOG_PREFIX = '[FACEBOOK COMMENTS WEBHOOK]';

// Webhook `created_time` is documented as Unix time but has historically
// been delivered in seconds; Graph API GET responses use ISO 8601 strings.
// Handle both defensively rather than assuming one.
function toIsoTimestamp(createdTime: number | string | undefined): string | null {
  if (createdTime == null) return null;
  if (typeof createdTime === 'string') {
    const parsed = new Date(createdTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const ms = createdTime < 10_000_000_000 ? createdTime * 1000 : createdTime;
  return new Date(ms).toISOString();
}

async function handleFeedChange(change: FeedChange): Promise<void> {
  const value = change.value;
  if (change.field !== 'feed' || !value || value.item !== 'comment') return;

  const { comment_id: commentId, post_id: postId, parent_id: parentId, verb } = value;
  if (!commentId || !postId) {
    console.warn(`${LOG_PREFIX} comment change missing comment_id/post_id — skipping`);
    return;
  }

  console.log(`${LOG_PREFIX} Comment ${verb ?? 'add'} on post ${postId}`);

  if (verb === 'remove') {
    // Deliberately not deleting the local row — keep the historical record.
    // (Vexa has no "deleted" status concept requested; safe no-op for now.)
    return;
  }

  // Ensure the parent post row exists (comments FK to it) even if a full
  // sync hasn't reached this post yet — partial-update semantics in
  // upsertPost() mean this never blanks out real content synced later.
  await upsertPost({ postId });

  await upsertComment({
    postId,
    commentId,
    parentCommentId: parentId && parentId !== postId ? parentId : null,
    commenterId: value.from?.id ?? null,
    commenterName: value.from?.name ?? null,
    message: value.message ?? null,
    createdAtMeta: toIsoTimestamp(value.created_time),
  });

  // Backfill anything this event didn't carry, without delaying the
  // webhook's response to Meta.
  after(() => syncSinglePost(postId));
}

export async function handleFeedEntry(entry: FeedEntry): Promise<void> {
  const pageId = entry.id;
  if (!pageId || !isSupportedCommentsPageId(pageId)) {
    // Includes Nitol Bot and any other Page — never processed or stored.
    return;
  }

  for (const change of entry.changes ?? []) {
    try {
      await handleFeedChange(change);
    } catch (err) {
      console.error(`${LOG_PREFIX} Error handling feed change:`, err instanceof Error ? err.message : 'unknown error');
    }
  }
}
