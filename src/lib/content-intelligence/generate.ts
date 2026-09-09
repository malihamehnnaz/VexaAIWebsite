// AI Content Generation — turns one real ContentOpportunity into a draft.
// Reuses the existing Azure OpenAI configuration (src/lib/azure-openai.ts,
// same env vars as the chatbot) rather than a new AI vendor. Grounded in
// the specific opportunity's real topic/reason/evidence and the real
// restaurant context — never generic restaurant copy when that context is
// available (per requirement 5).
//
// This function ONLY produces a draft — see src/lib/content-intelligence/
// store.ts's saveGeneratedContent, which always inserts with status:
// 'draft'. Nothing here publishes anything (requirement 6).

import { getAzureOpenAIClient, getAzureOpenAIDeployment } from '@/lib/azure-openai';
import type { ContentOpportunity, RestaurantContext, GeneratedContentInput } from '@/lib/content-intelligence/types';

export class ContentGenerationError extends Error {
  constructor(message: string, public readonly code: 'not_configured' | 'generation_failed' | 'invalid_response') {
    super(message);
    this.name = 'ContentGenerationError';
  }
}

export interface GeneratedContentDraft {
  concept: string | null;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
  creativeBrief: string | null;
  videoScript: string | null;
  visualDirection: string | null;
}

const SYSTEM_PROMPT = `You are a social media content strategist for a real restaurant/café. You write concrete, specific content drafts grounded in the exact opportunity and restaurant context you're given — never generic restaurant filler. Never claim content will "go viral" or guarantee performance. Respond ONLY with a single JSON object matching this exact shape, no markdown fences, no commentary:
{"concept": string, "hook": string, "caption": string, "cta": string, "hashtags": string[], "creativeBrief": string, "videoScript": string|null, "visualDirection": string}
videoScript should be null unless the format is "reel" or "video".`;

function buildUserPrompt(opportunity: ContentOpportunity, context: RestaurantContext, input: GeneratedContentInput): string {
  const lines = [
    `Restaurant: ${context.pageName ?? '(name unavailable)'}`,
    context.instagramUsername ? `Instagram: @${context.instagramUsername}` : null,
    `Platform: ${input.platform}`,
    `Format: ${input.format}`,
    `Opportunity topic: ${opportunity.topic}`,
    `Opportunity title: ${opportunity.title}`,
    `Recommendation: ${opportunity.recommendation}`,
    `Why this opportunity scored well: ${opportunity.reason}`,
    `Supporting evidence: ${opportunity.supportingEvidence.join(' ')}`,
    input.objective ? `Objective: ${input.objective}` : null,
    input.tone ? `Tone: ${input.tone}` : null,
    input.additionalInstructions ? `Additional instructions: ${input.additionalInstructions}` : null,
  ].filter((l): l is string => !!l);
  return lines.join('\n');
}

export async function generateContentDraft(
  opportunity: ContentOpportunity,
  context: RestaurantContext,
  input: GeneratedContentInput
): Promise<GeneratedContentDraft> {
  const client = getAzureOpenAIClient();
  const deployment = getAzureOpenAIDeployment();
  if (!client || !deployment) {
    throw new ContentGenerationError('Azure OpenAI is not configured (AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY/AZURE_OPENAI_DEPLOYMENT)', 'not_configured');
  }

  let response;
  try {
    response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(opportunity, context, input) },
      ],
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    // Never include the raw error object (could carry request headers) —
    // message only.
    throw new ContentGenerationError(`Azure OpenAI request failed: ${err instanceof Error ? err.message : 'unknown error'}`, 'generation_failed');
  }

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new ContentGenerationError('Azure OpenAI returned no content', 'invalid_response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ContentGenerationError('Azure OpenAI response was not valid JSON', 'invalid_response');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ContentGenerationError('Azure OpenAI response was not a JSON object', 'invalid_response');
  }
  const p = parsed as Record<string, unknown>;

  return {
    concept: typeof p.concept === 'string' ? p.concept : null,
    hook: typeof p.hook === 'string' ? p.hook : null,
    caption: typeof p.caption === 'string' ? p.caption : null,
    cta: typeof p.cta === 'string' ? p.cta : null,
    hashtags: Array.isArray(p.hashtags) ? p.hashtags.filter((h): h is string => typeof h === 'string') : [],
    creativeBrief: typeof p.creativeBrief === 'string' ? p.creativeBrief : null,
    videoScript: typeof p.videoScript === 'string' ? p.videoScript : null,
    visualDirection: typeof p.visualDirection === 'string' ? p.visualDirection : null,
  };
}
