import { describe, it, expect } from 'vitest';
import { stripResourcePrefix, stripAccountPrefix, stripLocationPrefix, toAccountResourceName, toLocationResourceName, ResourceIdError } from './resource-id';

describe('stripResourcePrefix', () => {
  it('strips a valid accounts/ prefix', () => {
    expect(stripResourcePrefix('accounts/123456789', 'accounts')).toBe('123456789');
  });

  it('strips a valid locations/ prefix', () => {
    expect(stripResourcePrefix('locations/987654321', 'locations')).toBe('987654321');
  });

  it('throws rather than silently double-prefixing when the prefix is already stripped', () => {
    // The exact failure mode this helper exists to prevent: calling it (or
    // string-concatenating) on an already-bare id must not produce
    // "accounts/accounts/123" — it must fail loudly instead.
    expect(() => stripResourcePrefix('123456789', 'accounts')).toThrow(ResourceIdError);
  });

  it('throws on the wrong prefix (accounts vs locations mismatch)', () => {
    expect(() => stripResourcePrefix('locations/123', 'accounts')).toThrow(ResourceIdError);
  });

  it('throws on an empty id after the prefix', () => {
    expect(() => stripResourcePrefix('accounts/', 'accounts')).toThrow(ResourceIdError);
  });

  it('throws if stripping would still leave a slash (nested/malformed resource name)', () => {
    expect(() => stripResourcePrefix('accounts/123/locations/456', 'accounts')).toThrow(ResourceIdError);
  });
});

describe('stripAccountPrefix / stripLocationPrefix', () => {
  it('are the accounts/locations-specific convenience wrappers', () => {
    expect(stripAccountPrefix('accounts/1')).toBe('1');
    expect(stripLocationPrefix('locations/2')).toBe('2');
  });
});

describe('round-trip', () => {
  it('toAccountResourceName/toLocationResourceName reverse the strip', () => {
    expect(stripAccountPrefix(toAccountResourceName('42'))).toBe('42');
    expect(stripLocationPrefix(toLocationResourceName('43'))).toBe('43');
  });
});
