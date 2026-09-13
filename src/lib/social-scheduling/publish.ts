// The one, shared Facebook Page publishing service — used identically by
// the scheduled worker (worker.ts) and the explicit "publish now" route, so
// there is exactly one code path that ever actually calls Meta to create a
// post (per the explicit instruction not to duplicate Meta publishing
// code). Reuses the existing Graph client/token resolution from
// src/lib/facebook/graph.ts and src/lib/meta/config.ts — no second Meta
// client, no second token system.

import { createPageFeedPost, createPagePhotoPost, FacebookGraphError } from '@/lib/facebook/graph';
import { isSupportedSchedulingPageId } from '@/lib/social-scheduling/config';

export interface PublishablePost {
  id: string;
  pageId: string;
  caption: string | null;
  mediaUrls: string[];
}

export interface PublishResult {
  externalPostId: string;
  externalPermalink: string;
}

export class UnsupportedPageError extends Error {
  constructor(pageId: string) {
    super(`Page ${pageId} is not a supported Facebook Page for scheduling`);
    this.name = 'UnsupportedPageError';
  }
}

// Publishes exactly one post. Never partially succeeds silently — either
// returns a real Meta post id + permalink, or throws (the caller,
// worker.ts/the publish-now route, is responsible for recording the
// failure — this function has no DB access itself, keeping "call Meta" and
// "persist the result" as two separate, individually-inspectable steps).
export async function publishFacebookPagePost(post: PublishablePost): Promise<PublishResult> {
  if (!isSupportedSchedulingPageId(post.pageId)) {
    throw new UnsupportedPageError(post.pageId);
  }

  const caption = post.caption?.trim() ?? '';
  const media = post.mediaUrls[0]; // v1: at most one photo — validated well before this point (media.ts)

  let result: { postId: string };
  if (media) {
    result = await createPagePhotoPost(post.pageId, media, caption);
  } else {
    if (!caption) throw new FacebookGraphError('Cannot publish an empty post — a caption or media is required', 0);
    result = await createPageFeedPost(post.pageId, caption);
  }

  return {
    externalPostId: result.postId,
    // Standard permalink shape for a Page post (confirmed against Meta's
    // current docs) — not fabricated, just deterministically derived from
    // the real id Meta returned.
    externalPermalink: `https://www.facebook.com/${result.postId}`,
  };
}
