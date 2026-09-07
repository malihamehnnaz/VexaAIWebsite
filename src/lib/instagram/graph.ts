// Instagram Graph API client. Confirmed against Meta's current docs
// (2026-09-07): webhook object is "instagram" (not "page"); sending a DM is
// POST /me/messages with the same {recipient:{id},message:{text}} shape as
// Messenger's Send API (same Page Access Token handles both — Meta routes by
// recipient platform); comment replies use POST /{comment-id}/replies
// (Instagram's edge name, distinct from Facebook's /{comment-id}/comments).
// Account-level Insights metric/parameter requirements (metric_type=
// total_value etc.) are less certain from docs alone — implemented with
// best-current-knowledge and intended to be corrected against the real
// connected account's actual Meta error responses (see the audit report).
//
// Reuses the same Graph API version / Page Access Token resolution as
// Messenger and Facebook Comments (src/lib/meta/config.ts) — no separate
// token system for Instagram.

import { getGraphApiVersion } from '@/lib/meta/config';
import { resolveInstagramAccessToken, IG_CONNECTED_PAGE_ID } from '@/lib/instagram/config';

const GRAPH_API_BASE = 'https://graph.facebook.com';

export class InstagramGraphError extends Error {
  constructor(message: string, public readonly status: number, public readonly metaCode?: number, public readonly cause?: unknown) {
    super(message);
    this.name = 'InstagramGraphError';
  }
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
}

interface GraphPaging {
  cursors?: { after?: string; before?: string };
  next?: string;
  previous?: string;
}

function requireToken(): string {
  const token = resolveInstagramAccessToken();
  if (!token) throw new InstagramGraphError('No Page Access Token configured for the connected Instagram account', 0);
  return token;
}

async function igGet<T>(path: string, params: Record<string, string>): Promise<T & { paging?: GraphPaging }> {
  const token = requireToken();
  const url = new URL(`${GRAPH_API_BASE}/${getGraphApiVersion()}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    // Never log the URL — it contains the access token as a query param.
    throw new InstagramGraphError('Network error calling Instagram Graph API', 0, undefined, err);
  }

  const payload = await response.json().catch(() => null) as (T & GraphErrorBody & { paging?: GraphPaging }) | null;

  if (!response.ok || !payload || payload.error) {
    console.error('[instagram-graph] request failed:', { path, status: response.status, code: payload?.error?.code, subcode: payload?.error?.error_subcode, type: payload?.error?.type, message: payload?.error?.message });
    throw new InstagramGraphError(payload?.error?.message || `Instagram Graph API returned HTTP ${response.status}`, response.status, payload?.error?.code);
  }

  return payload;
}

async function igPostForm<T>(path: string, form: Record<string, string>): Promise<T> {
  const token = requireToken();
  const url = `${GRAPH_API_BASE}/${getGraphApiVersion()}${path}`;
  const body = new URLSearchParams({ ...form, access_token: token });

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  } catch (err) {
    throw new InstagramGraphError('Network error calling Instagram Graph API', 0, undefined, err);
  }

  const payload = await response.json().catch(() => null) as (T & GraphErrorBody) | null;
  if (!response.ok || !payload || payload.error) {
    console.error('[instagram-graph] POST failed:', { path, status: response.status, code: payload?.error?.code, type: payload?.error?.type, message: payload?.error?.message });
    throw new InstagramGraphError(payload?.error?.message || `Instagram Graph API returned HTTP ${response.status}`, response.status, payload?.error?.code);
  }
  return payload;
}

async function igPostJson<T>(path: string, body: unknown): Promise<T> {
  const token = requireToken();
  const url = `${GRAPH_API_BASE}/${getGraphApiVersion()}${path}?access_token=${encodeURIComponent(token)}`;

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (err) {
    throw new InstagramGraphError('Network error calling Instagram Graph API', 0, undefined, err);
  }

  const payload = await response.json().catch(() => null) as (T & GraphErrorBody) | null;
  if (!response.ok || !payload || payload.error) {
    console.error('[instagram-graph] POST failed:', { path, status: response.status, code: payload?.error?.code, type: payload?.error?.type, message: payload?.error?.message });
    throw new InstagramGraphError(payload?.error?.message || `Instagram Graph API returned HTTP ${response.status}`, response.status, payload?.error?.code);
  }
  return payload;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: string | null;
}

// ── Account identity + follower count ────────────────────────────────────────
// follower_count is a FIELD on the IG user node, not an Insights metric.

export interface AccountFields {
  id: string;
  username?: string;
  name?: string;
  followers_count?: number;
  profile_picture_url?: string;
}

export async function getAccountFields(igUserId: string): Promise<AccountFields> {
  return igGet<AccountFields>(`/${encodeURIComponent(igUserId)}`, { fields: 'id,username,name,followers_count,profile_picture_url' });
}

// ── Account-level Insights ───────────────────────────────────────────────────

export interface InsightValue {
  name: string;
  value: number | null;
}

// Requests one metric at a time when uncertain about compatibility — Meta
// returns a per-metric error for an unsupported/incompatible combination
// rather than failing the whole batch, so callers can still get partial
// results instead of nothing. metricType is 'total_value' for metrics that
// require it (reach, accounts_engaged, total_interactions, likes, comments,
// shares, saves, replies, profile_links_taps, website_clicks, in the current
// API); left undefined for metrics that use the classic time-series shape.
export async function getAccountInsight(
  igUserId: string,
  metric: string,
  since: string,
  until: string,
  metricType?: 'total_value'
): Promise<InsightValue> {
  const params: Record<string, string> = { metric, period: 'day', since, until };
  if (metricType) params.metric_type = metricType;

  try {
    const payload = await igGet<{ data?: Array<{ name?: string; total_value?: { value?: number }; values?: Array<{ value?: number }> }> }>(`/${encodeURIComponent(igUserId)}/insights`, params);
    const row = payload.data?.[0];
    if (!row) return { name: metric, value: null };

    if (row.total_value?.value != null) return { name: metric, value: row.total_value.value };
    if (row.values?.length) {
      // Time-series shape: sum the daily values for a period total.
      const sum = row.values.reduce((acc, v) => acc + (v.value ?? 0), 0);
      return { name: metric, value: sum };
    }
    return { name: metric, value: null };
  } catch (err) {
    console.error(`[instagram-graph] insight "${metric}" unavailable:`, err instanceof Error ? err.message : err);
    return { name: metric, value: null }; // never fabricate — unavailable metric is null, not 0
  }
}

// ── Media (posts) ────────────────────────────────────────────────────────────

export interface MediaFields {
  id: string;
  caption?: string;
  media_type?: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type?: string; // FEED | REELS | STORY
  timestamp?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
}

const MEDIA_FIELDS = 'id,caption,media_type,media_product_type,timestamp,permalink,media_url,thumbnail_url,like_count,comments_count';

export async function listMedia(igUserId: string, after?: string, limit = 25): Promise<PagedResult<MediaFields>> {
  const params: Record<string, string> = { fields: MEDIA_FIELDS, limit: String(limit) };
  if (after) params.after = after;
  const payload = await igGet<{ data?: MediaFields[] }>(`/${encodeURIComponent(igUserId)}/media`, params);
  return { items: payload.data ?? [], nextCursor: payload.paging?.cursors?.after ?? null };
}

export async function getMedia(mediaId: string): Promise<MediaFields> {
  return igGet<MediaFields>(`/${encodeURIComponent(mediaId)}`, { fields: MEDIA_FIELDS });
}

// Per-media metrics — availability differs by media_product_type, so this
// requests metrics individually (like getAccountInsight) and returns null
// for whichever don't apply to this specific post, rather than failing
// the whole call.
const MEDIA_METRICS = ['views', 'reach', 'likes', 'comments', 'shares', 'saved', 'total_interactions'];

export async function getMediaInsights(mediaId: string): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  for (const metric of MEDIA_METRICS) {
    try {
      const payload = await igGet<{ data?: Array<{ name?: string; values?: Array<{ value?: number }>; total_value?: { value?: number } }> }>(`/${encodeURIComponent(mediaId)}/insights`, { metric });
      const row = payload.data?.[0];
      result[metric] = row?.total_value?.value ?? row?.values?.[0]?.value ?? null;
    } catch {
      result[metric] = null; // not applicable to this media_product_type, or otherwise unavailable
    }
  }
  return result;
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface CommentFields {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
  from?: { id?: string; username?: string };
  parent_id?: string;
  like_count?: number;
}

export async function listMediaComments(mediaId: string, after?: string, limit = 50): Promise<PagedResult<CommentFields>> {
  const params: Record<string, string> = { fields: 'id,text,timestamp,username,parent_id,like_count', limit: String(limit) };
  if (after) params.after = after;
  const payload = await igGet<{ data?: CommentFields[] }>(`/${encodeURIComponent(mediaId)}/comments`, params);
  return { items: payload.data ?? [], nextCursor: payload.paging?.cursors?.after ?? null };
}

// Instagram's reply edge is /{comment-id}/replies — distinct from Facebook's
// /{comment-id}/comments.
export async function postInstagramCommentReply(commentId: string, message: string): Promise<{ replyCommentId: string }> {
  const payload = await igPostForm<{ id?: string }>(`/${encodeURIComponent(commentId)}/replies`, { message });
  if (!payload.id) throw new InstagramGraphError('Instagram Graph API did not return a new comment id', 0);
  return { replyCommentId: payload.id };
}

// ── Direct Messages ───────────────────────────────────────────────────────────
// Conversations are Page-scoped (platform=instagram filters to IG threads),
// same node family as Facebook Page conversations.

export interface ConversationSummary {
  id: string;
  updated_time?: string;
  participants?: { data?: Array<{ id?: string; username?: string }> };
}

export async function listInstagramConversations(after?: string, limit = 25): Promise<PagedResult<ConversationSummary>> {
  const params: Record<string, string> = { platform: 'instagram', fields: 'id,updated_time,participants', limit: String(limit) };
  if (after) params.after = after;
  const payload = await igGet<{ data?: ConversationSummary[] }>(`/${encodeURIComponent(IG_CONNECTED_PAGE_ID)}/conversations`, params);
  return { items: payload.data ?? [], nextCursor: payload.paging?.cursors?.after ?? null };
}

export interface DirectMessage {
  id: string;
  created_time?: string;
  from?: { id?: string; username?: string };
  to?: { data?: Array<{ id?: string; username?: string }> };
  message?: string;
}

export async function getConversationMessages(conversationId: string, after?: string, limit = 25): Promise<PagedResult<DirectMessage>> {
  const params: Record<string, string> = { fields: 'id,created_time,from,to,message', limit: String(limit) };
  if (after) params.after = after;
  const payload = await igGet<{ data?: DirectMessage[] }>(`/${encodeURIComponent(conversationId)}/messages`, params);
  return { items: payload.data ?? [], nextCursor: payload.paging?.cursors?.after ?? null };
}

// Confirmed against Meta's current docs: same /me/messages Send API as
// Messenger, same Page Access Token — Meta routes to Instagram based on the
// recipient's IGSID.
export async function sendInstagramMessage(recipientId: string, text: string): Promise<{ metaMessageId: string | null }> {
  const payload = await igPostJson<{ recipient_id?: string; message_id?: string }>('/me/messages', {
    recipient: { id: recipientId },
    message: { text },
  });
  return { metaMessageId: payload.message_id ?? null };
}
