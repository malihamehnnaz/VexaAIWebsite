import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGoogleBusinessClient } from './client-factory';
import { fakeGoogleBusinessClient } from './fake-client';
import { realGoogleBusinessClient } from './real-client';

const ORIGINAL = process.env.GOOGLE_BUSINESS_CLIENT_MODE;

beforeEach(() => {
  delete process.env.GOOGLE_BUSINESS_CLIENT_MODE;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.GOOGLE_BUSINESS_CLIENT_MODE;
  else process.env.GOOGLE_BUSINESS_CLIENT_MODE = ORIGINAL;
});

describe('getGoogleBusinessClient', () => {
  it('defaults to the fake client when unset — never silently calls the real, possibly-unapproved API', () => {
    expect(getGoogleBusinessClient()).toBe(fakeGoogleBusinessClient);
  });

  it('uses the fake client for any value other than exactly "real"', () => {
    process.env.GOOGLE_BUSINESS_CLIENT_MODE = 'production'; // typo/garbage — must not accidentally select real
    expect(getGoogleBusinessClient()).toBe(fakeGoogleBusinessClient);
  });

  it('selects the real client only for GOOGLE_BUSINESS_CLIENT_MODE=real', () => {
    process.env.GOOGLE_BUSINESS_CLIENT_MODE = 'real';
    expect(getGoogleBusinessClient()).toBe(realGoogleBusinessClient);
  });
});
