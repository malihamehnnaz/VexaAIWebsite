import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolvePageAccessToken } from './config';

// Covers requirement 9's "multiple restaurants/Pages" scenario at the level
// that actually exists in this codebase: per-Page token resolution (this
// app itself is single-Page/single-business — see the Facebook Insights
// audit's multi-tenant scope decision — but the underlying token-lookup
// mechanism already supports multiple Pages via
// META_PAGE_ACCESS_TOKEN_<pageId>, and that's what's under test here).

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.META_PAGE_ACCESS_TOKEN;
  delete process.env.META_PAGE_ACCESS_TOKEN_106658601471856;
  delete process.env.META_PAGE_ACCESS_TOKEN_211548128717427;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('resolvePageAccessToken', () => {
  it('resolves a Page-specific token when set', () => {
    process.env.META_PAGE_ACCESS_TOKEN_106658601471856 = 'gp-cafe-token';
    process.env.META_PAGE_ACCESS_TOKEN_211548128717427 = 'nitol-bot-token';

    expect(resolvePageAccessToken('106658601471856')).toBe('gp-cafe-token');
    expect(resolvePageAccessToken('211548128717427')).toBe('nitol-bot-token');
  });

  it('falls back to the generic token when no Page-specific one is set', () => {
    process.env.META_PAGE_ACCESS_TOKEN = 'generic-token';
    expect(resolvePageAccessToken('999999999')).toBe('generic-token');
  });

  it('prefers the Page-specific token over the generic fallback', () => {
    process.env.META_PAGE_ACCESS_TOKEN = 'generic-token';
    process.env.META_PAGE_ACCESS_TOKEN_106658601471856 = 'gp-cafe-token';
    expect(resolvePageAccessToken('106658601471856')).toBe('gp-cafe-token');
  });

  it('returns null when no token is configured for a Page at all', () => {
    expect(resolvePageAccessToken('unknown-page')).toBeNull();
  });
});
