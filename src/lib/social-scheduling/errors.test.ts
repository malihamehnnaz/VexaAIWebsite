import { describe, it, expect } from 'vitest';
import { classifyPublishFailure } from './errors';
import { FacebookGraphError } from '@/lib/facebook/graph';

describe('classifyPublishFailure', () => {
  it('classifies an OAuth/expired-token error (190) as permanent', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Error validating access token', 401, undefined, 190, 'OAuthException'));
    expect(result.class).toBe('permanent');
    expect(result.code).toBe('meta_190');
  });

  it('classifies a permission-denied error (10) as permanent', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Permission denied', 403, undefined, 10));
    expect(result.class).toBe('permanent');
  });

  it('classifies a rate-limit error (4) as transient', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Too many calls', 400, undefined, 4));
    expect(result.class).toBe('transient');
    expect(result.code).toBe('meta_4');
  });

  it('classifies a duplicate-post error (506) as permanent — never blindly retried', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Duplicate post', 400, undefined, 506));
    expect(result.class).toBe('permanent');
  });

  it('classifies a network error (status 0, no Meta code) as transient', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Network error calling Meta Graph API', 0));
    expect(result.class).toBe('transient');
    expect(result.code).toBe('http_0');
  });

  it('classifies a Meta 500 with no recognized code as transient', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Server error', 500));
    expect(result.class).toBe('transient');
  });

  it('classifies a Meta 400 with no recognized code as permanent (bad request, unlikely to succeed unmodified)', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Bad request', 400));
    expect(result.class).toBe('permanent');
  });

  it('classifies a non-Graph error (e.g. a DB failure) as transient', () => {
    const result = classifyPublishFailure(new Error('connection refused'));
    expect(result.class).toBe('transient');
    expect(result.code).toBe('unknown_error');
  });

  it('never includes the raw error or a token-shaped string in the safe message', () => {
    const result = classifyPublishFailure(new FacebookGraphError('Invalid OAuth access token: EAAABBBCCCsecret', 401, undefined, 190));
    // The message itself is Meta's own human-readable text (safe to store/
    // log), but this asserts the classifier never adds anything beyond it
    // (e.g. never appends `cause` or a raw response body).
    expect(result.message).toBe('Invalid OAuth access token: EAAABBBCCCsecret');
  });
});
