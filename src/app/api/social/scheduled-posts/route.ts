import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { validatePlatform, validatePageId, validateCaption, validateMedia, validateSchedule, isValidationError } from '@/lib/social-scheduling/validation';
import { createScheduledPost, listScheduledPosts } from '@/lib/social-scheduling/store';
import type { ScheduledPostStatus, Platform } from '@/lib/social-scheduling/types';

// POST /api/social/scheduled-posts — create a scheduled Facebook Page post.
// GET  /api/social/scheduled-posts?platform=&status=&from=&to=&cursor= — list.
//
// Auth: bearer only (same as Messenger/Facebook Comments/Instagram/Content
// Intelligence) — this is an external-consumer-only API, no Vexa dashboard
// UI reads it.

const VALID_STATUSES: ScheduledPostStatus[] = ['schedule_pending', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'];

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

interface CreateBody {
  platform?: unknown;
  pageId?: unknown;
  caption?: unknown;
  mediaUrls?: unknown;
  scheduledAt?: unknown;
  timezone?: unknown;
  opportunityId?: unknown;
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'social-scheduled-posts-create', 30, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return corsJson(request, { success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!validatePlatform(body.platform)) {
    return corsJson(request, { success: false, error: 'platform is required and must be a supported platform (facebook)' }, { status: 400 });
  }
  if (!validatePageId(body.pageId)) {
    return corsJson(request, { success: false, error: 'pageId is required and must be a connected, supported Facebook Page' }, { status: 400 });
  }
  const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls as string[] : undefined;
  const mediaError = validateMedia(body.mediaUrls);
  if (mediaError) return corsJson(request, { success: false, error: mediaError.message, field: mediaError.field }, { status: 400 });
  const captionError = validateCaption(body.caption, mediaUrls);
  if (captionError) return corsJson(request, { success: false, error: captionError.message, field: captionError.field }, { status: 400 });
  const schedule = validateSchedule(body.scheduledAt, body.timezone);
  if (isValidationError(schedule)) return corsJson(request, { success: false, error: schedule.message, field: schedule.field }, { status: 400 });
  if (body.opportunityId !== undefined && typeof body.opportunityId !== 'string') {
    return corsJson(request, { success: false, error: 'opportunityId must be a string' }, { status: 400 });
  }

  try {
    const post = await createScheduledPost({
      platform: body.platform as Platform,
      pageId: body.pageId as string,
      caption: typeof body.caption === 'string' ? body.caption : '',
      mediaUrls,
      scheduledAt: body.scheduledAt as string,
      timezone: body.timezone as string,
      opportunityId: (body.opportunityId as string | undefined) ?? null,
      scheduledAtUtc: schedule.scheduledAtUtc,
    });
    console.log('[social-scheduling] schedule_created', { id: post.id, platform: post.platform, pageId: post.pageId });
    return corsJson(request, { success: true, post }, { status: 201 });
  } catch (err) {
    console.error('[api/social/scheduled-posts] create error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't create the scheduled post. Please try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  if (!await rateLimit(ip, 'social-scheduled-posts-list', 60, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const platform = params.get('platform') ?? undefined;
  const status = params.get('status') ?? undefined;
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  const cursor = params.get('cursor') ?? undefined;

  if (platform && !validatePlatform(platform)) {
    return corsJson(request, { success: false, error: 'Invalid platform filter' }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status as ScheduledPostStatus)) {
    return corsJson(request, { success: false, error: `Invalid status filter. Use one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    const { posts, nextCursor } = await listScheduledPosts({
      platform: platform as Platform | undefined,
      status: status as ScheduledPostStatus | undefined,
      from,
      to,
      cursor,
    });
    return corsJson(request, { success: true, posts, nextCursor });
  } catch (err) {
    console.error('[api/social/scheduled-posts] list error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't load scheduled posts. Please try again." }, { status: 500 });
  }
}
