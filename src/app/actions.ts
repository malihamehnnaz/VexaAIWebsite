
'use server';

import {headers} from 'next/headers';

import {
  recommendServicePackages,
  type RecommendServicePackagesInput,
  type RecommendServicePackagesOutput,
} from '@/ai/flows/recommend-service-packages';
import {
  answerCustomerQuestions,
  type AnswerCustomerQuestionsInput,
  type AnswerCustomerQuestionsOutput,
} from '@/ai/flows/answer-customer-questions';

const CHATBOT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CHATBOT_MAX_REQUESTS_PER_WINDOW = 6;
const CHATBOT_MAX_TRACKED_CLIENTS = 500;

const chatbotRateLimitStore = new Map<string, number[]>();

function trimRateLimitStore() {
  while (chatbotRateLimitStore.size > CHATBOT_MAX_TRACKED_CLIENTS) {
    const oldestKey = chatbotRateLimitStore.keys().next().value;
    if (!oldestKey) break;
    chatbotRateLimitStore.delete(oldestKey);
  }
}

async function getChatbotClientKey() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headerStore.get('x-real-ip')?.trim();
  const userAgent = headerStore.get('user-agent')?.trim() ?? 'unknown-agent';

  return `${forwardedFor || realIp || 'unknown-ip'}:${userAgent}`;
}

function isChatbotRateLimited(clientKey: string) {
  const now = Date.now();
  const recentRequests = (chatbotRateLimitStore.get(clientKey) ?? []).filter(
    timestamp => now - timestamp < CHATBOT_RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length === 0) {
    chatbotRateLimitStore.delete(clientKey);
  }

  if (recentRequests.length >= CHATBOT_MAX_REQUESTS_PER_WINDOW) {
    chatbotRateLimitStore.set(clientKey, recentRequests);
    trimRateLimitStore();
    return true;
  }

  recentRequests.push(now);
  chatbotRateLimitStore.set(clientKey, recentRequests);
  trimRateLimitStore();
  return false;
}

export async function getRecommendation(
  input: RecommendServicePackagesInput
): Promise<RecommendServicePackagesOutput> {
  return await recommendServicePackages(input);
}

export async function getChatbotResponse(
  input: AnswerCustomerQuestionsInput
): Promise<AnswerCustomerQuestionsOutput> {
  const clientKey = await getChatbotClientKey();

  if (isChatbotRateLimited(clientKey)) {
    return {
      answer:
        'You are sending messages too quickly. Please wait a minute and try again with a Vexa AI question.',
    };
  }

  return await answerCustomerQuestions(input);
}
