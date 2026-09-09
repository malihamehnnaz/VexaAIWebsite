import { headers } from 'next/headers';
import { corsJson, corsPreflight, isAuthorizedRequest, unauthorizedResponse } from '@/lib/messenger-api';
import { rateLimit } from '@/lib/rate-limit';
import { getOpportunityById } from '@/lib/content-intelligence/store';
import { getRestaurantContext } from '@/lib/content-intelligence/restaurant-context';
import { generateContentDraft, ContentGenerationError } from '@/lib/content-intelligence/generate';
import { saveGeneratedContent } from '@/lib/content-intelligence/store';
import { scrubSecretsDeep } from '@/lib/content-intelligence/redact';
import type { GeneratedContentInput, Platform, ContentFormat } from '@/lib/content-intelligence/types';

// POST /api/content-intelligence/generate — turns one real, already-computed
// ContentOpportunity into an AI-generated draft. This endpoint ONLY creates
// a draft (status: 'draft') — it never publishes anything. Publishing is a
// separate, later, explicit operation not implemented here (requirement 6).
//
// Body: { opportunityId, platform, format, objective?, tone?, additionalInstructions? }

const VALID_PLATFORMS: Platform[] = ['facebook', 'instagram'];
const VALID_FORMATS: ContentFormat[] = ['photo', 'reel', 'video', 'carousel', 'story', 'text'];

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

interface RequestBody {
  opportunityId?: unknown;
  platform?: unknown;
  format?: unknown;
  objective?: unknown;
  tone?: unknown;
  additionalInstructions?: unknown;
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse(request);
  }

  const ip = await getIp();
  // Tighter — this calls a paid AI API per request.
  if (!await rateLimit(ip, 'content-intelligence-generate', 10, '1 m')) {
    return corsJson(request, { success: false, error: 'Rate limited' }, { status: 429 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return corsJson(request, { success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.opportunityId !== 'string' || !body.opportunityId) {
    return corsJson(request, { success: false, error: 'opportunityId is required' }, { status: 400 });
  }
  if (typeof body.platform !== 'string' || !VALID_PLATFORMS.includes(body.platform as Platform)) {
    return corsJson(request, { success: false, error: `platform is required and must be one of: ${VALID_PLATFORMS.join(', ')}` }, { status: 400 });
  }
  if (typeof body.format !== 'string' || !VALID_FORMATS.includes(body.format as ContentFormat)) {
    return corsJson(request, { success: false, error: `format is required and must be one of: ${VALID_FORMATS.join(', ')}` }, { status: 400 });
  }
  if (body.objective !== undefined && typeof body.objective !== 'string') {
    return corsJson(request, { success: false, error: 'objective must be a string' }, { status: 400 });
  }
  if (body.tone !== undefined && typeof body.tone !== 'string') {
    return corsJson(request, { success: false, error: 'tone must be a string' }, { status: 400 });
  }
  if (body.additionalInstructions !== undefined && typeof body.additionalInstructions !== 'string') {
    return corsJson(request, { success: false, error: 'additionalInstructions must be a string' }, { status: 400 });
  }

  const input: GeneratedContentInput = {
    opportunityId: body.opportunityId,
    platform: body.platform as Platform,
    format: body.format as ContentFormat,
    objective: (body.objective as string | undefined) ?? null,
    tone: (body.tone as string | undefined) ?? null,
    additionalInstructions: (body.additionalInstructions as string | undefined) ?? null,
  };

  try {
    const opportunity = await getOpportunityById(input.opportunityId);
    if (!opportunity) {
      return corsJson(request, { success: false, error: 'Opportunity not found. Fetch a current one from /api/content-intelligence/trends or /next-best-post first.' }, { status: 404 });
    }

    const context = await getRestaurantContext(opportunity.pageId);
    const draft = await generateContentDraft(opportunity, context, input);
    const saved = await saveGeneratedContent(opportunity.pageId, input, draft);

    return corsJson(request, scrubSecretsDeep({
      success: true,
      content: {
        id: saved.id,
        status: saved.status,
        concept: saved.concept,
        hook: saved.hook,
        caption: saved.caption,
        cta: saved.cta,
        hashtags: saved.hashtags,
        creativeBrief: saved.creativeBrief,
        videoScript: saved.videoScript,
        visualDirection: saved.visualDirection,
      },
    }));
  } catch (err) {
    if (err instanceof ContentGenerationError) {
      const status = err.code === 'not_configured' ? 503 : 502;
      console.error('[api/content-intelligence/generate] generation error:', err.code, err.message);
      return corsJson(request, { success: false, error: { type: err.code.toUpperCase(), message: 'Unable to generate content right now.' } }, { status });
    }
    console.error('[api/content-intelligence/generate] error:', err instanceof Error ? err.message : err);
    return corsJson(request, { success: false, error: "We couldn't generate content right now. Please try again." }, { status: 500 });
  }
}
