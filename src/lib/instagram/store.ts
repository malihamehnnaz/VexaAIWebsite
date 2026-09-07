// Persistence for Instagram data, backed by the project's existing Supabase
// Postgres database (instagram_* tables in supabase_schema.sql). Mirrors the
// same conventions already established for Facebook Comments
// (src/lib/facebook/store.ts): select-then-branch upserts so a re-sync or
// duplicate webhook delivery never resets a status field, partial-update
// semantics for placeholder rows created from a webhook event with limited
// data.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/sanitize';
import { IG_BUSINESS_ACCOUNT_ID, IG_CONNECTED_PAGE_ID } from '@/lib/instagram/config';

const MAX_TEXT_CHARS = 5000;

export type CommentStatus = 'new' | 'read' | 'replied';

// ── Account ───────────────────────────────────────────────────────────────────

export interface AccountRecord {
  platformAccountId: string;
  username: string | null;
  name: string | null;
  connectedPageId: string;
  followersCount: number | null;
  status: string;
  lastSyncedAt: string | null;
}

export async function upsertAccount(input: { username?: string | null; name?: string | null; followersCount?: number | null }): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('instagram_accounts').upsert(
    {
      platform_account_id: IG_BUSINESS_ACCOUNT_ID,
      username: input.username ?? null,
      name: input.name ?? null,
      connected_page_id: IG_CONNECTED_PAGE_ID,
      followers_count: input.followersCount ?? null,
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'platform_account_id' }
  );
  if (error) throw new Error(`instagram_accounts upsert failed: ${error.message}`);
}

export async function getAccount(): Promise<AccountRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('platform_account_id, username, name, connected_page_id, followers_count, status, last_synced_at')
    .eq('platform_account_id', IG_BUSINESS_ACCOUNT_ID)
    .maybeSingle();
  if (error) throw new Error(`instagram_accounts lookup failed: ${error.message}`);
  if (!data) return null;
  return {
    platformAccountId: data.platform_account_id,
    username: data.username,
    name: data.name,
    connectedPageId: data.connected_page_id,
    followersCount: data.followers_count,
    status: data.status,
    lastSyncedAt: data.last_synced_at,
  };
}

// ── Media ─────────────────────────────────────────────────────────────────────

export interface UpsertMediaInput {
  mediaId: string;
  caption?: string | null;
  mediaType?: string | null;
  mediaProductType?: string | null;
  timestamp?: string | null;
  permalink?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MediaSummary {
  mediaId: string;
  caption: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  timestamp: string | null;
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
}

export async function upsertMedia(input: UpsertMediaInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from('instagram_media')
    .select('id')
    .eq('media_id', input.mediaId)
    .maybeSingle();
  if (selectError) throw new Error(`instagram_media lookup failed: ${selectError.message}`);

  const patch: Record<string, unknown> = {};
  if (input.caption !== undefined) patch.caption = input.caption ? sanitizeText(input.caption, MAX_TEXT_CHARS) : null;
  if (input.mediaType !== undefined) patch.media_type = input.mediaType;
  if (input.mediaProductType !== undefined) patch.media_product_type = input.mediaProductType;
  if (input.timestamp !== undefined) patch.timestamp = input.timestamp;
  if (input.permalink !== undefined) patch.permalink = input.permalink;
  if (input.mediaUrl !== undefined) patch.media_url = input.mediaUrl;
  if (input.thumbnailUrl !== undefined) patch.thumbnail_url = input.thumbnailUrl;
  if (input.metadata !== undefined) patch.metadata = input.metadata;

  if (existing) {
    if (Object.keys(patch).length === 0) return;
    patch.last_synced_at = new Date().toISOString();
    patch.updated_at = new Date().toISOString();
    const { error } = await supabase.from('instagram_media').update(patch).eq('id', existing.id);
    if (error) throw new Error(`instagram_media update failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('instagram_media').insert({
    media_id: input.mediaId,
    account_id: IG_BUSINESS_ACCOUNT_ID,
    ...patch,
    last_synced_at: new Date().toISOString(),
  });
  if (error) throw new Error(`instagram_media insert failed: ${error.message}`);
}

export async function listMediaSummaries(limit = 25, cursorOffset = 0): Promise<{ items: MediaSummary[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const { data, error, count } = await supabase
    .from('instagram_media')
    .select('media_id, caption, media_type, media_product_type, timestamp, permalink, media_url, thumbnail_url', { count: 'exact' })
    .eq('account_id', IG_BUSINESS_ACCOUNT_ID)
    .order('timestamp', { ascending: false, nullsFirst: false })
    .range(cursorOffset, cursorOffset + limit - 1);
  if (error) throw new Error(`instagram_media list failed: ${error.message}`);

  return {
    items: (data ?? []).map(row => ({
      mediaId: row.media_id,
      caption: row.caption,
      mediaType: row.media_type,
      mediaProductType: row.media_product_type,
      timestamp: row.timestamp,
      permalink: row.permalink,
      mediaUrl: row.media_url,
      thumbnailUrl: row.thumbnail_url,
    })),
    total: count ?? 0,
  };
}

export async function getMediaSummary(mediaId: string): Promise<MediaSummary | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('instagram_media')
    .select('media_id, caption, media_type, media_product_type, timestamp, permalink, media_url, thumbnail_url')
    .eq('account_id', IG_BUSINESS_ACCOUNT_ID)
    .eq('media_id', mediaId)
    .maybeSingle();
  if (error) throw new Error(`instagram_media lookup failed: ${error.message}`);
  if (!data) return null;
  return {
    mediaId: data.media_id,
    caption: data.caption,
    mediaType: data.media_type,
    mediaProductType: data.media_product_type,
    timestamp: data.timestamp,
    permalink: data.permalink,
    mediaUrl: data.media_url,
    thumbnailUrl: data.thumbnail_url,
  };
}

// ── Insights (metric history) ────────────────────────────────────────────────

export interface RecordInsightInput {
  mediaId?: string | null; // null = account-level metric
  metric: string;
  value: number | null;
  period: string;
  startTime: string;
  endTime: string;
}

export async function recordInsight(input: RecordInsightInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('instagram_insights').insert({
    account_id: IG_BUSINESS_ACCOUNT_ID,
    media_id: input.mediaId ?? null,
    metric: input.metric,
    value: input.value,
    period: input.period,
    start_time: input.startTime,
    end_time: input.endTime,
    fetched_at: new Date().toISOString(),
  });
  if (error) throw new Error(`instagram_insights insert failed: ${error.message}`);
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface UpsertCommentInput {
  commentId: string;
  mediaId: string;
  parentCommentId: string | null;
  userId: string | null;
  username: string | null;
  text: string | null;
  createdAt: string | null;
}

export interface CommentSummary {
  commentId: string;
  mediaId: string;
  parentCommentId: string | null;
  userId: string | null;
  username: string | null;
  text: string | null;
  status: CommentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  media: { mediaId: string; permalink: string | null } | null;
}

export async function upsertComment(input: UpsertCommentInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from('instagram_comments')
    .select('id')
    .eq('comment_id', input.commentId)
    .maybeSingle();
  if (selectError) throw new Error(`instagram_comments lookup failed: ${selectError.message}`);

  const text = input.text ? sanitizeText(input.text, MAX_TEXT_CHARS) : null;

  if (existing) {
    const { error } = await supabase
      .from('instagram_comments')
      .update({ text, username: input.username, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(`instagram_comments update failed: ${error.message}`);
    return;
  }

  const initialStatus: CommentStatus = input.userId === IG_BUSINESS_ACCOUNT_ID ? 'replied' : 'new';

  const { error } = await supabase.from('instagram_comments').insert({
    comment_id: input.commentId,
    media_id: input.mediaId,
    account_id: IG_BUSINESS_ACCOUNT_ID,
    parent_comment_id: input.parentCommentId,
    user_id: input.userId,
    username: input.username,
    text,
    status: initialStatus,
    created_at_meta: input.createdAt,
  });
  if (error) throw new Error(`instagram_comments insert failed: ${error.message}`);
}

export async function recordOwnCommentReply(input: { mediaId: string; parentCommentId: string; replyCommentId: string; message: string }): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: insertError } = await supabase.from('instagram_comments').upsert(
    {
      comment_id: input.replyCommentId,
      media_id: input.mediaId,
      account_id: IG_BUSINESS_ACCOUNT_ID,
      parent_comment_id: input.parentCommentId,
      user_id: IG_BUSINESS_ACCOUNT_ID,
      username: null,
      text: sanitizeText(input.message, MAX_TEXT_CHARS),
      status: 'replied',
      created_at_meta: now,
    },
    { onConflict: 'comment_id' }
  );
  if (insertError) throw new Error(`instagram_comments own-reply insert failed: ${insertError.message}`);

  const { error: updateError } = await supabase
    .from('instagram_comments')
    .update({ status: 'replied', updated_at: now })
    .eq('comment_id', input.parentCommentId);
  if (updateError) throw new Error(`instagram_comments status update failed: ${updateError.message}`);
}

export async function markCommentRead(commentId: string): Promise<CommentStatus | null> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from('instagram_comments')
    .select('status')
    .eq('comment_id', commentId)
    .maybeSingle();
  if (selectError) throw new Error(`instagram_comments lookup failed: ${selectError.message}`);
  if (!existing) return null;
  if (existing.status !== 'new') return existing.status as CommentStatus;

  const { error } = await supabase
    .from('instagram_comments')
    .update({ status: 'read', updated_at: new Date().toISOString() })
    .eq('comment_id', commentId);
  if (error) throw new Error(`instagram_comments mark-read failed: ${error.message}`);
  return 'read';
}

export async function getCommentByCommentId(commentId: string): Promise<{ mediaId: string; status: CommentStatus } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('instagram_comments')
    .select('media_id, status')
    .eq('comment_id', commentId)
    .maybeSingle();
  if (error) throw new Error(`instagram_comments lookup failed: ${error.message}`);
  if (!data) return null;
  return { mediaId: data.media_id, status: data.status as CommentStatus };
}

export interface ListCommentsFilters {
  mediaId?: string;
  status?: CommentStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
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

export async function listComments(filters: ListCommentsFilters): Promise<{ comments: CommentSummary[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = decodeOffsetCursor(filters.cursor);

  let query = supabase
    .from('instagram_comments')
    .select('comment_id, media_id, parent_comment_id, user_id, username, text, status, created_at_meta, updated_at')
    .eq('account_id', IG_BUSINESS_ACCOUNT_ID)
    .order('created_at_meta', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.mediaId) query = query.eq('media_id', filters.mediaId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) query = query.ilike('text', `%${filters.search}%`);
  if (filters.dateFrom) query = query.gte('created_at_meta', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at_meta', filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`instagram_comments query failed: ${error.message}`);
  const rows = data ?? [];

  const mediaIds = [...new Set(rows.map(r => r.media_id))];
  const mediaMap = new Map<string, { mediaId: string; permalink: string | null }>();
  if (mediaIds.length) {
    const { data: mediaRows, error: mediaError } = await supabase
      .from('instagram_media')
      .select('media_id, permalink')
      .in('media_id', mediaIds);
    if (mediaError) throw new Error(`instagram_media lookup failed: ${mediaError.message}`);
    for (const m of mediaRows ?? []) mediaMap.set(m.media_id, { mediaId: m.media_id, permalink: m.permalink });
  }

  const comments: CommentSummary[] = rows.map(row => ({
    commentId: row.comment_id,
    mediaId: row.media_id,
    parentCommentId: row.parent_comment_id,
    userId: row.user_id,
    username: row.username,
    text: row.text,
    status: row.status,
    createdAt: row.created_at_meta,
    updatedAt: row.updated_at,
    media: mediaMap.get(row.media_id) ?? null,
  }));

  return { comments, nextCursor: rows.length === limit ? encodeOffsetCursor(offset + limit) : null };
}

// ── Conversations & messages ──────────────────────────────────────────────────

export interface UpsertConversationInput {
  conversationId: string;
  participantId: string | null;
  participantUsername: string | null;
}

export async function upsertConversation(input: UpsertConversationInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from('instagram_conversations')
    .select('id')
    .eq('conversation_id', input.conversationId)
    .maybeSingle();
  if (selectError) throw new Error(`instagram_conversations lookup failed: ${selectError.message}`);

  if (existing) {
    if (!input.participantId && !input.participantUsername) return;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.participantId) patch.participant_id = input.participantId;
    if (input.participantUsername) patch.participant_username = input.participantUsername;
    const { error } = await supabase.from('instagram_conversations').update(patch).eq('id', existing.id);
    if (error) throw new Error(`instagram_conversations update failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('instagram_conversations').insert({
    conversation_id: input.conversationId,
    account_id: IG_BUSINESS_ACCOUNT_ID,
    participant_id: input.participantId,
    participant_username: input.participantUsername,
    unread: true,
  });
  if (error) throw new Error(`instagram_conversations insert failed: ${error.message}`);
}

async function touchConversation(conversationId: string, lastMessageAt: string, unread: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('instagram_conversations')
    .update({ last_message_at: lastMessageAt, unread, updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId);
  if (error) throw new Error(`instagram_conversations touch failed: ${error.message}`);
}

export interface UpsertMessageInput {
  messageId: string;
  conversationId: string;
  senderId: string | null;
  recipientId: string | null;
  message: string | null;
  timestamp: string | null;
  direction: 'inbound' | 'outbound';
  attachments?: Record<string, unknown> | null;
}

export async function upsertMessage(input: UpsertMessageInput): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from('instagram_messages')
    .select('id')
    .eq('message_id', input.messageId)
    .maybeSingle();
  if (selectError) throw new Error(`instagram_messages lookup failed: ${selectError.message}`);
  if (existing) return false; // duplicate delivery — nothing new written

  const { error } = await supabase.from('instagram_messages').insert({
    message_id: input.messageId,
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    recipient_id: input.recipientId,
    message: input.message ? sanitizeText(input.message, MAX_TEXT_CHARS) : null,
    occurred_at: input.timestamp,
    direction: input.direction,
    attachments: input.attachments ?? null,
    status: input.direction === 'outbound' ? 'sent' : 'received',
  });
  if (error) throw new Error(`instagram_messages insert failed: ${error.message}`);

  await touchConversation(input.conversationId, input.timestamp ?? new Date().toISOString(), input.direction === 'inbound');
  return true;
}

export interface ConversationSummary {
  conversationId: string;
  participantId: string | null;
  participantUsername: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  unread: boolean;
  updatedAt: string | null;
}

export async function listConversations(filters: { unreadOnly?: boolean; search?: string; limit?: number; cursor?: string }): Promise<{ conversations: ConversationSummary[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = decodeOffsetCursor(filters.cursor);

  let query = supabase
    .from('instagram_conversations')
    .select('conversation_id, participant_id, participant_username, last_message_at, unread, updated_at')
    .eq('account_id', IG_BUSINESS_ACCOUNT_ID)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (filters.unreadOnly) query = query.eq('unread', true);
  if (filters.search) query = query.ilike('participant_username', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(`instagram_conversations query failed: ${error.message}`);
  const rows = data ?? [];

  const conversationIds = rows.map(r => r.conversation_id);
  const lastMessages = new Map<string, string | null>();
  if (conversationIds.length) {
    const { data: msgRows, error: msgError } = await supabase
      .from('instagram_messages')
      .select('conversation_id, message, occurred_at')
      .in('conversation_id', conversationIds)
      .order('occurred_at', { ascending: false });
    if (msgError) throw new Error(`instagram_messages lookup failed: ${msgError.message}`);
    for (const m of msgRows ?? []) {
      if (!lastMessages.has(m.conversation_id)) lastMessages.set(m.conversation_id, m.message);
    }
  }

  return {
    conversations: rows.map(row => ({
      conversationId: row.conversation_id,
      participantId: row.participant_id,
      participantUsername: row.participant_username,
      lastMessageAt: row.last_message_at,
      lastMessageText: lastMessages.get(row.conversation_id) ?? null,
      unread: row.unread,
      updatedAt: row.updated_at,
    })),
    nextCursor: rows.length === limit ? encodeOffsetCursor(offset + limit) : null,
  };
}

export async function getConversationById(conversationId: string): Promise<{ conversationId: string; participantId: string | null } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('instagram_conversations')
    .select('conversation_id, participant_id')
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (error) throw new Error(`instagram_conversations lookup failed: ${error.message}`);
  if (!data) return null;
  return { conversationId: data.conversation_id, participantId: data.participant_id };
}

export interface MessageSummary {
  messageId: string;
  conversationId: string;
  senderId: string | null;
  recipientId: string | null;
  message: string | null;
  timestamp: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
}

export async function listConversationMessages(conversationId: string, limit = 50): Promise<MessageSummary[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('instagram_messages')
    .select('message_id, conversation_id, sender_id, recipient_id, message, occurred_at, direction, status')
    .eq('conversation_id', conversationId)
    .order('occurred_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`instagram_messages list failed: ${error.message}`);

  return (data ?? []).map(row => ({
    messageId: row.message_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    message: row.message,
    timestamp: row.occurred_at,
    direction: row.direction,
    status: row.status,
  }));
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('instagram_conversations').update({ unread: false, updated_at: new Date().toISOString() }).eq('conversation_id', conversationId);
  if (error) throw new Error(`instagram_conversations mark-read failed: ${error.message}`);
}
