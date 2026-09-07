// Shared request handling for the dimension-based Search Console endpoints
// (queries / pages / countries / devices / search-appearance). They differ
// only by which Google dimension they group on, so the auth, date-range,
// property resolution, caching, pagination, sorting, filtering and
// comparison logic lives here once rather than being copy-pasted five times.

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError, toConcreteDates } from '@/lib/google/date-range';
import { withCache } from '@/lib/google/cache';
import { rateLimit } from '@/lib/rate-limit';
import { getByDimension, type SearchConsoleDimension, type SearchConsoleDimensionRow } from '@/lib/google/search-console';
import { resolveProperty } from '@/lib/google/search-console-property';

const CACHE_TTL_SECONDS = 900; // Search Console data updates at most daily

type SortField = 'clicks' | 'impressions' | 'ctr' | 'position';
const SORT_FIELDS: SortField[] = ['clicks', 'impressions', 'ctr', 'position'];

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const n = parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export interface DimensionRowWithComparison extends SearchConsoleDimensionRow {
  previous: { clicks: number | null; impressions: number | null; ctr: number | null; position: number | null } | null;
}

export async function handleDimensionRoute(
  request: Request,
  dimension: SearchConsoleDimension,
  rateLimitName: string
): Promise<NextResponse> {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  const ip = await getIp();
  if (!await rateLimit(ip, rateLimitName, 60, '1 m')) {
    return NextResponse.json({ success: false, error: 'Rate limited', code: 'rate_limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;

  const resolved = resolveDateRangeParams(params);
  if (isDateRangeError(resolved)) {
    return NextResponse.json({ success: false, error: resolved.error, code: 'invalid_date_range' }, { status: 400 });
  }

  const sort = (params.get('sort') ?? 'clicks') as SortField;
  if (!SORT_FIELDS.includes(sort)) {
    return NextResponse.json({ success: false, error: `Invalid sort field. Use one of: ${SORT_FIELDS.join(', ')}`, code: 'invalid_sort' }, { status: 400 });
  }
  // Position is "better when lower", so it defaults to ascending; the
  // volume metrics default to descending.
  const order = params.get('order') ?? (sort === 'position' ? 'asc' : 'desc');
  if (order !== 'asc' && order !== 'desc') {
    return NextResponse.json({ success: false, error: "Invalid order. Use 'asc' or 'desc'", code: 'invalid_order' }, { status: 400 });
  }

  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '25', 10) || 25, 1), 1000);
  const offset = decodeCursor(params.get('cursor'));
  const filter = params.get('filter');

  try {
    const { accessToken } = await getValidAccessToken();
    const property = await resolveProperty(accessToken, params.get('property'));

    const current = toConcreteDates(resolved.current);
    const comparison = resolved.comparison ? toConcreteDates(resolved.comparison) : null;

    const cacheKey = `sc:${dimension}:${property}:${JSON.stringify({ current, comparison, limit, offset, filter })}`;
    const { rows, previousRows } = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
      const [rows, previousRows] = await Promise.all([
        getByDimension(accessToken, property, dimension, current.startDate, current.endDate, {
          rowLimit: limit,
          startRow: offset,
          filterExpression: filter ?? undefined,
        }),
        comparison
          ? getByDimension(accessToken, property, dimension, comparison.startDate, comparison.endDate, {
              rowLimit: 25000, // need the full comparison set to match keys against
              filterExpression: filter ?? undefined,
            })
          : Promise.resolve(null),
      ]);
      return { rows, previousRows };
    });

    const previousByKey = new Map((previousRows ?? []).map(r => [r.key, r]));

    const sorted = [...rows].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      // Rows missing this metric sort last regardless of direction, rather
      // than being treated as zero.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return order === 'asc' ? av - bv : bv - av;
    });

    const items: DimensionRowWithComparison[] = sorted.map(row => {
      const prev = previousByKey.get(row.key);
      return {
        ...row,
        // null (not zeros) when this key had no data in the comparison
        // period — "didn't appear" is not the same as "measured zero".
        previous: comparison
          ? prev
            ? { clicks: prev.clicks, impressions: prev.impressions, ctr: prev.ctr, position: prev.position }
            : null
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      property,
      dimension,
      dateRange: resolved.info,
      sort: { field: sort, order },
      rows: items,
      pagination: {
        limit,
        // Search Console doesn't report a total row count; a full page back
        // means there may be more, which is all we can honestly say.
        nextCursor: rows.length === limit ? encodeCursor(offset + limit) : null,
      },
    });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
