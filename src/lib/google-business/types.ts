// Shared types for Google Business Profile review management. Two layers,
// deliberately kept separate:
//   - Raw*: shapes close to what Google's APIs actually return (bare ids,
//     already stripped of resource-name prefixes — see resource-id.ts).
//     Both GoogleBusinessClient implementations (fake and real) speak this
//     layer, so a route/service never knows which one it's talking to.
//   - *Dto: normalized shapes the REST endpoints return — star rating as a
//     number, timestamps as ISO strings, nothing Google returns that the UI
//     doesn't need (never a raw Google payload).

export type StarRating = 1 | 2 | 3 | 4 | 5;

// Google's v4 enum, kept verbatim rather than translated — the value itself
// (e.g. "ONE".."FIVE") is what mapStarRating below converts to a number;
// GOOGLE_STAR_RATING_ORDER documents that mapping in one place.
export const GOOGLE_STAR_RATING_ORDER = ['STAR_RATING_UNSPECIFIED', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const;
export type GoogleStarRatingEnum = typeof GOOGLE_STAR_RATING_ORDER[number];

export function mapStarRating(enumValue: string | undefined): StarRating | null {
  const idx = GOOGLE_STAR_RATING_ORDER.indexOf(enumValue as GoogleStarRatingEnum);
  return idx >= 1 ? (idx as StarRating) : null; // index 0 is STAR_RATING_UNSPECIFIED / not found
}

// ── Raw (client-layer) shapes ────────────────────────────────────────────────

export interface RawAccount {
  accountId: string; // bare id, prefix already stripped
}

export interface RawLocation {
  locationId: string; // bare id, prefix already stripped
  title: string | null;
  address: unknown | null; // Google's storefrontAddress object, passed through as-is
}

export interface RawReviewer {
  displayName: string | null;
  profilePhotoUrl: string | null;
  isAnonymous: boolean;
}

export interface RawReviewReply {
  comment: string | null;
  updateTime: string | null;
  replyState: string | null; // Google's ReviewReplyState, when the API exposes it
  policyViolation: unknown | null;
}

export interface RawReview {
  reviewId: string;
  reviewer: RawReviewer;
  starRating: GoogleStarRatingEnum;
  comment: string | null; // absent for a rating-only review
  createTime: string;
  updateTime: string;
  reply: RawReviewReply | null;
}

export interface RawReviewsPage {
  reviews: RawReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
  nextPageToken: string | null;
}

// ── The interface Part 1 needs stubbable — fake-client.ts and
// real-client.ts both implement this exactly, selected by
// client-factory.ts. Nothing outside this directory calls Google directly.

export class GoogleBusinessApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly cause?: unknown) {
    super(message);
    this.name = 'GoogleBusinessApiError';
  }
}

export interface GoogleBusinessClient {
  // Resolve-once-and-cache calls (Part 2). Callers cache the result
  // themselves (src/lib/google-business/store.ts) — the client itself is
  // stateless and always makes a real (or fake) call when asked.
  listAccounts(accessToken: string): Promise<RawAccount[]>;
  listLocations(accessToken: string, accountId: string): Promise<RawLocation[]>;

  // Reviews — pagination followed to completion by the caller (sync.ts),
  // one page per call here.
  listReviewsPage(accessToken: string, accountId: string, locationId: string, pageToken?: string): Promise<RawReviewsPage>;
  getReview(accessToken: string, accountId: string, locationId: string, reviewId: string): Promise<RawReview>;

  // Reply — PUT creates or overwrites (there is no separate create call);
  // returns the review's reply state as Google reports it immediately
  // after the write (a 200 here does not mean the reply is published —
  // callers must still treat replyState as authoritative, not this call's
  // success).
  upsertReply(accessToken: string, accountId: string, locationId: string, reviewId: string, comment: string): Promise<RawReviewReply>;
  deleteReply(accessToken: string, accountId: string, locationId: string, reviewId: string): Promise<void>;
}

// ── Normalized DTOs (what the REST endpoints return) ─────────────────────────

export type ConnectionStatusValue = 'connected' | 'disconnected' | 'needs_reconnect';

export interface LocationDto {
  locationId: string;
  title: string | null;
  address: unknown | null;
}

export interface StatusDto {
  status: ConnectionStatusValue;
  connectedAccount: { googleEmail: string | null } | null;
  locations: LocationDto[];
  lastSyncedAt: string | null;
}

export interface ReviewReplyDto {
  comment: string;
  updatedAt: string | null;
  state: string | null; // ReviewReplyState, verbatim — never assumed published
  policyViolation: unknown | null;
}

export interface ReviewDto {
  locationId: string;
  reviewId: string;
  reviewer: { displayName: string | null; profilePhotoUrl: string | null; isAnonymous: boolean };
  starRating: StarRating | null;
  comment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  reply: ReviewReplyDto | null;
}

export interface ReviewsPageDto {
  reviews: ReviewDto[];
  nextCursor: string | null;
}
