import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { validateMedia, validateCaption, validateSchedule, isValidationError } from '@/lib/social-scheduling/validation';
import { getScheduledPostById, updateScheduledPost, ScheduledPostNotFoundError, NotEditableError } from '@/lib/social-scheduling/store';

// GET   /api/social/scheduled-posts/:id — full status.
// PATCH /api/social/scheduled-posts/:id — edit/reschedule; only while still
//       editable (schedule_pending | scheduled | failed) — a post already
//       publishing or published is never silently modified.

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

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'social-scheduled-post-get', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { id } = await params;
  try {
    const post = await getScheduledPostById(id);
    if (!post) return corsJson(request, { success: false, error: 'Not found' }, { status: 404 });
    return corsJson(request, { success: true, post });
  } catch (err) {
    console.error('[api/social/scheduled-posts/:id] get error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load that scheduled post." }, { status: 500 });
  }
}

interface PatchBody {
  caption?: unknown;
  mediaUrls?: unknown;
  scheduledAt?: unknown;
  timezone?: unknown;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'social-scheduled-post-patch', 30, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return corsJson(request, { success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: { caption?: string; mediaUrls?: string[]; scheduledAtUtc?: string; timezone?: string } = {};

  if (body.mediaUrls !== undefined) {
    const mediaError = validateMedia(body.mediaUrls);
    if (mediaError) return corsJson(request, { success: false, error: mediaError.message, field: mediaError.field }, { status: 400 });
    patch.mediaUrls = body.mediaUrls as string[];
  }
  if (body.caption !== undefined) {
    const captionError = validateCaption(body.caption, patch.mediaUrls);
    if (captionError) return corsJson(request, { success: false, error: captionError.message, field: captionError.field }, { status: 400 });
    patch.caption = body.caption as string;
  }
  if (body.scheduledAt !== undefined || body.timezone !== undefined) {
    if (body.scheduledAt === undefined || body.timezone === undefined) {
      return corsJson(request, { success: false, error: 'scheduledAt and timezone must be updated together' }, { status: 400 });
    }
    const schedule = validateSchedule(body.scheduledAt, body.timezone);
    if (isValidationError(schedule)) return corsJson(request, { success: false, error: schedule.message, field: schedule.field }, { status: 400 });
    patch.scheduledAtUtc = schedule.scheduledAtUtc;
    patch.timezone = body.timezone as string;
  }

  if (Object.keys(patch).length === 0) {
    return corsJson(request, { success: false, error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const post = await updateScheduledPost(id, patch);
    return corsJson(request, { success: true, post });
  } catch (err) {
    if (err instanceof ScheduledPostNotFoundError) {
      return corsJson(request, { success: false, error: 'Not found' }, { status: 404 });
    }
    if (err instanceof NotEditableError) {
      return corsJson(request, { success: false, error: `Cannot modify a post that is already "${err.currentStatus}"` }, { status: 409 });
    }
    console.error('[api/social/scheduled-posts/:id] patch error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't update that scheduled post." }, { status: 500 });
  }
}
