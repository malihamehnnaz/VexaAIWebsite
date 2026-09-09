// Defense-in-depth output scrubber for Content Intelligence API responses.
// Every route already allow-lists which fields it returns (never spreads an
// upstream object wholesale) — this is a second, independent layer on top
// of that: it walks the final response body and redacts anything that
// LOOKS like a credential inside a free-text string (title/reason/
// supportingEvidence/etc.), in case upstream text ever accidentally
// embeds one (e.g. a raw Meta error message concatenated into a "why"
// string by a future change). Structured fields (numbers, known enums)
// are untouched; only string values are scanned.

const META_TOKEN_PATTERN = /EAA[A-Za-z0-9]{20,}/g;
const ACCESS_TOKEN_QUERY_PARAM = /([?&]access_token=)[^&\s"']+/gi;
const GENERIC_LONG_SECRET_PATTERN = /\b(sk-|ya29\.)[A-Za-z0-9_-]{16,}/g;

export function redactSecretsInString(text: string): string {
  return text
    .replace(ACCESS_TOKEN_QUERY_PARAM, '$1[REDACTED]')
    .replace(META_TOKEN_PATTERN, '[REDACTED]')
    .replace(GENERIC_LONG_SECRET_PATTERN, '[REDACTED]');
}

// Recursively scrubs every string value in a JSON-serializable structure.
// Safe to call on the final response body right before returning it.
export function scrubSecretsDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return redactSecretsInString(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(v => scrubSecretsDeep(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = scrubSecretsDeep(v);
    }
    return out as T;
  }
  return value;
}
