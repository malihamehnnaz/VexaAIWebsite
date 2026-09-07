import { handleDimensionRoute } from '@/lib/google/search-console-route';

// GET /api/search-console/queries — Search Console data grouped by the
// `query` dimension. Shared handling (auth, date range + comparison,
// property resolution, caching, pagination, sorting, filtering) lives in
// src/lib/google/search-console-route.ts.
//
// Query params: property, range|startDate|endDate,
// comparisonStartDate/comparisonEndDate, sort, order, limit, cursor, filter.

export async function GET(request: Request) {
  return handleDimensionRoute(request, 'query', 'sc-queries');
}
