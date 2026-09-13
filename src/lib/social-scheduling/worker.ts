// Scheduler worker — this is the actual "server-side scheduler" the brief
// requires. It does NOT run as a persistent process (this app is deployed
// on Vercel — serverless functions, no long-running worker process
// possible). Instead, runTick() is a single, idempotent, safe-to-call-
// concurrently unit of work: "find whatever is due right now and publish
// it." An external trigger (documented in docs/social-scheduling.md) calls
// POST /api/social/scheduler/run on a schedule (every 1-5 minutes) to
// invoke it repeatedly — see that doc for exactly why Vercel's own native
// Cron isn't used here (Hobby-plan projects cap at once/day, which would
// make "schedule for 6:30pm" meaningless).
//
// DUPLICATE-PUBLISH PROTECTION: claimDuePosts() (store.ts) atomically
// transitions scheduled -> publishing via a single conditional UPDATE, so
// two overlapping ticks (two external triggers firing close together, or
// one retried by the trigger source) can never both claim the same post —
// whichever UPDATE commits first wins, the other affects 0 rows and moves
// on. The one gap that CANNOT be fully closed by software alone: if the
// process is killed/times out in the exact window after Meta has already
// returned success but before markPublished() commits, that post is stuck
// in 'publishing' with a real, live Facebook post already existing that
// this database doesn't know about yet. store.ts's reclaimStuckPublishingPosts()
// handles this conservatively — after STUCK_PUBLISHING_TIMEOUT_MINUTES it's
// marked 'failed' with error_code 'stuck_unknown_outcome' rather than
// silently retried, specifically so nobody automatically republishes on top
// of a post that may already be live. A human must check the Page and
// decide whether to /retry (if it truly never published) or leave it
// (if it did) — documented plainly rather than pretended away.

import { claimDuePosts, markPublished, markFailed } from '@/lib/social-scheduling/store';
import { publishFacebookPagePost } from '@/lib/social-scheduling/publish';
import { classifyPublishFailure } from '@/lib/social-scheduling/errors';
import type { ScheduledPostDto } from '@/lib/social-scheduling/types';

export interface WorkerTickResult {
  claimed: number;
  published: number;
  failed: number;
  retried: number; // transient failures re-queued with backoff, not yet terminal
}

async function publishOne(post: ScheduledPostDto): Promise<'published' | 'failed' | 'retried'> {
  console.log('[social-scheduling/worker] publishing_started', { id: post.id, platform: post.platform, pageId: post.pageId, attempt: post.attemptCount + 1 });

  try {
    const result = await publishFacebookPagePost({ id: post.id, pageId: post.pageId, caption: post.caption, mediaUrls: post.mediaUrls });
    await markPublished(post.id, result.externalPostId, result.externalPermalink);
    console.log('[social-scheduling/worker] publishing_succeeded', { id: post.id, platform: post.platform, pageId: post.pageId });
    return 'published';
  } catch (err) {
    const failure = classifyPublishFailure(err);
    await markFailed(post.id, post.attemptCount, failure);
    const willRetry = failure.class === 'transient' && post.attemptCount + 1 < 3;
    if (willRetry) {
      console.warn('[social-scheduling/worker] publishing_failed_will_retry', { id: post.id, platform: post.platform, pageId: post.pageId, attempt: post.attemptCount + 1, errorCode: failure.code });
      return 'retried';
    }
    console.error('[social-scheduling/worker] publishing_failed_terminal', { id: post.id, platform: post.platform, pageId: post.pageId, attempt: post.attemptCount + 1, errorCode: failure.code });
    return 'failed';
  }
}

export async function runTick(): Promise<WorkerTickResult> {
  const claimed = await claimDuePosts();
  console.log('[social-scheduling/worker] tick_claimed', { count: claimed.length });

  const result: WorkerTickResult = { claimed: claimed.length, published: 0, failed: 0, retried: 0 };

  // Sequential, not concurrent — deliberately gentle on Meta's own
  // per-Page rate limits when several posts are due in the same tick.
  for (const post of claimed) {
    const outcome = await publishOne(post);
    if (outcome === 'published') result.published++;
    else if (outcome === 'retried') result.retried++;
    else result.failed++;
  }

  return result;
}
