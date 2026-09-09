// Historical backfill for Facebook Page organic Insights. A deliberately
// triggered, one-time (or re-runnable) action — distinct from the
// request-time fetch-and-persist that /api/facebook/insights already does
// for ongoing/incremental sync. This app has no cron/background-sync
// infrastructure anywhere (GA4, Search Console, and Instagram all rely on
// the same request-time model for keeping data fresh going forward), so
// backfill here is "run this once to fill history," not a new scheduler.
//
// Meta's Page Insights API caps any single since/until request at 90 days
// (src/lib/facebook/date-range.ts) and keeps at most ~2 years of history
// (confirmed against Meta's current docs, 2026-09-09) — so a full backfill
// chunks the requested period into <=90-day windows and fetches each in
// turn. Idempotent: every write goes through recordPageInsight's upsert on
// (page_id, post_id, metric, date), so re-running a backfill (in whole or
// overlapping a previous run) never creates duplicate rows and never
// clobbers a successfully-synced day with worse data — a failed chunk is
// skipped (logged) rather than aborting the whole backfill or writing a
// partial/invalid metric as if it were valid.

import { getPageInsight } from '@/lib/facebook/graph';
import { getGraphApiVersion } from '@/lib/meta/config';
import { recordPageInsight } from '@/lib/facebook/store';

const MAX_WINDOW_DAYS = 90;
const MAX_HISTORY_DAYS = 730; // Meta's current practical Page Insights retention (~2 years)

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function chunkDateRange(sinceDate: string, untilDate: string): Array<{ startDate: string; endDate: string }> {
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  let cursor = new Date(sinceDate);
  const end = new Date(untilDate);

  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + MAX_WINDOW_DAYS - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ startDate: ymd(cursor), endDate: ymd(chunkEnd) });
    cursor = new Date(chunkEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return chunks;
}

export interface BackfillChunkResult {
  startDate: string;
  endDate: string;
  metric: string;
  daysWritten: number;
  error: string | null;
}

export interface BackfillSummary {
  pageId: string;
  sinceDate: string;
  untilDate: string;
  chunks: BackfillChunkResult[];
  totalDaysWritten: number;
}

// metrics: which Page Insights metrics to backfill (defaults to the route's
// current FLOW_METRICS-equivalent set — kept as an explicit param here
// rather than importing from the route, so this lib has no dependency on
// the app/ layer).
export async function backfillPageInsights(
  pageId: string,
  metrics: string[],
  days: number = MAX_HISTORY_DAYS
): Promise<BackfillSummary> {
  const graphApiVersion = getGraphApiVersion();
  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - Math.min(days, MAX_HISTORY_DAYS) + 1);

  const windows = chunkDateRange(ymd(since), ymd(until));
  const chunks: BackfillChunkResult[] = [];
  let totalDaysWritten = 0;

  // Sequential, not concurrent — deliberately gentle on Meta's rate limits
  // for what can be a large number of calls (windows × metrics).
  for (const window of windows) {
    for (const metric of metrics) {
      try {
        const result = await getPageInsight(pageId, metric, window.startDate, window.endDate);
        if (result.unavailableReason) {
          chunks.push({ ...window, metric, daysWritten: 0, error: result.unavailableReason });
          continue;
        }
        // Never write a day with no real value as though it were a valid
        // measured metric — only persist rows Meta actually returned data
        // for.
        const validDays = result.daily.filter(d => d.value != null);
        await Promise.all(validDays.map(d =>
          recordPageInsight({ pageId, metric, value: d.value, date: d.date, graphApiVersion })
        ));
        totalDaysWritten += validDays.length;
        chunks.push({ ...window, metric, daysWritten: validDays.length, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[facebook-backfill] chunk failed (${metric}, ${window.startDate}..${window.endDate}):`, message);
        chunks.push({ ...window, metric, daysWritten: 0, error: message });
      }
    }
  }

  return { pageId, sinceDate: ymd(since), untilDate: ymd(until), chunks, totalDaysWritten };
}
