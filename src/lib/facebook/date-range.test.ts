import { describe, it, expect } from 'vitest';
import { resolveFacebookDateRangeParams, isFacebookDateRangeError, compareMetric } from './date-range';

// Covers requirement 9's "date-range synchronization" scenario.

describe('resolveFacebookDateRangeParams', () => {
  it('defaults to a 30d preset with no params', () => {
    const result = resolveFacebookDateRangeParams(new URLSearchParams());
    expect(isFacebookDateRangeError(result)).toBe(false);
    if (!isFacebookDateRangeError(result)) {
      expect(result.info.preset).toBe('30d');
      expect(result.comparison).toBeNull();
    }
  });

  it('accepts a valid custom range within the 90-day window', () => {
    const params = new URLSearchParams({ range: 'custom', startDate: '2026-08-01', endDate: '2026-08-10' });
    const result = resolveFacebookDateRangeParams(params);
    expect(isFacebookDateRangeError(result)).toBe(false);
    if (!isFacebookDateRangeError(result)) {
      expect(result.current).toEqual({ startDate: '2026-08-01', endDate: '2026-08-10' });
    }
  });

  it('rejects a custom range wider than Meta\'s 90-day Page Insights cap', () => {
    const params = new URLSearchParams({ range: 'custom', startDate: '2026-01-01', endDate: '2026-08-01' });
    const result = resolveFacebookDateRangeParams(params);
    expect(isFacebookDateRangeError(result)).toBe(true);
    if (isFacebookDateRangeError(result)) {
      expect(result.error).toMatch(/90-day/);
    }
  });

  it('rejects startDate after endDate', () => {
    const params = new URLSearchParams({ range: 'custom', startDate: '2026-08-10', endDate: '2026-08-01' });
    const result = resolveFacebookDateRangeParams(params);
    expect(isFacebookDateRangeError(result)).toBe(true);
  });

  it('rejects an unknown preset', () => {
    const result = resolveFacebookDateRangeParams(new URLSearchParams({ range: 'nonsense' }));
    expect(isFacebookDateRangeError(result)).toBe(true);
  });

  it('computes a non-overlapping, equal-length comparison period when compare=true', () => {
    const params = new URLSearchParams({ range: 'custom', startDate: '2026-08-01', endDate: '2026-08-10', compare: 'true' });
    const result = resolveFacebookDateRangeParams(params);
    expect(isFacebookDateRangeError(result)).toBe(false);
    if (!isFacebookDateRangeError(result)) {
      expect(result.comparison).toEqual({ startDate: '2026-07-22', endDate: '2026-07-31' });
    }
  });

  it('does not compute a comparison period when compare is absent', () => {
    const params = new URLSearchParams({ range: '7d' });
    const result = resolveFacebookDateRangeParams(params);
    expect(isFacebookDateRangeError(result)).toBe(false);
    if (!isFacebookDateRangeError(result)) {
      expect(result.comparison).toBeNull();
    }
  });
});

describe('compareMetric', () => {
  it('never fabricates a comparison when either side is null', () => {
    expect(compareMetric(null, 100)).toEqual({ value: null, previousValue: 100, changePercent: null });
    expect(compareMetric(100, null)).toEqual({ value: 100, previousValue: null, changePercent: null });
  });

  it('computes a real percent change from two real values', () => {
    const result = compareMetric(150, 100);
    expect(result.changePercent).toBe(50);
  });

  it('does not divide by zero when the previous value is 0', () => {
    const result = compareMetric(10, 0);
    expect(result.changePercent).toBeNull();
  });
});
