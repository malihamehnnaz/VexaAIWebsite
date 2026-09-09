import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getAzureOpenAIClientMock, getAzureOpenAIDeploymentMock } = vi.hoisted(() => ({
  getAzureOpenAIClientMock: vi.fn(),
  getAzureOpenAIDeploymentMock: vi.fn(),
}));
vi.mock('@/lib/azure-openai', () => ({ getAzureOpenAIClient: getAzureOpenAIClientMock, getAzureOpenAIDeployment: getAzureOpenAIDeploymentMock }));

import { generateContentDraft, ContentGenerationError } from './generate';
import type { ContentOpportunity, RestaurantContext, GeneratedContentInput } from './types';

const OPPORTUNITY: ContentOpportunity = {
  id: 'op-1', pageId: '106658601471856', title: 'Post about smashburgers', recommendation: 'Do X', topic: 'smashburgers',
  format: 'reel', reason: 'Trending', trendSignalId: null, trendScore: 80, audienceFitScore: 70, historicalFitScore: 60,
  freshnessScore: 90, opportunityScore: 75, confidence: 'medium', recommendedDay: 'Saturday', recommendedTime: '12:00 UTC',
  supportingEvidence: ['evidence 1'], computedAt: '2026-09-09T00:00:00Z',
};
const CONTEXT: RestaurantContext = { pageId: '106658601471856', pageName: "GP's Café", instagramUsername: 'gp', instagramFollowers: 9000, facebookFollowers: 2400 };
const INPUT: GeneratedContentInput = { opportunityId: 'op-1', platform: 'instagram', format: 'reel', tone: 'playful' };

beforeEach(() => {
  getAzureOpenAIClientMock.mockReset();
  getAzureOpenAIDeploymentMock.mockReset();
});

describe('generateContentDraft', () => {
  it('throws a "not_configured" error when Azure OpenAI is not set up, rather than fabricating content', async () => {
    getAzureOpenAIClientMock.mockReturnValue(null);
    getAzureOpenAIDeploymentMock.mockReturnValue(null);

    await expect(generateContentDraft(OPPORTUNITY, CONTEXT, INPUT)).rejects.toThrow(ContentGenerationError);
    await expect(generateContentDraft(OPPORTUNITY, CONTEXT, INPUT)).rejects.toMatchObject({ code: 'not_configured' });
  });

  it('parses a valid JSON completion into a structured draft', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ concept: 'c', hook: 'h', caption: 'cap', cta: 'cta', hashtags: ['#food', '#cafe'], creativeBrief: 'brief', videoScript: 'script', visualDirection: 'vd' }) } }],
    });
    getAzureOpenAIClientMock.mockReturnValue({ chat: { completions: { create } } });
    getAzureOpenAIDeploymentMock.mockReturnValue('gpt-4.1');

    const draft = await generateContentDraft(OPPORTUNITY, CONTEXT, INPUT);
    expect(draft.concept).toBe('c');
    expect(draft.hashtags).toEqual(['#food', '#cafe']);
    expect(draft.videoScript).toBe('script');
  });

  it('grounds the prompt in the real opportunity topic and restaurant context, not generic filler', async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
    getAzureOpenAIClientMock.mockReturnValue({ chat: { completions: { create } } });
    getAzureOpenAIDeploymentMock.mockReturnValue('gpt-4.1');

    await generateContentDraft(OPPORTUNITY, CONTEXT, INPUT);
    const userMessage = create.mock.calls[0][0].messages.find((m: { role: string }) => m.role === 'user').content;
    expect(userMessage).toContain('smashburgers');
    expect(userMessage).toContain("GP's Café");
    expect(userMessage).toContain('playful');
  });

  it('throws "invalid_response" for non-JSON completion content', async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'not json at all' } }] });
    getAzureOpenAIClientMock.mockReturnValue({ chat: { completions: { create } } });
    getAzureOpenAIDeploymentMock.mockReturnValue('gpt-4.1');

    await expect(generateContentDraft(OPPORTUNITY, CONTEXT, INPUT)).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('throws "generation_failed" (with a safe message, not the raw error) when the API call throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('rate limited'));
    getAzureOpenAIClientMock.mockReturnValue({ chat: { completions: { create } } });
    getAzureOpenAIDeploymentMock.mockReturnValue('gpt-4.1');

    await expect(generateContentDraft(OPPORTUNITY, CONTEXT, INPUT)).rejects.toMatchObject({ code: 'generation_failed' });
  });

  it('never sets videoScript for a non-video/reel format request when the model omits it, without inventing one', async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ concept: 'c', caption: 'cap' }) } }] });
    getAzureOpenAIClientMock.mockReturnValue({ chat: { completions: { create } } });
    getAzureOpenAIDeploymentMock.mockReturnValue('gpt-4.1');

    const draft = await generateContentDraft(OPPORTUNITY, CONTEXT, { ...INPUT, format: 'photo' });
    expect(draft.videoScript).toBeNull();
  });
});
