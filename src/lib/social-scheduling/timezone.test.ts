import { describe, it, expect } from 'vitest';
import { localTimeToUtcInstant, formatInstantForDisplay, isValidIanaTimezone, InvalidTimezoneError } from './timezone';

describe('isValidIanaTimezone', () => {
  it('accepts a real IANA zone', () => {
    expect(isValidIanaTimezone('Australia/Sydney')).toBe(true);
    expect(isValidIanaTimezone('Europe/Stockholm')).toBe(true);
    expect(isValidIanaTimezone('UTC')).toBe(true);
  });

  it('rejects a bogus zone name', () => {
    expect(isValidIanaTimezone('Not/AZone')).toBe(false);
    expect(isValidIanaTimezone('')).toBe(false);
  });
});

describe('localTimeToUtcInstant — DST correctness', () => {
  it('converts a Sydney local time to the correct UTC instant before DST starts (AEST, UTC+10)', () => {
    const instant = localTimeToUtcInstant('2026-09-20T18:30:00', 'Australia/Sydney');
    expect(instant.toISOString()).toBe('2026-09-20T08:30:00.000Z');
  });

  it('converts a Sydney local time to the correct UTC instant AFTER DST starts (AEDT, UTC+11) — the same wall-clock time yields a different UTC offset', () => {
    const instant = localTimeToUtcInstant('2026-10-20T18:30:00', 'Australia/Sydney');
    expect(instant.toISOString()).toBe('2026-10-20T07:30:00.000Z');
  });

  it('handles a zone with no DST (UTC) as a pure passthrough', () => {
    const instant = localTimeToUtcInstant('2026-09-20T18:30:00', 'UTC');
    expect(instant.toISOString()).toBe('2026-09-20T18:30:00.000Z');
  });

  it('throws InvalidTimezoneError for a bogus zone rather than silently misinterpreting the time', () => {
    expect(() => localTimeToUtcInstant('2026-09-20T18:30:00', 'Not/AZone')).toThrow(InvalidTimezoneError);
  });

  it('throws for a malformed local date/time string', () => {
    expect(() => localTimeToUtcInstant('not-a-date', 'UTC')).toThrow();
  });
});

describe('formatInstantForDisplay', () => {
  it('formats a stored UTC instant back into the original timezone for display', () => {
    const display = formatInstantForDisplay('2026-09-20T08:30:00.000Z', 'Australia/Sydney');
    expect(display).toBe('20 Sep 2026, 18:30');
  });

  it('round-trips through localTimeToUtcInstant correctly', () => {
    const instant = localTimeToUtcInstant('2026-09-20T18:30:00', 'Australia/Sydney');
    expect(formatInstantForDisplay(instant, 'Australia/Sydney')).toBe('20 Sep 2026, 18:30');
  });
});
