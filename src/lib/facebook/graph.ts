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
  // metaErrorCode/metaErrorType/metaErrorSubcode are Meta's own structured
  // error fields (never the token, never the raw response body) — used by
  // src/lib/social-scheduling/errors.ts to classify a publish failure as
  // permanent (bad permissions/invalid content — never retried) vs
  // transient (rate limit/server error — retried with backoff), the same
  // way GoogleOAuthError.code lets src/lib/google/store.ts distinguish
  // invalid_grant from a transient refresh failure.
  constructor(
    message: string,
    public readonly status: number,
    public readonly cause?: unknown,
    public readonly metaErrorCode?: number,
    public readonly metaErrorType?: string,
    public readonly metaErrorSubcode?: number
  ) {
    super(message);
    this.name = 'FacebookGraphError';
  }
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
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
    throw new FacebookGraphError(payload?.error?.message || `Graph API returned HTTP ${response.status}`, response.status, undefined, payload?.error?.code, payload?.error?.type, payload?.error?.error_subcode);
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

// ── Publishing (Page feed posts) ─────────────────────────────────────────────
// Confirmed against Meta's current Page/feed and Page/photos reference
// (2026-09-13): POST /{page-id}/feed with a `message` param creates a
// text-only Page post and returns {"id": "<post-id>"}; a permalink can be
// built as https://www.facebook.com/{post-id} for standard post types
// (mirrors what /api/social-scheduling reports back — never fabricated).
// A single photo (this app has no media upload/storage of its own — see
// src/lib/social-scheduling/media.ts) is posted via POST /{page-id}/photos
// with a remote `url` + `caption`, which returns {"id", "post_id"} — the
// post_id (not the photo id) is what corresponds to a feed post/permalink.

async function graphPostForm<T>(path: string, token: string, form: Record<string, string>): Promise<T> {
  const url = `${GRAPH_API_BASE}/${getGraphApiVersion()}${path}`;
  const body = new URLSearchParams({ ...form, access_token: token });

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  } catch (err) {
    throw new FacebookGraphError('Network error calling Meta Graph API', 0, err);
  }

  const payload = await response.json().catch(() => null) as (T & GraphErrorBody) | null;
  if (!response.ok || !payload || payload.error) {
    console.error('[facebook-graph] publish failed:', { path, status: response.status, code: payload?.error?.code, type: payload?.error?.type, subcode: payload?.error?.error_subcode });
    throw new FacebookGraphError(payload?.error?.message || `Graph API returned HTTP ${response.status}`, response.status, undefined, payload?.error?.code, payload?.error?.type, payload?.error?.error_subcode);
  }
  return payload;
}

export interface PublishedPost {
  postId: string; // usable to build a permalink: https://www.facebook.com/{postId}
}

// Text-only Page post. This is the primary, always-available path — no
// media infrastructure required.
export async function createPageFeedPost(pageId: string, message: string): Promise<PublishedPost> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);

  const payload = await graphPostForm<{ id?: string }>(`/${encodeURIComponent(pageId)}/feed`, token, { message });
  if (!payload.id) throw new FacebookGraphError('Graph API did not return a new post id', 0);
  return { postId: payload.id };
}

// A single photo with a caption, published directly to the Page's feed —
// Meta fetches the image itself from `photoUrl` (this app never uploads a
// file to Meta), so photoUrl must already be a real, publicly-fetchable
// HTTPS URL (validated in src/lib/social-scheduling/media.ts before this is
// ever called).
export async function createPagePhotoPost(pageId: string, photoUrl: string, caption: string): Promise<PublishedPost> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);

  const payload = await graphPostForm<{ id?: string; post_id?: string }>(`/${encodeURIComponent(pageId)}/photos`, token, {
    url: photoUrl,
    caption,
    published: 'true',
  });
  // post_id is the feed post's id (what a permalink is built from); id is
  // the photo node's id — distinct, and it's post_id callers need.
  const postId = payload.post_id ?? payload.id;
  if (!postId) throw new FacebookGraphError('Graph API did not return a new post id', 0);
  return { postId };
}

// ── Page Insights (organic analytics) ────────────────────────────────────────
// GET /{page-id}/insights?metric=...&period=day&since=...&until=... (no
// metric_type param, unlike Instagram's Insights endpoint). Metrics come
// back either as a flat number per day, or — for
// page_actions_post_reactions_total — an object keyed by reaction type.
//
// CURRENT METRIC NAMES (updated 2026-09-09): Meta deprecated most legacy
// page_* metrics effective June 15, 2026 (developers.facebook.com/docs/
// graph-api/reference/v26.0/insights) — that date has already passed.
// Empirically confirmed (via probeMetric, /api/facebook/diagnostics) which
// names Meta still recognizes: page_follows, page_daily_follows_unique,
// page_total_media_view_unique, page_post_engagements, page_video_views,
// page_actions_post_reactions_total. Removed entirely: page_fans,
// page_impressions, page_impressions_unique, page_fan_removes/adds — all
// confirmed "(#100) invalid insights metric". No current replacement exists
// for a page-level "impressions" concept — folded into
// page_total_media_view_unique.
//
// TOKEN: Page Insights specifically rejects the connected Business Manager
// System User token directly ("(#190) This method must be called with a
// Page Access Token"), even though that same token works fine for
// posts/comments/Messenger/Instagram Insights. Root-caused (2026-09-09, via
// the probePageTokenDerivation/probeDerivedInsightMetric diagnostics): a
// genuine Page-type token CAN be derived from it — GET /{page-id}?fields=
// access_token, authenticated with the System User token — and that
// derived token (confirmed via debug_token: type PAGE, correctly scoped to
// this Page, valid, non-expiring) resolves real Insights data. This is the
// standard Graph API mechanism for a System User with Page admin access to
// obtain that Page's actual Page Access Token; Meta's Page Insights product
// apparently requires that specific token type rather than accepting a
// System User token directly, unlike every other endpoint this app calls.
// getPageAccessToken() below performs this derivation (cached in-memory,
// never persisted or logged) and is used ONLY by the Insights functions —
// every other Facebook/Instagram function in this codebase keeps using
// resolvePageAccessToken()'s System User token exactly as before, since
// that already works for them.

// In-memory only (never Redis/DB — matches this app's existing security
// posture of not encrypting Meta Page tokens at rest, since the raw System
// User token already sits in a plain env var). Resets on cold start, which
// just costs one extra derivation call — harmless. Cached for 6 hours;
// derived Page tokens from a long-lived source token don't expire on their
// own (confirmed: expiresAt 0), but a modest TTL bounds staleness if the
// source token is ever rotated.
const PAGE_TOKEN_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const pageAccessTokenCache = new Map<string, { token: string; cachedAt: number }>();

// Test-only escape hatch — the cache is module-level and otherwise persists
// across test cases within the same file.
export function __resetPageAccessTokenCacheForTests(): void {
  pageAccessTokenCache.clear();
}

// Derives this Page's actual Page Access Token from the configured System
// User token (see the header comment above). Returns null — never
// throws — if derivation fails for any reason, so callers can safely fall
// back to the System User token and preserve prior behavior rather than
// breaking harder than before.
async function getPageAccessToken(pageId: string): Promise<string | null> {
  const cached = pageAccessTokenCache.get(pageId);
  if (cached && Date.now() - cached.cachedAt < PAGE_TOKEN_CACHE_TTL_MS) {
    return cached.token;
  }

  const systemUserToken = resolvePageAccessToken(pageId);
  if (!systemUserToken) return null;

  try {
    const payload = await graphGet<{ access_token?: string }>(`/${encodeURIComponent(pageId)}`, { fields: 'access_token', access_token: systemUserToken });
    if (!payload.access_token) return null;
    pageAccessTokenCache.set(pageId, { token: payload.access_token, cachedAt: Date.now() });
    return payload.access_token;
  } catch (err) {
    console.error('[facebook-graph] Page Access Token derivation failed:', err instanceof FacebookGraphError ? err.message : 'unknown error');
    return null;
  }
}

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
  // Prefer the derived Page-type token (see the header comment above);
  // fall back to the System User token as-is if derivation isn't possible,
  // preserving prior behavior rather than failing harder.
  const token = (await getPageAccessToken(pageId)) ?? resolvePageAccessToken(pageId);
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

// ── Post-level Insights ──────────────────────────────────────────────────────
// GET /{post-id}/insights?metric=... — no period/since/until (post insights
// are lifetime-to-date totals, not a daily series). Empirically confirmed
// (2026-09-09, via the probePostId/probePostMetric diagnostic) that this
// call fails with a plain "Invalid OAuth 2.0 Access Token" for this
// Page/token, regardless of which metric name is requested — the same class
// of token-provenance rejection as Page-level Insights (and the
// long-unexplained /subscribed_apps diagnostic anomaly noted earlier), just
// with a different error shape. Implemented in full so it activates
// immediately with no code change once the token problem is fixed Meta-side
// — never-fabricate contract, same as getPageInsight.

export interface PostInsightResult {
  metric: string;
  value: number | null; // lifetime total, not a daily series
  unavailableReason?: string;
}

export async function getPostInsight(pageId: string, postId: string, metric: string): Promise<PostInsightResult> {
  const token = (await getPageAccessToken(pageId)) ?? resolvePageAccessToken(pageId);
  if (!token) return { metric, value: null };

  try {
    const payload = await graphGet<{ data?: InsightsApiRow[] }>(`/${encodeURIComponent(postId)}/insights`, { metric, access_token: token });
    const row = payload.data?.[0];
    const raw = row?.values?.[0]?.value;
    let value: number | null = null;
    if (typeof raw === 'number') {
      value = raw;
    } else if (raw && typeof raw === 'object') {
      value = Object.values(raw).reduce((acc, n) => acc + (typeof n === 'number' ? n : 0), 0);
    }
    return { metric, value };
  } catch (err) {
    const reason = err instanceof FacebookGraphError ? err.message : 'Unavailable';
    console.error(`[facebook-graph] post insight "${metric}" unavailable:`, reason);
    return { metric, value: null, unavailableReason: reason };
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

// Same, but for a single post's insights (GET /{post-id}/insights) — used to
// empirically check whether post-level Insights hit the same token-type
// restriction as Page-level Insights, before building real post-level
// support on top of an assumption.
export async function getPostInsightRaw(pageId: string, postId: string, metric: string): Promise<unknown> {
  const token = resolvePageAccessToken(pageId);
  if (!token) throw new FacebookGraphError(`No Page Access Token configured for page ${pageId}`, 0);
  return graphGet(`/${encodeURIComponent(postId)}/insights`, { metric, access_token: token });
}

// Diagnostic-only: attempts the standard Graph API Page-token derivation
// (GET /{page-id}?fields=access_token, authenticated with whatever token
// resolvePageAccessToken currently returns) to check whether a genuine
// Page-type token can be obtained from it — never returns the derived token
// itself, only whether one came back and, via debug_token, what type it is.
// This is the standard mechanism for a System User (or a User token with
// Page admin access) to obtain that Page's actual Page Access Token; used
// here purely to test the hypothesis that Page Insights specifically
// requires that derived token rather than the System User token directly.
// Diagnostic-only: derives a Page Access Token the same way as
// probePageAccessTokenDerivation, then immediately tries a real Page
// Insights call with it — to confirm (or refute) that the derived token
// resolves the "(#190) This method must be called with a Page Access
// Token" error, before wiring this into the real request path.
export async function probeInsightWithDerivedToken(pageId: string, metric: string, since: string, until: string): Promise<{ derived: boolean; insightError?: string; insightResult?: unknown }> {
  const systemUserToken = resolvePageAccessToken(pageId);
  if (!systemUserToken) return { derived: false };

  let derivedToken: string | undefined;
  try {
    const payload = await graphGet<{ access_token?: string }>(`/${encodeURIComponent(pageId)}`, { fields: 'access_token', access_token: systemUserToken });
    derivedToken = payload.access_token;
  } catch (err) {
    return { derived: false, insightError: err instanceof FacebookGraphError ? `derivation failed: ${err.message}` : 'derivation failed: unknown error' };
  }
  if (!derivedToken) return { derived: false, insightError: 'no access_token field returned' };

  try {
    // IMPORTANT: Meta's raw Insights payload includes paging.previous/next
    // URLs that embed the access_token used for the request as a plaintext
    // query parameter. Never return or log the raw payload — extract only
    // the safe fields (name/period/values), same discipline getPageInsight
    // itself already follows.
    const result = await graphGet<{ data?: Array<{ name?: string; period?: string; values?: unknown }> }>(`/${encodeURIComponent(pageId)}/insights`, { metric, period: 'day', since, until, access_token: derivedToken });
    const row = result.data?.[0];
    return { derived: true, insightResult: row ? { name: row.name, period: row.period, values: row.values } : null };
  } catch (err) {
    return { derived: true, insightError: err instanceof FacebookGraphError ? err.message : 'unknown error' };
  }
}

export async function probePageAccessTokenDerivation(pageId: string, appId: string): Promise<{ derived: boolean; debug?: TokenDebugInfo; error?: string }> {
  const systemUserToken = resolvePageAccessToken(pageId);
  const appSecret = process.env.META_APP_SECRET;
  if (!systemUserToken) return { derived: false, error: 'No token configured for this page' };

  let derivedToken: string | undefined;
  try {
    const payload = await graphGet<{ access_token?: string }>(`/${encodeURIComponent(pageId)}`, { fields: 'access_token', access_token: systemUserToken });
    derivedToken = payload.access_token;
  } catch (err) {
    return { derived: false, error: err instanceof FacebookGraphError ? err.message : 'Unknown error deriving token' };
  }
  if (!derivedToken) return { derived: false, error: 'Graph API returned no access_token field' };
  if (!appSecret) return { derived: true, error: 'Derived a token but cannot debug it — META_APP_SECRET not configured' };

  try {
    const inspectingToken = `${appId}|${appSecret}`;
    const debugPayload = await graphGet<DebugTokenResponse>('/debug_token', { input_token: derivedToken, access_token: inspectingToken });
    const d = debugPayload.data ?? {};
    return {
      derived: true,
      debug: { appId: d.app_id, isValid: d.is_valid, type: d.type, profileId: d.profile_id, scopes: d.scopes, expiresAt: d.expires_at, dataAccessExpiresAt: d.data_access_expires_at },
    };
  } catch (err) {
    return { derived: true, error: `Derived a token but debug_token failed: ${err instanceof FacebookGraphError ? err.message : 'Unknown error'}` };
  }
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
