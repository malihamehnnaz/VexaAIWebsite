import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validatePlatform, validatePageId, validateCaption, validateSchedule, isValidationError } from './validation';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

describe('validatePlatform', () => {
  it('accepts facebook', () => expect(validatePlatform('facebook')).toBe(true));
  it('rejects instagram (not yet implemented for scheduling)', () => expect(validatePlatform('instagram')).toBe(false));
  it('rejects an unsupported platform', () => expect(validatePlatform('tiktok')).toBe(false));
  it('rejects a non-string', () => expect(validatePlatform(123)).toBe(false));
});

describe('validatePageId', () => {
  it('accepts the connected GP Page', () => expect(validatePageId(GP_CAFE_PAGE_ID)).toBe(true));
  it('rejects an arbitrary/unconnected page id', () => expect(validatePageId('999999999999999')).toBe(false));
});

describe('validateCaption', () => {
  it('requires a caption when there is no media', () => {
    const err = validateCaption('', undefined);
    expect(err?.field).toBe('caption');
  });

  it('allows an empty caption when media is provided', () => {
    expect(validateCaption('', ['https://example.com/a.jpg'])).toBeNull();
  });

  it('accepts a reasonable caption', () => {
    expect(validateCaption('Come visit us this weekend!', undefined)).toBeNull();
  });

  it('rejects an excessively long caption', () => {
    const err = validateCaption('x'.repeat(6000), undefined);
    expect(err?.field).toBe('caption');
  });
});

describe('validateSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T00:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('accepts a valid future date/time + timezone', () => {
    const result = validateSchedule('2026-09-20T18:30:00', 'Australia/Sydney');
    expect(isValidationError(result)).toBe(false);
    if (!isValidationError(result)) {
      expect(result.scheduledAtUtc).toBe('2026-09-20T08:30:00.000Z');
    }
  });

  it('rejects a past date/time', () => {
    const result = validateSchedule('2026-01-01T00:00:00', 'UTC');
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) expect(result.field).toBe('scheduledAt');
  });

  it('rejects a missing timezone', () => {
    const result = validateSchedule('2026-09-20T18:30:00', undefined);
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) expect(result.field).toBe('timezone');
  });

  it('rejects an invalid IANA timezone', () => {
    const result = validateSchedule('2026-09-20T18:30:00', 'Not/AZone');
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) expect(result.field).toBe('timezone');
  });

  it('rejects a missing scheduledAt', () => {
    const result = validateSchedule(undefined, 'UTC');
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) expect(result.field).toBe('scheduledAt');
  });

  it('allows requireFuture:false to bypass the future check (used internally where relevant)', () => {
    const result = validateSchedule('2026-01-01T00:00:00', 'UTC', { requireFuture: false });
    expect(isValidationError(result)).toBe(false);
  });
});
