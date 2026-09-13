// Classifies a Meta publish failure as permanent (never retried — bad
// permissions, invalid content, expired auth) or transient (retried with
// backoff — rate limiting, temporary server error). Confirmed against
// Meta's current Graph API error-handling reference (2026-09-13) rather
// than assumed.
//
// Notable: Meta's own error code 506 ("Duplicate Post" — consecutive
// identical content) is a genuine, if partial, safety net for exactly the
// "did this already publish?" risk this feature has to live with (see
// worker.ts's header comment) — if a retry ever re-attempted a publish
// that had actually already succeeded, Meta itself may reject the second
// attempt as a duplicate rather than silently create a second real post.
// This does not fully solve the problem (Meta's duplicate-detection window
// and exact matching rules aren't guaranteed or documented precisely
// enough to rely on alone), so it's treated as a permanent failure here
// (never blindly retried again) and surfaced clearly, not as evidence the
// original attempt succeeded.

import { FacebookGraphError } from '@/lib/facebook/graph';

export type FailureClass = 'permanent' | 'transient';

const TRANSIENT_CODES = new Set([1, 2, 4, 17, 341, 368]); // unknown/service error, rate limiting, temporary policy block
const PERMANENT_CODES = new Set([3, 10, 102, 190, 458, 459, 460, 463, 464, 467, 492, 506, 1609005]);

export interface ClassifiedFailure {
  class: FailureClass;
  code: string; // safe, stable string for storage — never the raw Meta message body
  message: string; // safe, human-readable summary — never a raw Meta payload
}

export function classifyPublishFailure(err: unknown): ClassifiedFailure {
  if (err instanceof FacebookGraphError) {
    const metaCode = err.metaErrorCode;
    if (metaCode != null) {
      if (PERMANENT_CODES.has(metaCode)) {
        return { class: 'permanent', code: `meta_${metaCode}`, message: safeMessage(err) };
      }
      if (TRANSIENT_CODES.has(metaCode)) {
        return { class: 'transient', code: `meta_${metaCode}`, message: safeMessage(err) };
      }
    }
    // 4xx from Meta with no recognized code -> treat as permanent (a bad
    // request is unlikely to succeed unmodified on retry); 5xx/network
    // (status 0 or >=500) -> transient.
    if (err.status === 0 || err.status >= 500) {
      return { class: 'transient', code: `http_${err.status}`, message: safeMessage(err) };
    }
    return { class: 'permanent', code: `http_${err.status}`, message: safeMessage(err) };
  }

  // An unexpected (non-Graph) error — e.g. a DB failure mid-publish.
  // Treated as transient so a genuine infrastructure blip gets a retry,
  // rather than giving up permanently on something that might just be a
  // momentary problem unrelated to Meta or the post's content.
  return { class: 'transient', code: 'unknown_error', message: 'An unexpected error occurred while publishing.' };
}

// Never includes err.cause, the raw Meta response body, or anything that
// could carry the access token — only Meta's own `message` field (which is
// itself already a human-readable description Meta intends to be shown to
// developers, not a credential).
function safeMessage(err: FacebookGraphError): string {
  return err.message || 'Meta rejected the publish request.';
}
