// Supplemental Graph API sync for Facebook Comments — the webhook (see
// src/lib/facebook-comments-webhook.ts) is the primary, real-time path, but
// it only delivers NEW events going forward. This fills two gaps: an
// initial backfill of recent posts/comments so the marketing website isn't
// empty the first time it's wired up, and a bounded periodic refresh in
// case a webhook delivery was ever missed. Gated by a staleness check so
// the Graph API isn't hit on every single request.

import { listPagePosts, listPostComments } from '@/lib/facebook/graph';
import { upsertPost, upsertComment } from '@/lib/facebook/store';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

const SYNC_STALE_MS = 60_000; // don't re-sync more often than once a minute
const MAX_POSTS_PER_SYNC = 25; // one page of posts
const MAX_COMMENT_PAGES_PER_POST = 3; // bounded — avoids unbounded work on a post with huge comment volume

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

async function syncPostComments(postId: string): Promise<void> {
  let after: string | undefined;
  for (let page = 0; page < MAX_COMMENT_PAGES_PER_POST; page++) {
    const { items, nextCursor } = await listPostComments(postId, GP_CAFE_PAGE_ID, after);

    for (const comment of items) {
      const parentId = comment.parent?.id ?? null;
      await upsertComment({
        postId,
        commentId: comment.id,
        parentCommentId: parentId && parentId !== postId ? parentId : null,
        commenterId: comment.from?.id ?? null,
        commenterName: comment.from?.name ?? null,
        message: comment.message ?? null,
        createdAtMeta: comment.created_time ?? null,
      });
    }

    if (!nextCursor) break;
    after = nextCursor;
  }
}

async function runSync(): Promise<void> {
  const { items: posts } = await listPagePosts(GP_CAFE_PAGE_ID, undefined, MAX_POSTS_PER_SYNC);

  for (const post of posts) {
    await upsertPost({
      postId: post.id,
      message: post.message ?? null,
      permalink: post.permalink_url ?? null,
      createdAtMeta: post.created_time ?? null,
    });
    await syncPostComments(post.id);
  }
}

// Call before serving a read — no-ops if a sync already ran recently, and
// coalesces concurrent callers onto a single in-flight sync rather than
// firing one each.
export async function syncIfStale(): Promise<void> {
  if (Date.now() - lastSyncAt < SYNC_STALE_MS) return;

  if (!syncInFlight) {
    syncInFlight = runSync()
      .then(() => { lastSyncAt = Date.now(); })
      .catch(err => {
        // A sync failure shouldn't break reads of already-stored data —
        // log and let the caller continue serving whatever's in Supabase.
        console.error('[facebook-sync] sync failed:', err instanceof Error ? err.message : err);
      })
      .finally(() => { syncInFlight = null; });
  }

  await syncInFlight;
}

// Used by the webhook handler for a single post after a feed event, so a
// comment that arrives via webhook with fields we couldn't fully parse (or
// a reply whose own parent comment we haven't seen yet) gets backfilled
// immediately rather than waiting up to a minute.
export async function syncSinglePost(postId: string): Promise<void> {
  try {
    await syncPostComments(postId);
  } catch (err) {
    console.error('[facebook-sync] single-post sync failed:', err instanceof Error ? err.message : err);
  }
}
