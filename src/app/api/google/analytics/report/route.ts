import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { runCustomReport, Ga4ApiError } from '@/lib/google/ga4';
import { getMetadata, checkFieldsExist } from '@/lib/google/metadata';
import { googleErrorResponse } from '@/lib/google/respond';
import { resolveDateRangeParams, isDateRangeError } from '@/lib/google/date-range';

// GET /api/google/analytics/report?metrics=a,b&dimensions=c,d&range=28d&limit=50
// Report Explorer — arbitrary caller-specified dimensions/metrics. Every
// requested field is checked against this property's REAL metadata
// (src/lib/google/metadata.ts) before ever being sent to GA4, so an unknown
// field name gets a clear invalidDimensions/invalidMetrics list instead of
// an opaque Google error. A combination that passes that check can still be
// jointly incompatible per GA4's own compatibility rules (e.g. some
// dimension/metric pairs can't appear together even if each individually
// exists) — that case surfaces GA4's own error message, since this endpoint
// exists specifically for callers experimenting with field combinations.
// Not cached — an explorer endpoint's parameter space is unbounded, so a
// cache here would mostly just accumulate misses.

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;

  const metricsParam = params.get('metrics');
  if (!metricsParam) {
    return NextResponse.json({ success: false, error: 'metrics is required (comma-separated GA4 metric API names)' }, { status: 400 });
  }
  const metrics = metricsParam.split(',').map(s => s.trim()).filter(Boolean);
  const dimensions = (params.get('dimensions') ?? '').split(',').map(s => s.trim()).filter(Boolean);

  const resolved = resolveDateRangeParams(params);
  if (isDateRangeError(resolved)) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
  }

  const limitParam = params.get('limit');
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 250) : 50;

  try {
    const { accessToken, propertyId } = await getValidAccessToken();

    const metadata = await getMetadata(accessToken, propertyId);
    const compatibility = checkFieldsExist(metadata, dimensions, metrics);
    if (!compatibility.ok) {
      return NextResponse.json({
        success: false,
        error: 'One or more requested fields do not exist on this GA4 property',
        invalidDimensions: compatibility.invalidDimensions,
        invalidMetrics: compatibility.invalidMetrics,
      }, { status: 400 });
    }

    let rows: Array<Record<string, string>>;
    try {
      rows = await runCustomReport(accessToken, propertyId, dimensions, metrics, resolved.current, limit);
    } catch (err) {
      if (err instanceof Ga4ApiError) {
        // Surfaced verbatim here (unlike the fixed reports) — this endpoint
        // is specifically for callers experimenting with combinations, and
        // GA4's own message says which fields are jointly incompatible.
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({ success: true, propertyId, dateRange: resolved.info, dimensions, metrics, rows });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
