// Shared types for Facebook Page post scheduling. Backed by the existing
// generated_content table (widened, not duplicated — see
// supabase_migration_social_scheduling.sql), so a scheduled post is
// literally the same row Content Intelligence's /generate endpoint already
// produces, just further along a wider status lifecycle.

export type Platform = 'facebook' | 'instagram'; // instagram publishing is explicitly NOT implemented here — see config.ts

export type ScheduledPostStatus =
  | 'draft' // pre-existing Content Intelligence state — not scheduling-related
  | 'approved' // pre-existing Content Intelligence state — not scheduling-related
  | 'rejected' // pre-existing Content Intelligence state — not scheduling-related
  | 'schedule_pending' // a create request is being validated/persisted — extremely short-lived, mostly for observability
  | 'scheduled' // waiting for scheduled_at; the worker's "find due" query targets exactly this state
  | 'publishing' // claimed by a worker, Meta call in flight
  | 'published' // Meta confirmed; external_post_id/external_permalink are set
  | 'failed' // permanently failed, or exhausted retries
  | 'cancelled'; // user-cancelled; never subsequently published

// States a scheduled post can still be edited/rescheduled in.
export const EDITABLE_STATUSES: ScheduledPostStatus[] = ['schedule_pending', 'scheduled', 'failed'];
// States cancel is a no-op success on (idempotent) rather than an error.
export const ALREADY_TERMINAL_FOR_CANCEL: ScheduledPostStatus[] = ['cancelled', 'published'];

export interface CreateScheduledPostInput {
  platform: Platform;
  pageId: string;
  caption: string;
  mediaUrls?: string[];
  scheduledAt: string; // local wall-clock time, e.g. "2026-09-20T18:30:00" (no offset)
  timezone: string; // IANA zone name, e.g. "Australia/Sydney"
  opportunityId?: string | null; // set when scheduling content that came from Content Intelligence
}

export interface UpdateScheduledPostInput {
  caption?: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  timezone?: string;
}

export interface ScheduledPostDto {
  id: string;
  platform: Platform;
  pageId: string;
  caption: string | null;
  mediaUrls: string[];
  status: ScheduledPostStatus;
  scheduledAt: string | null; // ISO, UTC
  timezone: string | null; // IANA zone, for display — see timezone.ts for formatting
  scheduledAtDisplay: string | null; // pre-formatted "20 Sep 2026, 18:30" in `timezone`, for a frontend with no timezone library of its own
  publishedAt: string | null;
  externalPostId: string | null;
  externalPermalink: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  opportunityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListScheduledPostsFilters {
  platform?: Platform;
  status?: ScheduledPostStatus;
  from?: string; // ISO — scheduled_at >=
  to?: string; // ISO — scheduled_at <=
  limit?: number;
  cursor?: string;
}
