// Persistence for scheduled posts — backed by the widened generated_content
// table (see supabase_migration_social_scheduling.sql), not a new one.
// Every state transition here is a single, conditional UPDATE (WHERE
// status = '<expected current state>') — that conditional WHERE is what
// makes claimDuePosts safe under concurrent workers: two workers racing to
// claim the same row both issue an UPDATE ... WHERE status='scheduled',
// but Postgres's row-level locking serializes them — whichever commits
// first flips the status, and the second one's WHERE no longer matches
// (0 rows affected), so it never claims a job already taken. No advisory
// locks or SELECT ... FOR UPDATE needed for this because each transition
// is exactly one atomic statement.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/sanitize';
import { MAX_PUBLISH_ATTEMPTS, RETRY_BACKOFF_MINUTES, MAX_POSTS_PER_WORKER_TICK, STUCK_PUBLISHING_TIMEOUT_MINUTES } from '@/lib/social-scheduling/config';
import { formatInstantForDisplay } from '@/lib/social-scheduling/timezone';
import { EDITABLE_STATUSES, type CreateScheduledPostInput, type ScheduledPostDto, type ScheduledPostStatus, type ListScheduledPostsFilters, type Platform } from '@/lib/social-scheduling/types';
import type { ClassifiedFailure } from '@/lib/social-scheduling/errors';

const MAX_CAPTION_CHARS = 5000;

interface Row {
  id: string;
  opportunity_id: string | null;
  page_id: string;
  platform: Platform;
  caption: string | null;
  media_urls: string[] | null;
  status: ScheduledPostStatus;
  scheduled_at: string | null;
  timezone: string | null;
  published_at: string | null;
  external_post_id: string | null;
  external_permalink: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDto(row: Row): ScheduledPostDto {
  return {
    id: row.id,
    platform: row.platform,
    pageId: row.page_id,
    caption: row.caption,
    mediaUrls: row.media_urls ?? [],
    status: row.status,
    scheduledAt: row.scheduled_at,
    timezone: row.timezone,
    scheduledAtDisplay: row.scheduled_at && row.timezone ? formatInstantForDisplay(row.scheduled_at, row.timezone) : null,
    publishedAt: row.published_at,
    externalPostId: row.external_post_id,
    externalPermalink: row.external_permalink,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    nextRetryAt: row.next_retry_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    opportunityId: row.opportunity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = 'id, opportunity_id, page_id, platform, caption, media_urls, status, scheduled_at, timezone, published_at, external_post_id, external_permalink, attempt_count, last_attempt_at, next_retry_at, error_code, error_message, created_at, updated_at';

export class ScheduledPostNotFoundError extends Error {
  constructor(id: string) {
    super(`Scheduled post ${id} not found`);
    this.name = 'ScheduledPostNotFoundError';
  }
}

export class NotEditableError extends Error {
  constructor(public readonly currentStatus: ScheduledPostStatus) {
    super(`Cannot modify a post in status "${currentStatus}"`);
    this.name = 'NotEditableError';
  }
}

export async function createScheduledPost(input: CreateScheduledPostInput & { scheduledAtUtc: string }): Promise<ScheduledPostDto> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      opportunity_id: input.opportunityId ?? null,
      page_id: input.pageId,
      platform: input.platform,
      format: input.mediaUrls && input.mediaUrls.length > 0 ? 'photo' : 'text',
      caption: sanitizeText(input.caption, MAX_CAPTION_CHARS),
      media_urls: input.mediaUrls ?? null,
      scheduled_at: input.scheduledAtUtc,
      timezone: input.timezone,
      status: 'scheduled',
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw new Error(`generated_content insert failed: ${error.message}`);
  return rowToDto(data as Row);
}

export async function getScheduledPostById(id: string): Promise<ScheduledPostDto | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('generated_content').select(SELECT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`generated_content lookup failed: ${error.message}`);
  return data ? rowToDto(data as Row) : null;
}

export async function listScheduledPosts(filters: ListScheduledPostsFilters): Promise<{ posts: ScheduledPostDto[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = decodeOffsetCursor(filters.cursor);

  let query = supabase
    .from('generated_content')
    .select(SELECT_COLUMNS)
    // Only rows this feature's status lifecycle actually produced — never
    // surfaces a plain Content Intelligence draft that was never scheduled.
    .in('status', ['schedule_pending', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'])
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('scheduled_at', filters.from);
  if (filters.to) query = query.lte('scheduled_at', filters.to);

  const { data, error } = await query;
  if (error) throw new Error(`generated_content query failed: ${error.message}`);
  const rows = (data as Row[]) ?? [];
  return { posts: rows.map(rowToDto), nextCursor: rows.length === limit ? encodeOffsetCursor(offset + limit) : null };
}

function decodeOffsetCursor(cursor?: string): number {
  if (!cursor) return 0;
  const n = parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

// Throws NotEditableError (not a bare false) so the route can return a
// specific, correct error rather than a generic one.
export async function updateScheduledPost(id: string, patch: { caption?: string; mediaUrls?: string[]; scheduledAtUtc?: string; timezone?: string }): Promise<ScheduledPostDto> {
  const current = await getScheduledPostById(id);
  if (!current) throw new ScheduledPostNotFoundError(id);
  if (!EDITABLE_STATUSES.includes(current.status)) throw new NotEditableError(current.status);

  const supabase = getSupabaseAdmin();
  const updatePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.caption !== undefined) updatePatch.caption = sanitizeText(patch.caption, MAX_CAPTION_CHARS);
  if (patch.mediaUrls !== undefined) updatePatch.media_urls = patch.mediaUrls;
  if (patch.scheduledAtUtc !== undefined) updatePatch.scheduled_at = patch.scheduledAtUtc;
  if (patch.timezone !== undefined) updatePatch.timezone = patch.timezone;

  // Editing a failed post is a fresh start — back to 'scheduled' with a
  // clean retry budget, not a silent re-attempt of whatever caused the
  // original failure.
  if (current.status === 'failed') {
    updatePatch.status = 'scheduled';
    updatePatch.attempt_count = 0;
    updatePatch.next_retry_at = null;
    updatePatch.error_code = null;
    updatePatch.error_message = null;
  }

  const { data, error } = await supabase
    .from('generated_content')
    .update(updatePatch)
    .eq('id', id)
    .in('status', EDITABLE_STATUSES) // re-checked atomically — guards a race between the read above and this write
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`generated_content update failed: ${error.message}`);
  if (!data) throw new NotEditableError(current.status); // lost the race — someone else changed its status between our read and this write
  return rowToDto(data as Row);
}

// Idempotent: cancelling an already-cancelled post is a successful no-op,
// never an error. Cancelling an already-published post IS an error — you
// cannot un-publish a real Facebook post through this action.
export async function cancelScheduledPost(id: string): Promise<ScheduledPostDto> {
  const current = await getScheduledPostById(id);
  if (!current) throw new ScheduledPostNotFoundError(id);
  if (current.status === 'cancelled') return current; // idempotent
  if (current.status === 'published') throw new NotEditableError(current.status);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('generated_content')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .not('status', 'in', '(published,cancelled)') // atomic guard: never flips a post that became published/already-cancelled between our read and this write
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`generated_content cancel failed: ${error.message}`);
  if (!data) {
    // Raced with a status change — re-read to report the real current state.
    const latest = await getScheduledPostById(id);
    if (latest?.status === 'cancelled') return latest; // still idempotent
    throw new NotEditableError(latest?.status ?? current.status);
  }
  return rowToDto(data as Row);
}

// ── Worker-facing: atomic claim + terminal transitions ───────────────────────

// Claims up to `limit` due posts, transitioning each scheduled -> publishing
// atomically (see this file's header comment for why this is safe under
// concurrent workers). Also reclaims any post stuck in 'publishing' past
// STUCK_PUBLISHING_TIMEOUT_MINUTES — but reclaiming there means marking it
// failed with a distinct "unknown outcome" error, NEVER re-publishing it
// automatically (see worker.ts's header comment on why).
export async function claimDuePosts(limit = MAX_POSTS_PER_WORKER_TICK): Promise<ScheduledPostDto[]> {
  await reclaimStuckPublishingPosts();

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: candidates, error: candidatesError } = await supabase
    .from('generated_content')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (candidatesError) throw new Error(`generated_content candidate query failed: ${candidatesError.message}`);

  const claimed: ScheduledPostDto[] = [];
  for (const candidate of (candidates as Array<{ id: string }>) ?? []) {
    const { data, error } = await supabase
      .from('generated_content')
      .update({ status: 'publishing', claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('status', 'scheduled') // the atomic guard — 0 rows back means another worker already claimed it
      .select(SELECT_COLUMNS)
      .maybeSingle();
    if (error) {
      console.error('[social-scheduling/store] claim failed for', candidate.id, error.message);
      continue;
    }
    if (data) claimed.push(rowToDto(data as Row));
  }
  return claimed;
}

async function reclaimStuckPublishingPosts(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const staleThreshold = new Date(Date.now() - STUCK_PUBLISHING_TIMEOUT_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from('generated_content')
    .update({
      status: 'failed',
      error_code: 'stuck_unknown_outcome',
      error_message: 'Publishing did not complete within the expected time. Meta may or may not have created the post — verify manually on the Page before retrying.',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'publishing')
    .lt('claimed_at', staleThreshold)
    .select('id');
  if (error) {
    console.error('[social-scheduling/store] reclaim-stuck query failed:', error.message);
    return;
  }
  for (const row of (data as Array<{ id: string }>) ?? []) {
    console.warn('[social-scheduling/store] reclaimed stuck publishing post as unknown-outcome failure:', { id: row.id });
  }
}

export async function markPublished(id: string, externalPostId: string, externalPermalink: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('generated_content')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      external_post_id: externalPostId,
      external_permalink: externalPermalink,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'publishing'); // only the worker/route that actually holds the claim can complete it
  if (error) throw new Error(`generated_content mark-published failed: ${error.message}`);
}

// forceTerminal=true is used by the explicit /publish-now and /retry paths,
// where there is no "wait for backoff, try again automatically" concept —
// a manual action either succeeds or is reported as failed outright.
export async function markFailed(id: string, currentAttemptCount: number, failure: ClassifiedFailure, forceTerminal = false): Promise<void> {
  const supabase = getSupabaseAdmin();
  const nextAttemptCount = currentAttemptCount + 1;
  const exhausted = nextAttemptCount >= MAX_PUBLISH_ATTEMPTS;

  if (!forceTerminal && failure.class === 'transient' && !exhausted) {
    const backoffMinutes = RETRY_BACKOFF_MINUTES[Math.min(nextAttemptCount - 1, RETRY_BACKOFF_MINUTES.length - 1)];
    const { error } = await supabase
      .from('generated_content')
      .update({
        status: 'scheduled', // back in the worker's due-query pool, gated by next_retry_at
        attempt_count: nextAttemptCount,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
        error_code: failure.code,
        error_message: failure.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'publishing');
    if (error) throw new Error(`generated_content schedule-retry failed: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from('generated_content')
    .update({
      status: 'failed',
      attempt_count: nextAttemptCount,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: null,
      error_code: failure.code,
      error_message: failure.message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'publishing');
  if (error) throw new Error(`generated_content mark-failed failed: ${error.message}`);
}

// Explicit user-initiated retry — only valid from 'failed'. A fresh start:
// resets the attempt budget and fires immediately (scheduled_at = now())
// rather than waiting for whatever backoff/original schedule applied
// before.
export async function retryFailedPost(id: string): Promise<ScheduledPostDto> {
  const current = await getScheduledPostById(id);
  if (!current) throw new ScheduledPostNotFoundError(id);
  if (current.status !== 'failed') throw new NotEditableError(current.status);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('generated_content')
    .update({
      status: 'scheduled',
      scheduled_at: new Date().toISOString(),
      attempt_count: 0,
      next_retry_at: null,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'failed')
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`generated_content retry failed: ${error.message}`);
  if (!data) throw new NotEditableError(current.status); // raced — no longer 'failed'
  return rowToDto(data as Row);
}

// Used by /publish-now — claims regardless of scheduled_at (an explicit,
// immediate action), but still only from a state where publishing makes
// sense, and still via the same atomic conditional-UPDATE claim pattern.
export async function claimForImmediatePublish(id: string): Promise<ScheduledPostDto | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('generated_content')
    .update({ status: 'publishing', claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['scheduled', 'failed'])
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`generated_content immediate-claim failed: ${error.message}`);
  return data ? rowToDto(data as Row) : null;
}
