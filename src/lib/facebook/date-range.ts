// Date range resolution for Facebook Page Insights endpoints. Mirrors
// src/lib/instagram/date-range.ts exactly (same preset set, same
// compare=true auto-computed previous-equivalent-period model) — kept as its
// own file rather than a shared import, consistent with how this codebase
// already keeps GA4's and Instagram's date-range logic separate per
// integration rather than a shared cross-platform module.
//
// One addition Instagram's version doesn't need: Meta's Page Insights API
// caps since/until at a 90-day window per request (confirmed against Meta's
// current docs, 2026-09-09) — enforced here so a bad request fails fast with
// a clear message instead of a confusing Graph API error.

import { subDays, differenceInCalendarDays, format } from 'date-fns';

export type FacebookDatePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

const VALID_PRESETS: FacebookDatePreset[] = ['today', 'yesterday', '7d', '30d', '90d', 'custom'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WINDOW_DAYS = 90;

export interface ResolvedRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface FacebookDateRangeInfo {
  preset: FacebookDatePreset;
  start: string;
  end: string;
  comparisonStart: string | null;
  comparisonEnd: string | null;
}

export interface DateRangeResolution {
  info: FacebookDateRangeInfo;
  current: ResolvedRange;
  comparison: ResolvedRange | null;
}

export interface DateRangeError {
  error: string;
}

function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function presetToRange(preset: FacebookDatePreset, now: Date): ResolvedRange {
  switch (preset) {
    case 'today': { const d = ymd(now); return { startDate: d, endDate: d }; }
    case 'yesterday': { const d = ymd(subDays(now, 1)); return { startDate: d, endDate: d }; }
    case '7d': return { startDate: ymd(subDays(now, 6)), endDate: ymd(now) };
    case '30d': return { startDate: ymd(subDays(now, 29)), endDate: ymd(now) };
    case '90d': return { startDate: ymd(subDays(now, 89)), endDate: ymd(now) };
    default: return { startDate: ymd(now), endDate: ymd(now) }; // unreachable for 'custom' — caller supplies dates
  }
}

function previousEquivalentPeriod(current: ResolvedRange): ResolvedRange {
  const start = new Date(current.startDate);
  const end = new Date(current.endDate);
  const lengthDays = differenceInCalendarDays(end, start) + 1;
  const comparisonEnd = subDays(start, 1);
  const comparisonStart = subDays(comparisonEnd, lengthDays - 1);
  return { startDate: ymd(comparisonStart), endDate: ymd(comparisonEnd) };
}

export function resolveFacebookDateRangeParams(params: URLSearchParams): DateRangeResolution | DateRangeError {
  const startDateParam = params.get('startDate');
  const endDateParam = params.get('endDate');

  const presetParam = (params.get('range') ?? (startDateParam || endDateParam ? 'custom' : '30d')) as FacebookDatePreset;
  if (!VALID_PRESETS.includes(presetParam)) {
    return { error: `Invalid range preset. Use one of: ${VALID_PRESETS.join(', ')}` };
  }

  let current: ResolvedRange;
  if (presetParam === 'custom') {
    if (!startDateParam || !endDateParam || !ISO_DATE.test(startDateParam) || !ISO_DATE.test(endDateParam)) {
      return { error: 'range=custom requires startDate and endDate as YYYY-MM-DD' };
    }
    if (new Date(startDateParam) > new Date(endDateParam)) {
      return { error: 'startDate must not be after endDate' };
    }
    current = { startDate: startDateParam, endDate: endDateParam };
  } else {
    current = presetToRange(presetParam, new Date());
  }

  const windowDays = differenceInCalendarDays(new Date(current.endDate), new Date(current.startDate)) + 1;
  if (windowDays > MAX_WINDOW_DAYS) {
    return { error: `Date range too wide — Meta's Page Insights API allows a maximum ${MAX_WINDOW_DAYS}-day window per request (requested ${windowDays} days)` };
  }

  const wantsComparison = params.get('compare') === 'true';
  const comparison = wantsComparison ? previousEquivalentPeriod(current) : null;

  return {
    current,
    comparison,
    info: {
      preset: presetParam,
      start: current.startDate,
      end: current.endDate,
      comparisonStart: comparison?.startDate ?? null,
      comparisonEnd: comparison?.endDate ?? null,
    },
  };
}

export function isFacebookDateRangeError(value: DateRangeResolution | DateRangeError): value is DateRangeError {
  return 'error' in value;
}

export interface MetricComparison {
  value: number | null;
  previousValue: number | null;
  changePercent: number | null;
}

export function compareMetric(value: number | null, previousValue: number | null): MetricComparison {
  if (value == null || previousValue == null) {
    return { value, previousValue, changePercent: null };
  }
  const changePercent = previousValue === 0 ? null : ((value - previousValue) / previousValue) * 100;
  return { value, previousValue, changePercent };
}
