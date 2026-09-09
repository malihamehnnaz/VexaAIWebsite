// Persistence for Facebook Page posts/comments, backed by the project's
// existing Supabase Postgres database (facebook_posts / facebook_comments
// tables in supabase_schema.sql). Kept separate from graph.ts (Meta API
// calls) and sync.ts (orchestration) so each concern stays isolated —
// mirrors the pattern already used for Messenger (messenger-store.ts).

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/sanitize';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

const MAX_TEXT_CHARS = 5000; // Facebook posts/comments can run long; generous bound, not Messenger's 2000

export type CommentStatus = 'new' | 'read' | 'replied';

export interface PostSummary {
  postId: string;
  message: string | null;
  permalink: string | null;
  createdAt: string | null;
  commentCount: number;
}

export interface CommentSummary {
  commentId: string;
  postId: string;
  parentCommentId: string | null;
  commenterId: string | null;
  commenterName: string | null;
  message: string | null;
  status: CommentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  replyCount: number;
  post: { postId: string; message: string | null; permalink: string | null } | null;
}

interface PostRow {
  post_id: string;
  message: string | null;
  permalink: string | null;
  created_at_meta: string | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  comment_id: string;
  parent_comment_id: string | null;
  commenter_id: string | null;
  commenter_name: string | null;
  message: string | null;
  status: CommentStatus;
  created_at_meta: string | null;
  updated_at_meta: string | null;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface UpsertPostInput {
  postId: string;
  message?: string | null;
  permalink?: string | null;
  createdAtMeta?: string | null; // ISO timestamp
  metadata?: Record<string, unknown> | null;
}

// Partial-update semantics: a field is only touched if the caller actually
// provided it (not `undefined`). This matters because the webhook feed
// handler sometimes only knows a bare postId (to satisfy the comments FK)
// and must NOT blank out message/permalink/created_at_meta that a full
// Graph API sync already filled in — whereas sync.ts always has complete
// data from a real GET and is fine overwriting.
export async function upsertPost(input: UpsertPostInput): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from('facebook_posts')
    .select('id')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('post_id', input.postId)
    .maybeSingle();
  if (selectError) throw new Error(`facebook_posts lookup failed: ${selectError.message}`);

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (input.message !== undefined) patch.message = input.message ? sanitizeText(input.message, MAX_TEXT_CHARS) : null;
    if (input.permalink !== undefined) patch.permalink = input.permalink;
    if (input.createdAtMeta !== undefined) patch.created_at_meta = input.createdAtMeta;
    if (input.metadata !== undefined) patch.metadata = input.metadata;

    if (Object.keys(patch).length === 0) return; // nothing new to write

    patch.updated_at = new Date().toISOString();
    const { error } = await supabase.from('facebook_posts').update(patch).eq('id', existing.id);
    if (error) throw new Error(`facebook_posts update failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('facebook_posts').insert({
    page_id: GP_CAFE_PAGE_ID,
    post_id: input.postId,
    message: input.message ? sanitizeText(input.message, MAX_TEXT_CHARS) : null,
    permalink: input.permalink ?? null,
    created_at_meta: input.createdAtMeta ?? null,
    metadata: input.metadata ?? null,
  });
  if (error) throw new Error(`facebook_posts insert failed: ${error.message}`);
}

export async function listPosts(limit = 50): Promise<PostSummary[]> {
  const supabase = getSupabaseAdmin();
  const { data: posts, error } = await supabase
    .from('facebook_posts')
    .select('post_id, message, permalink, created_at_meta')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .order('created_at_meta', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`facebook_posts list failed: ${error.message}`);

  const counts = await getCommentCountsByPost();

  return (posts as PostRow[] ?? []).map(p => ({
    postId: p.post_id,
    message: p.message,
    permalink: p.permalink,
    createdAt: p.created_at_meta,
    commentCount: counts.get(p.post_id) ?? 0,
  }));
}

async function getCommentCountsByPost(): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('facebook_comments')
    .select('post_id')
    .eq('page_id', GP_CAFE_PAGE_ID);
  if (error) throw new Error(`facebook_comments count failed: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of (data as Array<{ post_id: string }> ?? [])) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

// ── Comments: ingest (webhook + sync) ────────────────────────────────────────

export interface UpsertCommentInput {
  postId: string;
  commentId: string;
  parentCommentId: string | null; // null = top-level (parent is the post itself)
  commenterId: string | null;
  commenterName: string | null;
  message: string | null;
  createdAtMeta: string | null;
  metadata?: Record<string, unknown> | null;
}

// Idempotent: a duplicate webhook delivery or a re-sync of the same comment
// updates content but never creates a second row (unique on page_id+comment_id)
// and — critically — never resets status. A brand-new comment starts as
// 'new', except one posted by the Page itself (our own reply, possibly sent
// via Facebook's own UI before Vexa ever saw it), which starts as 'replied'
// since it needs no action.
export async function upsertComment(input: UpsertCommentInput): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from('facebook_comments')
    .select('id')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('comment_id', input.commentId)
    .maybeSingle();
  if (selectError) throw new Error(`facebook_comments lookup failed: ${selectError.message}`);

  const message = input.message ? sanitizeText(input.message, MAX_TEXT_CHARS) : null;

  if (existing) {
    const { error } = await supabase
      .from('facebook_comments')
      .update({
        message,
        commenter_name: input.commenterName,
        updated_at_meta: new Date().toISOString(),
        metadata: input.metadata ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw new Error(`facebook_comments update failed: ${error.message}`);
    return;
  }

  const initialStatus: CommentStatus = input.commenterId === GP_CAFE_PAGE_ID ? 'replied' : 'new';

  const { error } = await supabase.from('facebook_comments').insert({
    page_id: GP_CAFE_PAGE_ID,
    post_id: input.postId,
    comment_id: input.commentId,
    parent_comment_id: input.parentCommentId,
    commenter_id: input.commenterId,
    commenter_name: input.commenterName,
    message,
    status: initialStatus,
    created_at_meta: input.createdAtMeta,
    updated_at_meta: input.createdAtMeta,
    metadata: input.metadata ?? null,
  });
  if (error) throw new Error(`facebook_comments insert failed: ${error.message}`);
}

// Records a reply Vexa itself just sent through the Send API, and marks the
// comment it replied to as 'replied'. Called only after Meta confirms
// success (see /api/facebook/comments/reply).
export async function recordOwnReply(input: {
  postId: string;
  parentCommentId: string; // the comment being replied to
  replyCommentId: string; // Meta's id for the new reply we just posted
  message: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: insertError } = await supabase
    .from('facebook_comments')
    .upsert(
      {
        page_id: GP_CAFE_PAGE_ID,
        post_id: input.postId,
        comment_id: input.replyCommentId,
        parent_comment_id: input.parentCommentId,
        commenter_id: GP_CAFE_PAGE_ID,
        commenter_name: null,
        message: sanitizeText(input.message, MAX_TEXT_CHARS),
        status: 'replied',
        created_at_meta: now,
        updated_at_meta: now,
      },
      { onConflict: 'page_id,comment_id' }
    );
  if (insertError) throw new Error(`facebook_comments own-reply insert failed: ${insertError.message}`);

  const { error: updateError } = await supabase
    .from('facebook_comments')
    .update({ status: 'replied', updated_at: now })
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('comment_id', input.parentCommentId);
  if (updateError) throw new Error(`facebook_comments status update failed: ${updateError.message}`);
}

// ── Comments: status ──────────────────────────────────────────────────────────

// New → Read only. Never downgrades an already-replied comment, and is a
// no-op (not an error) if the comment is already read/replied — opening a
// comment repeatedly shouldn't do anything after the first time.
export async function markCommentRead(commentId: string): Promise<CommentStatus | null> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from('facebook_comments')
    .select('status')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('comment_id', commentId)
    .maybeSingle();
  if (selectError) throw new Error(`facebook_comments lookup failed: ${selectError.message}`);
  if (!existing) return null;

  if (existing.status !== 'new') return existing.status as CommentStatus;

  const { error } = await supabase
    .from('facebook_comments')
    .update({ status: 'read', updated_at: new Date().toISOString() })
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('comment_id', commentId);
  if (error) throw new Error(`facebook_comments mark-read failed: ${error.message}`);
  return 'read';
}

export async function getCommentByCommentId(commentId: string): Promise<{ postId: string; status: CommentStatus } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('facebook_comments')
    .select('post_id, status')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('comment_id', commentId)
    .maybeSingle();
  if (error) throw new Error(`facebook_comments lookup failed: ${error.message}`);
  if (!data) return null;
  return { postId: data.post_id, status: data.status as CommentStatus };
}

// ── Reads (for the marketing website API) ────────────────────────────────────

export interface ListCommentsFilters {
  status?: CommentStatus;
  postId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  cursor?: string; // base64 offset cursor — simple and sufficient at this data volume
}

export interface ListCommentsResult {
  comments: CommentSummary[];
  nextCursor: string | null;
}

function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  const n = parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export async function listComments(filters: ListCommentsFilters): Promise<ListCommentsResult> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = decodeCursor(filters.cursor);

  let query = supabase
    .from('facebook_comments')
    .select('id, post_id, comment_id, parent_comment_id, commenter_id, commenter_name, message, status, created_at_meta, updated_at_meta')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .order('created_at_meta', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.postId) query = query.eq('post_id', filters.postId);
  if (filters.search) query = query.ilike('message', `%${filters.search}%`);
  if (filters.dateFrom) query = query.gte('created_at_meta', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at_meta', filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`facebook_comments query failed: ${error.message}`);

  const rows = (data as CommentRow[]) ?? [];

  // Attach post preview + reply counts. Small extra queries, acceptable at
  // this data volume/page size (bounded by `limit`).
  const postIds = [...new Set(rows.map(r => r.post_id))];
  const posts = postIds.length ? await getPostsByIds(postIds) : new Map();
  const replyCounts = await getReplyCounts(rows.map(r => r.comment_id));

  const comments: CommentSummary[] = rows.map(row => ({
    commentId: row.comment_id,
    postId: row.post_id,
    parentCommentId: row.parent_comment_id,
    commenterId: row.commenter_id,
    commenterName: row.commenter_name,
    message: row.message,
    status: row.status,
    createdAt: row.created_at_meta,
    updatedAt: row.updated_at_meta,
    replyCount: replyCounts.get(row.comment_id) ?? 0,
    post: posts.get(row.post_id) ?? null,
  }));

  return { comments, nextCursor: rows.length === limit ? encodeCursor(offset + limit) : null };
}

async function getPostsByIds(postIds: string[]): Promise<Map<string, { postId: string; message: string | null; permalink: string | null }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('facebook_posts')
    .select('post_id, message, permalink')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .in('post_id', postIds);
  if (error) throw new Error(`facebook_posts lookup failed: ${error.message}`);

  const map = new Map<string, { postId: string; message: string | null; permalink: string | null }>();
  for (const row of (data as PostRow[] ?? [])) {
    map.set(row.post_id, { postId: row.post_id, message: row.message, permalink: row.permalink });
  }
  return map;
}

async function getReplyCounts(commentIds: string[]): Promise<Map<string, number>> {
  if (!commentIds.length) return new Map();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('facebook_comments')
    .select('parent_comment_id')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .in('parent_comment_id', commentIds);
  if (error) throw new Error(`facebook_comments reply-count failed: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of (data as Array<{ parent_comment_id: string | null }> ?? [])) {
    if (!row.parent_comment_id) continue;
    counts.set(row.parent_comment_id, (counts.get(row.parent_comment_id) ?? 0) + 1);
  }
  return counts;
}

export interface PostDetail {
  post: { postId: string; message: string | null; permalink: string | null; createdAt: string | null } | null;
  comments: CommentSummary[];
}

export async function getPostWithComments(postId: string): Promise<PostDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: postRow, error: postError } = await supabase
    .from('facebook_posts')
    .select('post_id, message, permalink, created_at_meta')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('post_id', postId)
    .maybeSingle();
  if (postError) throw new Error(`facebook_posts lookup failed: ${postError.message}`);
  if (!postRow) return null;

  const { data: commentRows, error: commentsError } = await supabase
    .from('facebook_comments')
    .select('post_id, comment_id, parent_comment_id, commenter_id, commenter_name, message, status, created_at_meta, updated_at_meta')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('post_id', postId)
    .order('created_at_meta', { ascending: true, nullsFirst: true });
  if (commentsError) throw new Error(`facebook_comments lookup failed: ${commentsError.message}`);

  const rows = (commentRows as CommentRow[]) ?? [];
  const replyCounts = await getReplyCounts(rows.map(r => r.comment_id));
  const postPreview = { postId: postRow.post_id, message: postRow.message, permalink: postRow.permalink };

  return {
    post: { ...postPreview, createdAt: postRow.created_at_meta },
    comments: rows.map(row => ({
      commentId: row.comment_id,
      postId: row.post_id,
      parentCommentId: row.parent_comment_id,
      commenterId: row.commenter_id,
      commenterName: row.commenter_name,
      message: row.message,
      status: row.status,
      createdAt: row.created_at_meta,
      updatedAt: row.updated_at_meta,
      replyCount: replyCounts.get(row.comment_id) ?? 0,
      post: postPreview,
    })),
  };
}

// ── Page/Post Insights (history) ─────────────────────────────────────────────
// One row per (page_id, post_id, metric, date) fetch, deduplicated via
// upsert — same shape/purpose as instagram_insights (src/lib/instagram/
// store.ts), except upserted rather than append-only. Populated both
// opportunistically on every real /api/facebook/insights request (see that
// route) AND by the historical backfill service (src/lib/facebook/
// backfill.ts) — this app has no cron/background-sync infrastructure
// anywhere yet (GA4, Search Console, and Instagram all use the same
// request-time-fetch-and-persist model for ongoing/incremental sync), so
// backfill is a deliberately-triggered one-time action on top of that same
// architecture rather than a new scheduling system.
//
// Exclusively organic data — there is no Facebook Ads integration anywhere
// in this codebase, so there is nothing to accidentally mix with.

export interface RecordPageInsightInput {
  pageId: string;
  postId?: string | null; // omit/null for a page-level metric; a real Graph API post id for post-level
  metric: string;
  value: number | null;
  date: string; // YYYY-MM-DD
  graphApiVersion?: string;
}

export async function recordPageInsight(input: RecordPageInsightInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const postId = input.postId ?? '';
  const { error } = await supabase.from('facebook_insights').upsert(
    {
      page_id: input.pageId,
      post_id: postId,
      level: postId ? 'post' : 'page',
      metric: input.metric,
      value: input.value,
      date: input.date,
      graph_api_version: input.graphApiVersion ?? null,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'page_id,post_id,metric,date' }
  );
  if (error) throw new Error(`facebook_insights upsert failed: ${error.message}`);
}
