// Config/constants for Facebook Page post scheduling. Plain constants and
// process.env reads, matching every other integration's config.ts in this
// codebase — no config service exists here to route through.

import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

// Only Facebook Page posts are implemented — per the explicit scope for
// this first pass. Instagram/personal profiles/Groups/TikTok are NOT
// supported even though Platform includes 'instagram' in its type (kept so
// the model doesn't need a breaking change when a second platform really
// is implemented later).
export const SUPPORTED_SCHEDULING_PLATFORMS = ['facebook'] as const;

export function isSupportedSchedulingPageId(pageId: string): boolean {
  return pageId === GP_CAFE_PAGE_ID;
}

export const MAX_CAPTION_LENGTH = 5000; // Meta's own Page post text limit is far higher; this is a sane guard, not Meta's real cap
export const MAX_MEDIA_URLS = 1; // v1: at most one photo — see media.ts

export const MAX_PUBLISH_ATTEMPTS = 3;
// Backoff after attempt 1, 2, 3 respectively — only reached for a
// classified-transient failure (see errors.ts). A permanent failure never
// gets a next_retry_at at all.
export const RETRY_BACKOFF_MINUTES = [2, 10, 30];

// A row stuck in 'publishing' longer than this is treated as
// "unknown outcome", not simply re-queued — see worker.ts's header comment
// on why auto-retrying here specifically risks a duplicate Facebook post.
export const STUCK_PUBLISHING_TIMEOUT_MINUTES = 5;

// How many due posts one worker tick processes at most — bounds a single
// invocation's runtime regardless of how the caller triggers it (external
// cron, manual call, etc.).
export const MAX_POSTS_PER_WORKER_TICK = 20;
