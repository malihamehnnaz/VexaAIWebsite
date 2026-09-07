// Shared date-range resolution for every /api/google/analytics/* endpoint —
// one consistent set of presets + explicit comparison support, rather than
// each route inventing its own ?days=N handling (which is all the 4
// original endpoints had). Calendar-based presets (this_month, last_month,
// this_year) need real calendar dates, since GA4's own relative-date syntax
// only understands "today"/"yesterday"/"NdaysAgo" — computed with date-fns
// (already a project dependency) rather than hand-rolled date math.

import { startOfMonth, endOfMonth, subMonths, startOfYear, subDays, format } from 'date-fns';

export type DatePreset = 'today' | 'yesterday' | '7d' | '28d' | '30d' | '90d' | 'this_month' | 'last_month' | 'this_year' | 'custom';

const VALID_PRESETS: DatePreset[] = ['today', 'yesterday', '7d', '28d', '30d', '90d', 'this_month', 'last_month', 'this_year', 'custom'];

export interface ResolvedRange {
  startDate: string;
  endDate: string;
}

export interface ResolvedDateRangeInfo {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  comparisonStartDate: string | null;
  comparisonEndDate: string | null;
}

export interface DateRangeResolution {
  info: ResolvedDateRangeInfo;
  current: ResolvedRange;
  comparison: ResolvedRange | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function presetToRange(preset: DatePreset, now: Date): ResolvedRange | null {
  switch (preset) {
    case 'today': return { startDate: 'today', endDate: 'today' };
    case 'yesterday': return { startDate: 'yesterday', endDate: 'yesterday' };
    case '7d': return { startDate: '7daysAgo', endDate: 'today' };
    case '28d': return { startDate: '28daysAgo', endDate: 'today' };
    case '30d': return { startDate: '30daysAgo', endDate: 'today' };
    case '90d': return { startDate: '90daysAgo', endDate: 'today' };
    case 'this_month': return { startDate: ymd(startOfMonth(now)), endDate: ymd(now) };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return { startDate: ymd(startOfMonth(lastMonth)), endDate: ymd(endOfMonth(lastMonth)) };
    }
    case 'this_year': return { startDate: ymd(startOfYear(now)), endDate: ymd(now) };
    default: return null;
  }
}

export interface DateRangeError {
  error: string;
}

// Reads: range (preset name, default '28d'), startDate/endDate (required
// when range=custom), comparisonStartDate/comparisonEndDate (optional,
// either both or neither — no auto-computed "previous period" magic, since
// what that should mean for a calendar preset like this_month is genuinely
// ambiguous; the caller passes exact dates if it wants a comparison).
export function resolveDateRangeParams(params: URLSearchParams): DateRangeResolution | DateRangeError {
  const presetParam = (params.get('range') ?? '28d') as DatePreset;
  if (!VALID_PRESETS.includes(presetParam)) {
    return { error: `Invalid range preset. Use one of: ${VALID_PRESETS.join(', ')}` };
  }

  let current: ResolvedRange;
  if (presetParam === 'custom') {
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    if (!startDate || !endDate || !ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
      return { error: 'range=custom requires startDate and endDate as YYYY-MM-DD' };
    }
    current = { startDate, endDate };
  } else {
    current = presetToRange(presetParam, new Date())!;
  }

  const comparisonStartDate = params.get('comparisonStartDate');
  const comparisonEndDate = params.get('comparisonEndDate');
  let comparison: ResolvedRange | null = null;

  if (comparisonStartDate || comparisonEndDate) {
    if (!comparisonStartDate || !comparisonEndDate || !ISO_DATE.test(comparisonStartDate) || !ISO_DATE.test(comparisonEndDate)) {
      return { error: 'comparisonStartDate and comparisonEndDate must both be provided as YYYY-MM-DD' };
    }
    comparison = { startDate: comparisonStartDate, endDate: comparisonEndDate };
  }

  return {
    current,
    comparison,
    info: {
      preset: presetParam,
      startDate: current.startDate,
      endDate: current.endDate,
      comparisonStartDate: comparison?.startDate ?? null,
      comparisonEndDate: comparison?.endDate ?? null,
    },
  };
}

export function isDateRangeError(value: DateRangeResolution | DateRangeError): value is DateRangeError {
  return 'error' in value;
}

// GA4 accepts relative forms ("28daysAgo", "today"); Search Console's API
// requires concrete YYYY-MM-DD. This converts a resolved range into concrete
// dates so both integrations can share one preset vocabulary and one set of
// query params, rather than the Marketing Website having to learn two.
export function toConcreteDates(range: ResolvedRange): ResolvedRange {
  const now = new Date();

  const convert = (value: string): string => {
    if (ISO_DATE.test(value)) return value;
    if (value === 'today') return ymd(now);
    if (value === 'yesterday') return ymd(subDays(now, 1));
    const relative = /^(\d+)daysAgo$/.exec(value);
    if (relative) return ymd(subDays(now, parseInt(relative[1], 10)));
    return value; // unrecognized — pass through rather than guess
  };

  return { startDate: convert(range.startDate), endDate: convert(range.endDate) };
}

// current/comparison/absoluteDiff/percentDiff for one numeric metric — used
// wherever a comparison range was actually requested; never fabricated when
// one wasn't.
export interface ComparedValue {
  current: number;
  comparison: number | null;
  absoluteDiff: number | null;
  percentDiff: number | null;
}

export function compareValue(current: number, comparison: number | null): ComparedValue {
  if (comparison == null) {
    return { current, comparison: null, absoluteDiff: null, percentDiff: null };
  }
  const absoluteDiff = current - comparison;
  const percentDiff = comparison === 0 ? null : (absoluteDiff / comparison) * 100;
  return { current, comparison, absoluteDiff, percentDiff };
}

// Null-safe variant, for sources (like Search Console) that legitimately
// return "no data" for a metric. A missing value on either side stays null
// rather than being coerced to 0, which would misreport absent data as a
// measured zero and produce a meaningless diff.
export interface NullableComparedValue {
  current: number | null;
  comparison: number | null;
  absoluteDiff: number | null;
  percentDiff: number | null;
}

export function compareNullableValue(current: number | null, comparison: number | null): NullableComparedValue {
  if (current == null || comparison == null) {
    return { current, comparison, absoluteDiff: null, percentDiff: null };
  }
  const absoluteDiff = current - comparison;
  const percentDiff = comparison === 0 ? null : (absoluteDiff / comparison) * 100;
  return { current, comparison, absoluteDiff, percentDiff };
}
