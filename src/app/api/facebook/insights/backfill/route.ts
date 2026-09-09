import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { backfillPageInsights } from '@/lib/facebook/backfill';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';

// POST /api/facebook/insights/backfill — deliberately triggered historical
// sync for Facebook Page organic Insights (see src/lib/facebook/backfill.ts
// for the chunking/idempotency contract). Not automatic — this app has no
// cron infrastructure anywhere; call this once (or re-run any time,
// harmlessly) to populate history, then /api/facebook/insights's normal
// request-time fetch-and-persist keeps it current going forward.
//
// Body (all optional): { days?: number (default/max 730), metrics?: string[] }
//
// Given the current, confirmed Meta-side token restriction (see
// src/lib/facebook/graph.ts), every chunk will presently come back with
// daysWritten:0 and a real Meta error attached — this endpoint still runs
// correctly and reports that honestly rather than failing outright, and
// will start actually writing history the moment that restriction is
// lifted, with no code change needed.

const DEFAULT_METRICS = ['page_total_media_view_unique', 'page_daily_follows_unique', 'page_follows', 'page_post_engagements', 'page_actions_post_reactions_total', 'page_video_views'];
const MAX_DAYS = 730;

async function getIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  // Tight — this can trigger a large number of Meta API calls per request.
  if (!await rateLimit(ip, 'facebook-insights-backfill', 3, '1 h')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  let body: { days?: number; metrics?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — use defaults
  }

  const days = typeof body.days === 'number' && body.days > 0 ? Math.min(body.days, MAX_DAYS) : MAX_DAYS;
  const metrics = Array.isArray(body.metrics) && body.metrics.every(m => typeof m === 'string') && body.metrics.length > 0
    ? body.metrics
    : DEFAULT_METRICS;

  try {
    const summary = await backfillPageInsights(GP_CAFE_PAGE_ID, metrics, days);
    return corsJson(request, { success: true, ...summary });
  } catch (err) {
    console.error('[api/facebook/insights/backfill] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "Backfill failed. Please try again." }, { status: 500 });
  }
}
