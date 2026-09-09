// Persistence for Google Business Profile locations/reviews — the local
// store /admin/reviews always reads from (Part 3b: never live from Google).
// Mirrors the select-then-branch upsert convention already used throughout
// this codebase (facebook/store.ts, instagram/store.ts) so a re-sync never
// clobbers a field with worse/missing data.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { VEXA_ADMIN_USER_ID } from '@/lib/google-business/config';
import { mapStarRating, type RawLocation, type RawReview, type LocationDto, type ReviewDto } from '@/lib/google-business/types';

// ── Locations ─────────────────────────────────────────────────────────────────

export async function upsertLocation(accountId: string, location: RawLocation): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('google_business_locations').upsert(
    {
      user_id: VEXA_ADMIN_USER_ID,
      google_account_id: accountId,
      location_id: location.locationId,
      title: location.title,
      address: location.address,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,location_id' }
  );
  if (error) throw new Error(`google_business_locations upsert failed: ${error.message}`);
}

interface LocationRow {
  google_account_id: string;
  location_id: string;
  title: string | null;
  address: unknown | null;
}

export async function listStoredLocations(): Promise<Array<LocationDto & { accountId: string }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_business_locations')
    .select('google_account_id, location_id, title, address')
    .eq('user_id', VEXA_ADMIN_USER_ID);
  if (error) throw new Error(`google_business_locations list failed: ${error.message}`);
  return (data as LocationRow[] ?? []).map(r => ({ accountId: r.google_account_id, locationId: r.location_id, title: r.title, address: r.address }));
}

export async function getStoredAccountIdForLocation(locationId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_business_locations')
    .select('google_account_id')
    .eq('user_id', VEXA_ADMIN_USER_ID)
    .eq('location_id', locationId)
    .maybeSingle();
  if (error || !data) return null;
  return data.google_account_id;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function upsertReview(locationId: string, review: RawReview): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('google_business_reviews').upsert(
    {
      location_id: locationId,
      review_id: review.reviewId,
      reviewer_display_name: review.reviewer.displayName,
      reviewer_photo_url: review.reviewer.profilePhotoUrl,
      reviewer_is_anonymous: review.reviewer.isAnonymous,
      star_rating: mapStarRating(review.starRating),
      comment: review.comment,
      create_time: review.createTime || null,
      update_time: review.updateTime || null,
      reply_comment: review.reply?.comment ?? null,
      reply_update_time: review.reply?.updateTime ?? null,
      reply_state: review.reply?.replyState ?? null,
      policy_violation: review.reply?.policyViolation ?? null,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'location_id,review_id' }
  );
  if (error) throw new Error(`google_business_reviews upsert failed: ${error.message}`);
}

interface ReviewRow {
  location_id: string;
  review_id: string;
  reviewer_display_name: string | null;
  reviewer_photo_url: string | null;
  reviewer_is_anonymous: boolean;
  star_rating: number | null;
  comment: string | null;
  create_time: string | null;
  update_time: string | null;
  reply_comment: string | null;
  reply_update_time: string | null;
  reply_state: string | null;
  policy_violation: unknown | null;
}

function rowToDto(row: ReviewRow): ReviewDto {
  return {
    locationId: row.location_id,
    reviewId: row.review_id,
    reviewer: { displayName: row.reviewer_display_name, profilePhotoUrl: row.reviewer_photo_url, isAnonymous: row.reviewer_is_anonymous },
    starRating: (row.star_rating as ReviewDto['starRating']) ?? null,
    comment: row.comment,
    createdAt: row.create_time,
    updatedAt: row.update_time,
    reply: row.reply_comment
      ? { comment: row.reply_comment, updatedAt: row.reply_update_time, state: row.reply_state, policyViolation: row.policy_violation }
      : null,
  };
}

export interface ListReviewsFilters {
  locationId?: string;
  hasReply?: boolean;
  minRating?: number;
  limit?: number;
  cursor?: string;
}

function decodeOffsetCursor(cursor?: string): number {
  if (!cursor) return 0;
  const n = parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export async function listStoredReviews(filters: ListReviewsFilters): Promise<{ reviews: ReviewDto[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = decodeOffsetCursor(filters.cursor);

  // Reviews are scoped to this tenant's own locations via the FK — filtered
  // through google_business_locations rather than a redundant user_id
  // column on every review row.
  let query = supabase
    .from('google_business_reviews')
    .select('location_id, review_id, reviewer_display_name, reviewer_photo_url, reviewer_is_anonymous, star_rating, comment, create_time, update_time, reply_comment, reply_update_time, reply_state, policy_violation')
    .order('create_time', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.locationId) query = query.eq('location_id', filters.locationId);
  if (filters.hasReply !== undefined) {
    query = filters.hasReply ? query.not('reply_comment', 'is', null) : query.is('reply_comment', null);
  }
  if (filters.minRating !== undefined) query = query.gte('star_rating', filters.minRating);

  const { data, error } = await query;
  if (error) throw new Error(`google_business_reviews query failed: ${error.message}`);
  const rows = (data as ReviewRow[]) ?? [];

  return { reviews: rows.map(rowToDto), nextCursor: rows.length === limit ? encodeOffsetCursor(offset + limit) : null };
}

export async function getStoredReview(locationId: string, reviewId: string): Promise<ReviewDto | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_business_reviews')
    .select('location_id, review_id, reviewer_display_name, reviewer_photo_url, reviewer_is_anonymous, star_rating, comment, create_time, update_time, reply_comment, reply_update_time, reply_state, policy_violation')
    .eq('location_id', locationId)
    .eq('review_id', reviewId)
    .maybeSingle();
  if (error) throw new Error(`google_business_reviews lookup failed: ${error.message}`);
  return data ? rowToDto(data as ReviewRow) : null;
}

// ── Sync state ────────────────────────────────────────────────────────────────

export async function recordSyncOutcome(status: 'success' | 'partial' | 'failed', errorMessage: string | null): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('google_business_sync_state').upsert(
    { user_id: VEXA_ADMIN_USER_ID, last_synced_at: new Date().toISOString(), last_sync_status: status, last_sync_error: errorMessage, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(`google_business_sync_state upsert failed: ${error.message}`);
}

export async function getLastSyncedAt(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_business_sync_state')
    .select('last_synced_at')
    .eq('user_id', VEXA_ADMIN_USER_ID)
    .maybeSingle();
  if (error || !data) return null;
  return data.last_synced_at;
}
