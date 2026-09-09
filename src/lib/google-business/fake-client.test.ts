import { describe, it, expect } from 'vitest';
import { fakeGoogleBusinessClient } from './fake-client';

// Non-negotiables this exercises: rating-only reviews (no comment) handled
// without throwing; reply moderation state surfaced, never assumed
// published.

describe('fakeGoogleBusinessClient', () => {
  it('lists both configured locations', async () => {
    const accounts = await fakeGoogleBusinessClient.listAccounts('token');
    const locations = await fakeGoogleBusinessClient.listLocations('token', accounts[0].accountId);
    expect(locations).toHaveLength(2);
    expect(locations.map(l => l.title)).toEqual(expect.arrayContaining([
      expect.stringContaining('Sundsvall'),
      expect.stringContaining('Umeå'),
    ]));
  });

  it('includes a rating-only review (no comment) and does not throw handling it', async () => {
    const page = await fakeGoogleBusinessClient.listReviewsPage('token', 'acc', '100000000000000001');
    const ratingOnly = page.reviews.find(r => r.comment === null);
    expect(ratingOnly).toBeDefined();
    expect(ratingOnly!.starRating).toBeTruthy();
  });

  it('includes an anonymous reviewer', async () => {
    const page = await fakeGoogleBusinessClient.listReviewsPage('token', 'acc', '100000000000000001');
    expect(page.reviews.some(r => r.reviewer.isAnonymous)).toBe(true);
  });

  it('surfaces a rejected reply with its policyViolation — never presented as published', async () => {
    const page = await fakeGoogleBusinessClient.listReviewsPage('token', 'acc', '100000000000000001');
    const rejected = page.reviews.find(r => r.reply?.replyState === 'REJECTED');
    expect(rejected).toBeDefined();
    expect(rejected!.reply!.policyViolation).not.toBeNull();
  });

  it('upsertReply sets replyState to PENDING, not an assumed-published state', async () => {
    const reply = await fakeGoogleBusinessClient.upsertReply('token', 'acc', '100000000000000002', 'fake-review-101', 'Thank you!');
    expect(reply.replyState).toBe('PENDING');
    expect(reply.comment).toBe('Thank you!');
  });

  it('deleteReply clears the reply so a subsequent getReview reflects it', async () => {
    await fakeGoogleBusinessClient.upsertReply('token', 'acc', '100000000000000002', 'fake-review-101', 'temp');
    await fakeGoogleBusinessClient.deleteReply('token', 'acc', '100000000000000002', 'fake-review-101');
    const review = await fakeGoogleBusinessClient.getReview('token', 'acc', '100000000000000002', 'fake-review-101');
    expect(review.reply).toBeNull();
  });

  it('throws a GoogleBusinessApiError for an unknown review id rather than returning undefined', async () => {
    await expect(fakeGoogleBusinessClient.getReview('token', 'acc', '100000000000000001', 'does-not-exist')).rejects.toThrow();
  });
});
