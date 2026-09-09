// Real Google Business Profile client — three separate Google APIs, none of
// which share a base URL, matching this codebase's existing style of a
// thin, hand-rolled fetch wrapper per integration (no googleapis SDK
// dependency, same as facebook/graph.ts, instagram/graph.ts, ga4.ts).
// Selected via GOOGLE_BUSINESS_CLIENT_MODE=real (client-factory.ts).
//
// Reviews exist only in the legacy v4 "mybusiness" API — there is no newer
// replacement for this specific capability, confirmed against Google's own
// current Business Profile API docs; the account/location resolution APIs
// ARE the newer ones (mybusinessaccountmanagement/mybusinessbusinessinformation
// v1) and deliberately different base URLs from the reviews API — this is
// Google's actual current API surface, not an inconsistency in this client.

import { stripAccountPrefix, stripLocationPrefix } from '@/lib/google-business/resource-id';
import { GoogleBusinessApiError, type GoogleBusinessClient, type RawAccount, type RawLocation, type RawReview, type RawReviewsPage, type RawReviewReply } from '@/lib/google-business/types';

const ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4';

interface GoogleErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

async function googleFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Never log the URL with the token — Authorization is a header here,
    // not a query param, so the URL itself is safe, but the token value
    // must never be logged regardless.
    throw new GoogleBusinessApiError('Network error calling Google Business Profile API', 0, err);
  }

  const payload = await response.json().catch(() => null) as (T & GoogleErrorBody) | null;

  if (!response.ok || !payload || payload.error) {
    console.error('[google-business] request failed:', { url: url.split('?')[0], status: response.status, code: payload?.error?.code, googleStatus: payload?.error?.status });
    // Message only — never the raw payload/body to the caller (that's
    // exactly what the non-negotiables forbid leaking further up).
    throw new GoogleBusinessApiError(payload?.error?.message || `Google Business Profile API returned HTTP ${response.status}`, response.status);
  }

  return payload;
}

interface AccountsResponse {
  accounts?: Array<{ name?: string }>;
}

interface LocationsResponse {
  locations?: Array<{ name?: string; title?: string; storefrontAddress?: unknown }>;
}

interface ReviewsResponse {
  reviews?: Array<{
    reviewId?: string;
    reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
    starRating?: string;
    comment?: string;
    createTime?: string;
    updateTime?: string;
    reviewReply?: { comment?: string; updateTime?: string };
  }>;
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

function mapRawReview(r: NonNullable<ReviewsResponse['reviews']>[number]): RawReview {
  return {
    reviewId: r.reviewId ?? '',
    reviewer: {
      displayName: r.reviewer?.displayName ?? null,
      profilePhotoUrl: r.reviewer?.profilePhotoUrl ?? null,
      isAnonymous: r.reviewer?.isAnonymous ?? false,
    },
    starRating: (r.starRating as RawReview['starRating']) ?? 'STAR_RATING_UNSPECIFIED',
    comment: r.comment ?? null, // absent for a rating-only review — never fabricated
    createTime: r.createTime ?? '',
    updateTime: r.updateTime ?? '',
    reply: r.reviewReply
      ? {
          comment: r.reviewReply.comment ?? null,
          updateTime: r.reviewReply.updateTime ?? null,
          // The list/get Reviews response does not carry ReviewReplyState/
          // PolicyViolation on every field mask — those are populated from
          // the dedicated get-review call right after a reply write (see
          // getReview below and the /reply route, which refetches rather
          // than trusting the PUT response body).
          replyState: null,
          policyViolation: null,
        }
      : null,
  };
}

interface ReplyResponse {
  comment?: string;
  updateTime?: string;
}

export const realGoogleBusinessClient: GoogleBusinessClient = {
  async listAccounts(accessToken: string): Promise<RawAccount[]> {
    const payload = await googleFetch<AccountsResponse>(`${ACCOUNT_MGMT_BASE}/accounts`, accessToken);
    return (payload.accounts ?? [])
      .filter((a): a is { name: string } => !!a.name)
      .map(a => ({ accountId: stripAccountPrefix(a.name) }));
  },

  async listLocations(accessToken: string, accountId: string): Promise<RawLocation[]> {
    const url = `${BUSINESS_INFO_BASE}/accounts/${encodeURIComponent(accountId)}/locations?readMask=name,title,storefrontAddress`;
    const payload = await googleFetch<LocationsResponse>(url, accessToken);
    return (payload.locations ?? [])
      .filter((l): l is { name: string; title?: string; storefrontAddress?: unknown } => !!l.name)
      .map(l => ({ locationId: stripLocationPrefix(l.name), title: l.title ?? null, address: l.storefrontAddress ?? null }));
  },

  async listReviewsPage(accessToken: string, accountId: string, locationId: string, pageToken?: string): Promise<RawReviewsPage> {
    const params = new URLSearchParams({ pageSize: '50' });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `${REVIEWS_BASE}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews?${params.toString()}`;
    const payload = await googleFetch<ReviewsResponse>(url, accessToken);
    return {
      reviews: (payload.reviews ?? []).map(mapRawReview),
      averageRating: payload.averageRating ?? null,
      totalReviewCount: payload.totalReviewCount ?? null,
      nextPageToken: payload.nextPageToken ?? null,
    };
  },

  async getReview(accessToken: string, accountId: string, locationId: string, reviewId: string): Promise<RawReview> {
    const url = `${REVIEWS_BASE}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews/${encodeURIComponent(reviewId)}`;
    interface SingleReviewResponse {
      reviewId?: string;
      reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
      starRating?: string;
      comment?: string;
      createTime?: string;
      updateTime?: string;
      // Confirmed against Google's current My Business v4 Review reference:
      // reviewReplyState and policyViolation are nested INSIDE reviewReply,
      // not top-level on Review — surfaced here verbatim, never assumed
      // absent just because a field mask omitted them from a list response.
      // reviewReplyState enum: REVIEW_REPLY_STATE_UNSPECIFIED, PENDING,
      // REJECTED, APPROVED. policyViolation is output-only, populated only
      // when the state is REJECTED.
      reviewReply?: { comment?: string; updateTime?: string; reviewReplyState?: string; policyViolation?: unknown };
    }
    const payload = await googleFetch<SingleReviewResponse>(url, accessToken);
    const base = mapRawReview(payload);
    if (base.reply) {
      base.reply.replyState = payload.reviewReply?.reviewReplyState ?? null;
      base.reply.policyViolation = payload.reviewReply?.policyViolation ?? null;
    }
    return base;
  },

  async upsertReply(accessToken: string, accountId: string, locationId: string, reviewId: string, comment: string): Promise<RawReviewReply> {
    const url = `${REVIEWS_BASE}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews/${encodeURIComponent(reviewId)}/reply`;
    await googleFetch<ReplyResponse>(url, accessToken, { method: 'PUT', body: JSON.stringify({ comment }) });
    // A 200 here does NOT mean the reply is published (non-negotiable) —
    // refetch the review itself for its authoritative reviewReplyState/
    // policyViolation rather than trusting this call's own response body.
    const refetched = await realGoogleBusinessClient.getReview(accessToken, accountId, locationId, reviewId);
    if (!refetched.reply) {
      throw new GoogleBusinessApiError('Reply write succeeded but the refetched review shows no reply', 502);
    }
    return refetched.reply;
  },

  async deleteReply(accessToken: string, accountId: string, locationId: string, reviewId: string): Promise<void> {
    const url = `${REVIEWS_BASE}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews/${encodeURIComponent(reviewId)}/reply`;
    await googleFetch<Record<string, never>>(url, accessToken, { method: 'DELETE' });
  },
};
