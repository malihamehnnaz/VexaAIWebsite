// Date range resolution for Instagram endpoints. Simpler model than GA4's
// (src/lib/google/date-range.ts): a small preset set plus explicit
// start/endDate, and — unlike GA4's explicit-only comparison — `compare=true`
// auto-computes the immediately preceding equivalent-length period, per this
// feature's own spec. Only computed when the caller actually asks for it.

import { subDays, differenceInCalendarDays, format } from 'date-fns';

export type InstagramDatePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

const VALID_PRESETS: InstagramDatePreset[] = ['today', 'yesterday', '7d', '30d', '90d', 'custom'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ResolvedRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface InstagramDateRangeInfo {
  preset: InstagramDatePreset;
  start: string;
  end: string;
  comparisonStart: string | null;
  comparisonEnd: string | null;
}

export interface DateRangeResolution {
  info: InstagramDateRangeInfo;
  current: ResolvedRange;
  comparison: ResolvedRange | null;
}

export interface DateRangeError {
  error: string;
}

function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function presetToRange(preset: InstagramDatePreset, now: Date): ResolvedRange {
  switch (preset) {
    case 'today': { const d = ymd(now); return { startDate: d, endDate: d }; }
    case 'yesterday': { const d = ymd(subDays(now, 1)); return { startDate: d, endDate: d }; }
    case '7d': return { startDate: ymd(subDays(now, 6)), endDate: ymd(now) };
    case '30d': return { startDate: ymd(subDays(now, 29)), endDate: ymd(now) };
    case '90d': return { startDate: ymd(subDays(now, 89)), endDate: ymd(now) };
    default: return { startDate: ymd(now), endDate: ymd(now) }; // unreachable for 'custom' — caller supplies dates
  }
}

// Immediately preceding period of the same length — e.g. current = last 7
// days -> comparison = the 7 days before that, with no gap or overlap.
function previousEquivalentPeriod(current: ResolvedRange): ResolvedRange {
  const start = new Date(current.startDate);
  const end = new Date(current.endDate);
  const lengthDays = differenceInCalendarDays(end, start) + 1;
  const comparisonEnd = subDays(start, 1);
  const comparisonStart = subDays(comparisonEnd, lengthDays - 1);
  return { startDate: ymd(comparisonStart), endDate: ymd(comparisonEnd) };
}

export function resolveInstagramDateRangeParams(params: URLSearchParams): DateRangeResolution | DateRangeError {
  const startDateParam = params.get('startDate');
  const endDateParam = params.get('endDate');

  // Presence of explicit startDate/endDate implies range=custom even if not
  // stated, matching the query examples in the spec.
  const presetParam = (params.get('range') ?? (startDateParam || endDateParam ? 'custom' : '30d')) as InstagramDatePreset;
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

export function isInstagramDateRangeError(value: DateRangeResolution | DateRangeError): value is DateRangeError {
  return 'error' in value;
}

export interface MetricComparison {
  value: number | null;
  previousValue: number | null;
  changePercent: number | null;
}

// Never fabricates a comparison when either side is null/unavailable.
export function compareMetric(value: number | null, previousValue: number | null): MetricComparison {
  if (value == null || previousValue == null) {
    return { value, previousValue, changePercent: null };
  }
  const changePercent = previousValue === 0 ? null : ((value - previousValue) / previousValue) * 100;
  return { value, previousValue, changePercent };
}
