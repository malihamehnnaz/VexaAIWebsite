// Facebook Page posts/comments via the Meta Graph API. Confirmed against
// Meta's current docs (2026-09-05, developers.facebook.com/docs/graph-api/
// reference/v26.0/object/comments): reply endpoint is
// POST /{comment-id}/comments (form-encoded `message` param), listing
// comments supports filter=stream for chronological all-level (including
// replies) comments with standard cursor pagination. Reuses the same
// Graph API version / Page Access Token resolution as Messenger
// (src/lib/meta/config.ts) — no separate token system.

import { getGraphApiVersion, resolvePageAccessToken } from '@/lib/meta/config';

const GRAPH_API_BASE = 'https://graph.facebook.com';

export class FacebookGraphError extends Error {
  constructor(message: string, public readonly status: number, public readonly cause?: unknown) {
    super(message);
    this.name = 'FacebookGraphError';
  }
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; fbtrace_id?: string };
}

interface GraphPaging {
  cursors?: { after?: string; before?: string };
  next?: string;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T & { paging?: GraphPaging }> {
  const url = new URL(`${GRAPH_API_BASE}/${getGraphApiVersion()}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    // Never log the URL — it contains the access token as a query param.
    throw new FacebookGraphError('Network error calling Meta Graph API', 0, err);
  }

  const payload = await response.json().catch(() => null) as (T & GraphErrorBody & { paging?: GraphPaging }) | null;

  if (!response.ok || !payload || payload.error) {
    console.error('[facebook-graph] request failed:', { path, status: response.status, code: payload?.error?.code, type: payload?.error?.type, message: payload?.error?.message });
    throw new FacebookGraphError(payload?.error?.message || `Graph API returned HTTP ${response.status}`, response.status);
  }

  return payload;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface GraphPost {
  id: string;
  message?: string;
  permalink_url?: string;
  created_time?: string; // ISO 8601 from the Graph API (not the webhook's epoch form)
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export async function listPagePosts(pageId: string, after?: string, limit = 25): Promise<PagedResult<GraphPost>> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);

  const params: Record<string, string> = {
    fields: 'id,message,permalink_url,created_time',
    limit: String(limit),
    access_token: token,
  };
  if (after) params.after = after;

  const payload = await graphGet<{ data?: GraphPost[] }>(`/${encodeURIComponent(pageId)}/posts`, params);
  return { items: payload.data ?? [], nextCursor: payload.paging?.cursors?.after ?? null };
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface GraphComment {
  id: string;
  message?: string;
  from?: { id?: string; name?: string };
  created_time?: string;
  parent?: { id?: string };
}

// filter=stream returns all-level (including nested reply) comments in
// chronological order, each with a `parent` — the post itself for top-level
// comments, another comment for replies.
export async function listPostComments(postId: string, pageId: string, after?: string, limit = 50): Promise<PagedResult<GraphComment>> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);

  const params: Record<string, string> = {
    fields: 'id,message,from,created_time,parent',
    filter: 'stream',
    limit: String(limit),
    access_token: token,
  };
  if (after) params.after = after;

  const payload = await graphGet<{ data?: GraphComment[] }>(`/${encodeURIComponent(postId)}/comments`, params);
  return { items: payload.data ?? [], nextCursor: payload.paging?.cursors?.after ?? null };
}

// ── Reply ─────────────────────────────────────────────────────────────────────

export async function postCommentReply(pageId: string, commentId: string, message: string): Promise<{ replyCommentId: string }> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);

  const url = `${GRAPH_API_BASE}/${getGraphApiVersion()}/${encodeURIComponent(commentId)}/comments`;
  const body = new URLSearchParams({ message, access_token: token });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    throw new FacebookGraphError('Network error calling Meta Graph API', 0, err);
  }

  const payload = await response.json().catch(() => null) as ({ id?: string } & GraphErrorBody) | null;

  if (!response.ok || !payload || payload.error) {
    console.error('[facebook-graph] reply failed:', { pageId, status: response.status, code: payload?.error?.code, type: payload?.error?.type, message: payload?.error?.message });
    throw new FacebookGraphError(payload?.error?.message || `Graph API returned HTTP ${response.status}`, response.status);
  }
  if (!payload.id) {
    throw new FacebookGraphError('Graph API did not return a new comment id', response.status);
  }

  return { replyCommentId: payload.id };
}
