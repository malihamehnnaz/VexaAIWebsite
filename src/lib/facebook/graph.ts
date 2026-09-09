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

// ── Page Insights (organic analytics) ────────────────────────────────────────
// Confirmed against Meta's current Page Insights reference (2026-09-09,
// developers.facebook.com/docs/graph-api/reference/page/insights/):
// GET /{page-id}/insights?metric=...&period=day&since=...&until=...
// (no metric_type param, unlike Instagram's Insights endpoint). Metrics come
// back either as a flat number per day, or — for
// page_actions_post_reactions_total — an object keyed by reaction type.
//
// Empirically confirmed against this Page/token (2026-09-09, via the
// probeMetric diagnostic — see /api/facebook/diagnostics): EVERY metric
// currently fails, in one of two distinct, genuine ways, neither a code bug:
//   - "(#100) The value must be a valid insights metric" — the metric name
//     itself has been removed. Matches Meta's own notice that "by June 15,
//     2026, a number of Page Insights metrics will be deprecated for all API
//     versions" (developers.facebook.com/docs/graph-api/reference/v26.0/
//     insights) — that date has already passed. Hit by page_fans,
//     page_impressions, page_impressions_unique, page_fan_removes (at least).
//   - "(#190) This method must be called with a Page Access Token" — the
//     metric name is still recognized, but Meta rejects THIS token
//     (a Business Manager System User token) for the legacy /insights
//     endpoint specifically, even though the same token works for
//     posts/comments/Messenger/Instagram. Hit by page_follows,
//     page_daily_follows, page_media_view, page_total_media_view_unique,
//     page_views_total, page_post_engagements, page_video_views,
//     page_actions_post_reactions_total (at least). This is a genuine
//     Meta-side token/permission restriction — not fixable in code; needs
//     either a Page-login-derived Page token, or the System User granted
//     Insights access for this Page in Business Manager.
// The real error message (safe — never contains the token) is captured per
// metric below so the real endpoint can report accurately instead of a bare
// null, and so this automatically self-corrects with no code change if
// either problem is fixed on Meta's side later.

export interface DailyInsightValue {
  date: string; // YYYY-MM-DD, derived from Meta's end_time
  value: number | null;
}

export interface PageInsightResult {
  metric: string;
  daily: DailyInsightValue[]; // empty if Meta returned nothing / metric unavailable
  unavailableReason?: string; // set only when Meta actively rejected the metric (not on a legitimate empty series)
}

interface InsightsApiRow {
  name?: string;
  period?: string;
  values?: Array<{ value?: number | Record<string, number>; end_time?: string }>;
}

function toDateOnly(endTime: string | undefined): string | null {
  if (!endTime) return null;
  const d = new Date(endTime);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// A single metric's daily series over [since, until] (inclusive, YYYY-MM-DD).
// Never throws for a metric Meta rejects/doesn't support — returns an empty
// series instead, same "unavailable is not fatal" contract as Instagram's
// getAccountInsight, so one bad metric can't fail the whole overview.
export async function getPageInsight(pageId: string, metric: string, since: string, until: string): Promise<PageInsightResult> {
  const token = resolvePageAccessToken(pageId);
  if (!token) return { metric, daily: [] };

  try {
    const payload = await graphGet<{ data?: InsightsApiRow[] }>(`/${encodeURIComponent(pageId)}/insights`, {
      metric,
      period: 'day',
      since,
      until,
      access_token: token,
    });
    const row = payload.data?.[0];
    if (!row?.values?.length) return { metric, daily: [] };

    const daily: DailyInsightValue[] = row.values.map(v => {
      const date = toDateOnly(v.end_time);
      let value: number | null = null;
      if (typeof v.value === 'number') {
        value = v.value;
      } else if (v.value && typeof v.value === 'object') {
        // e.g. page_actions_post_reactions_total: {"like": 10, "love": 3, ...}
        // Summing real per-type counts Meta returned — not an estimate.
        const sum = Object.values(v.value).reduce((acc, n) => acc + (typeof n === 'number' ? n : 0), 0);
        value = sum;
      }
      return { date: date ?? '', value };
    }).filter(d => d.date !== '');

    return { metric, daily };
  } catch (err) {
    const reason = err instanceof FacebookGraphError ? err.message : 'Unavailable';
    console.error(`[facebook-graph] page insight "${metric}" unavailable:`, reason);
    // never fabricate — unavailable metric is an empty series with a real
    // reason attached, not zeros and not a silent, indistinguishable null
    return { metric, daily: [], unavailableReason: reason };
  }
}

// Diagnostic-only variant of getPageInsight that does NOT swallow the Graph
// API error — used solely by /api/facebook/diagnostics to surface the real
// reason every Page Insights metric was coming back empty, since getPageInsight
// itself deliberately hides per-metric errors from the real endpoint's
// response (never-fabricate contract). Temporary, same as the rest of this
// diagnostics section.
export async function getPageInsightRaw(pageId: string, metric: string, since: string, until: string): Promise<unknown> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);
  return graphGet(`/${encodeURIComponent(pageId)}/insights`, { metric, period: 'day', since, until, access_token: token });
}

// ── Diagnostics (temporary — subscription/permission troubleshooting) ───────
// Confirmed against Meta's current docs (2026-09-05):
//   GET /{page-id}?fields=id,name — confirms which Page a token actually acts as
//   GET /{page-id}/subscribed_apps — apps subscribed to this Page's webhooks
//     + which fields (e.g. "feed") each is subscribed to
//   GET /debug_token?input_token=...&access_token=APP_ID|APP_SECRET — app_id,
//     validity, and granted scopes for a token, without ever returning the
//     token itself
// None of these return the Page Access Token or App Secret in their response.

export interface PageIdentity {
  id?: string;
  name?: string;
}

export async function getPageIdentity(pageId: string): Promise<PageIdentity> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);
  return graphGet<PageIdentity>(`/${encodeURIComponent(pageId)}`, { fields: 'id,name', access_token: token });
}

export interface SubscribedApp {
  id?: string;
  name?: string;
  subscribed_fields?: string[];
}

export async function getPageSubscribedApps(pageId: string): Promise<SubscribedApp[]> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);
  const payload = await graphGet<{ data?: SubscribedApp[] }>(`/${encodeURIComponent(pageId)}/subscribed_apps`, { access_token: token });
  return payload.data ?? [];
}

export interface TokenDebugInfo {
  appId?: string;
  isValid?: boolean;
  type?: string;
  profileId?: string; // for a Page token, the Page ID this token acts as
  scopes?: string[];
  expiresAt?: number;
  dataAccessExpiresAt?: number;
}

interface DebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    type?: string;
    profile_id?: string;
    scopes?: string[];
    expires_at?: number;
    data_access_expires_at?: number;
  };
}

// appId is not secret (it's a public identifier, visible in OAuth redirect
// URLs etc.) — passed in by the caller rather than hard-coded here so this
// diagnostic file doesn't need to know about any specific app.
export async function debugPageToken(pageId: string, appId: string): Promise<TokenDebugInfo> {
  const token = resolvePageAccessToken(pageId);
  const appSecret = process.env.META_APP_SECRET;
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);
  if (!appSecret) throw new FacebookGraphError('META_APP_SECRET is not configured — cannot inspect token', 0);

  const inspectingToken = `${appId}|${appSecret}`;
  const payload = await graphGet<DebugTokenResponse>('/debug_token', { input_token: token, access_token: inspectingToken });
  const d = payload.data ?? {};

  return {
    appId: d.app_id,
    isValid: d.is_valid,
    type: d.type,
    profileId: d.profile_id,
    scopes: d.scopes,
    expiresAt: d.expires_at,
    dataAccessExpiresAt: d.data_access_expires_at,
  };
}
