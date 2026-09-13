import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { runTick } from '@/lib/social-scheduling/worker';

// POST /api/social/scheduler/run — this IS the real server-side scheduler
// (see src/lib/social-scheduling/worker.ts's header comment for the full
// architecture rationale: this app runs on Vercel, which has no persistent
// worker process; this endpoint is the safe-to-call-repeatedly unit of
// work an external scheduler invokes on a schedule).
//
// Auth: the same shared bearer key as every other Vexa API (no new
// secret) — reused here for consistency with this app's "one shared
// secret, not one per integration" convention. Whatever process triggers
// this (an external cron service, per docs/social-scheduling.md) needs
// that same MESSENGER_API_KEY value. Being callable more often than
// strictly necessary is harmless — runTick() only ever acts on posts that
// are actually due, atomically claimed, so an extra/overlapping call just
// finds nothing new to do.
//
// GET is also accepted (not just POST) because some free external cron
// services (e.g. cron-job.org) only send GET requests to a URL — this
// endpoint has no request body regardless, so GET is not semantically
// wrong here the way it would be for the scheduled-posts write endpoints.

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

async function handle(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  // Generous — this is meant to be called every 1-5 minutes by an external
  // trigger; the limit is a safety net against a misconfigured trigger
  // hammering it, not a normal-use constraint.
  if (!await rateLimit(ip, 'social-scheduler-run', 30, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  try {
    const result = await runTick();
    return corsJson(request, { success: true, ...result });
  } catch (err) {
    console.error('[api/social/scheduler/run] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: 'Scheduler tick failed. Please check server logs.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
