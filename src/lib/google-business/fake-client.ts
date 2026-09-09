// Fixture implementation of GoogleBusinessClient — selected via
// GOOGLE_BUSINESS_CLIENT_MODE=fake (the default), unblocks the frontend
// team before Cloud Console approval lands. Never touches the network.
// Fixture data is deliberately varied to exercise every edge case the real
// API can hand back: a rating-only review with no comment, an anonymous
// reviewer, a review with an already-published reply, and a reply rejected
// by moderation (PolicyViolation present) — so a route/DTO bug in any of
// those paths shows up against the fake client, not only once the real one
// is live.

import type { GoogleBusinessClient, RawAccount, RawLocation, RawReview, RawReviewsPage, RawReviewReply } from '@/lib/google-business/types';
import { GoogleBusinessApiError } from '@/lib/google-business/types';

const FAKE_ACCOUNT_ID = '000000000000000000001';

const FAKE_LOCATIONS: Record<string, RawLocation> = {
  '100000000000000001': {
    locationId: '100000000000000001',
    title: "GP's — Guilty Pleasure Café Sundsvall",
    address: { addressLines: ['Storgatan 12'], postalCode: '852 31', locality: 'Sundsvall', regionCode: 'SE' },
  },
  '100000000000000002': {
    locationId: '100000000000000002',
    title: "GP's — Guilty Pleasure Café Umeå",
    address: { addressLines: ['Skolgatan 62'], postalCode: '903 29', locality: 'Umeå', regionCode: 'SE' },
  },
};

// Mutable in-memory store so upsertReply/deleteReply against the fake
// client behave consistently within a process — resets on cold start,
// which is fine for a stub.
const FAKE_REVIEWS: Record<string, RawReview[]> = {
  '100000000000000001': [
    {
      reviewId: 'fake-review-001',
      reviewer: { displayName: 'Anna Lindqvist', profilePhotoUrl: 'https://example.com/photo1.jpg', isAnonymous: false },
      starRating: 'FIVE',
      comment: 'Best fika in Sundsvall, the cinnamon buns are incredible.',
      createTime: '2026-08-20T09:15:00Z',
      updateTime: '2026-08-20T09:15:00Z',
      reply: {
        comment: 'Tack så mycket, Anna! We hope to see you again soon.',
        updateTime: '2026-08-21T10:00:00Z',
        replyState: 'APPROVED', // Google's real enum: PENDING | REJECTED | APPROVED
        policyViolation: null,
      },
    },
    {
      // Rating-only review — no comment. Must be handled without throwing
      // anywhere in the pipeline (explicit non-negotiable).
      reviewId: 'fake-review-002',
      reviewer: { displayName: 'Erik S.', profilePhotoUrl: null, isAnonymous: false },
      starRating: 'FOUR',
      comment: null,
      createTime: '2026-08-25T14:30:00Z',
      updateTime: '2026-08-25T14:30:00Z',
      reply: null,
    },
    {
      // Anonymous reviewer, low rating, no reply yet.
      reviewId: 'fake-review-003',
      reviewer: { displayName: 'A Google user', profilePhotoUrl: null, isAnonymous: true },
      starRating: 'TWO',
      comment: 'Service was slow on a Saturday afternoon, otherwise fine.',
      createTime: '2026-09-01T16:45:00Z',
      updateTime: '2026-09-01T16:45:00Z',
      reply: null,
    },
    {
      // A reply that WAS sent but got rejected by moderation — the exact
      // "200 on the PUT does not mean published" scenario.
      reviewId: 'fake-review-004',
      reviewer: { displayName: 'Johan Bergström', profilePhotoUrl: null, isAnonymous: false },
      starRating: 'ONE',
      comment: 'Very disappointed with my last visit.',
      createTime: '2026-09-05T08:00:00Z',
      updateTime: '2026-09-05T08:00:00Z',
      reply: {
        comment: 'We are sorry to hear that — please contact us directly so we can make this right.',
        updateTime: '2026-09-05T09:00:00Z',
        replyState: 'REJECTED',
        // policyViolation is output-only, populated only when state is
        // REJECTED (confirmed against Google's current v4 reference).
        policyViolation: { violate: true, reason: 'OFF_TOPIC' },
      },
    },
  ],
  '100000000000000002': [
    {
      reviewId: 'fake-review-101',
      reviewer: { displayName: 'Sofia Nyström', profilePhotoUrl: 'https://example.com/photo2.jpg', isAnonymous: false },
      starRating: 'FIVE',
      comment: 'Cozy atmosphere and great coffee, my go-to spot in Umeå.',
      createTime: '2026-08-15T12:00:00Z',
      updateTime: '2026-08-15T12:00:00Z',
      reply: null,
    },
  ],
};

function simulateNetwork<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

function findReview(locationId: string, reviewId: string): RawReview {
  const review = (FAKE_REVIEWS[locationId] ?? []).find(r => r.reviewId === reviewId);
  if (!review) throw new GoogleBusinessApiError(`Fake client: no review ${reviewId} for location ${locationId}`, 404);
  return review;
}

export const fakeGoogleBusinessClient: GoogleBusinessClient = {
  async listAccounts(): Promise<RawAccount[]> {
    return simulateNetwork([{ accountId: FAKE_ACCOUNT_ID }]);
  },

  async listLocations(_accessToken: string, accountId: string): Promise<RawLocation[]> {
    if (accountId !== FAKE_ACCOUNT_ID) return simulateNetwork([]);
    return simulateNetwork(Object.values(FAKE_LOCATIONS));
  },

  async listReviewsPage(_accessToken: string, _accountId: string, locationId: string): Promise<RawReviewsPage> {
    const reviews = FAKE_REVIEWS[locationId] ?? [];
    const ratingValues: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    const ratings = reviews.map(r => ratingValues[r.starRating]).filter((n): n is number => n != null);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    // Single-page fixture — no pagination needed for a handful of fixture rows.
    return simulateNetwork({ reviews, averageRating, totalReviewCount: reviews.length, nextPageToken: null });
  },

  async getReview(_accessToken: string, _accountId: string, locationId: string, reviewId: string): Promise<RawReview> {
    return simulateNetwork(findReview(locationId, reviewId));
  },

  async upsertReply(_accessToken: string, _accountId: string, locationId: string, reviewId: string, comment: string): Promise<RawReviewReply> {
    const review = findReview(locationId, reviewId);
    // Models the real behavior this feature explicitly must not assume
    // away: a successful write starts PENDING moderation, not instantly
    // published — callers must read replyState, not infer it from a 200.
    review.reply = { comment, updateTime: new Date().toISOString(), replyState: 'PENDING', policyViolation: null };
    return simulateNetwork(review.reply);
  },

  async deleteReply(_accessToken: string, _accountId: string, locationId: string, reviewId: string): Promise<void> {
    const review = findReview(locationId, reviewId);
    review.reply = null;
    return simulateNetwork(undefined);
  },
};
