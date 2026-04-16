
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

export type SendContactEmailInput = {
  name: string;
  company?: string;
  email: string;
  message: string;
};

export type SendContactEmailResult = {
  success: boolean;
  message: string;
};

function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'Vexa AI Contact <onboarding@resend.dev>';
}

function getOwnerReplyToEmail() {
  return process.env.RESEND_OWNER_REPLY_TO?.trim() || 'malihamehnazcse@gmail.com';
}

function getContactRecipientEmail() {
  return process.env.RESEND_TO_EMAIL?.trim() || 'malihamehnazcse@gmail.com';
}

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
  const language = input.language === 'sv' ? 'sv' : 'en';

  if (isChatbotRateLimited(clientKey)) {
    return {
      answer:
        language === 'sv'
          ? 'Du skickar meddelanden for snabbt. Vanta en minut och forsok igen med en fraga om Vexa AI.'
          : 'You are sending messages too quickly. Please wait a minute and try again with a Vexa AI question.',
    };
  }

  return await answerCustomerQuestions(input);
}

export async function sendContactEmail(
  input: SendContactEmailInput
): Promise<SendContactEmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: 'Server email is not configured yet. Add RESEND_API_KEY to enable direct sending.',
      };
    }

    const subject = `New Vexa AI inquiry from ${input.name}`;
    const text = [
      `Name: ${input.name}`,
      `Company: ${input.company || 'Not provided'}`,
      `Email: ${input.email}`,
      '',
      'Message:',
      input.message,
    ].join('\n');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getResendFromEmail(),
        to: [getContactRecipientEmail()],
        reply_to: input.email || getOwnerReplyToEmail(),
        subject,
        text,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send contact email', errorText);
      return {
        success: false,
        message: 'Resend is still in testing mode and can only send to malihamehnazcse@gmail.com until a domain is verified.',
      };
    }

    return {
      success: true,
      message: 'Your message was sent successfully. We will get back to you soon.',
    };
  } catch (error) {
    console.error('Failed to send contact email', error);
    return {
      success: false,
      message: 'Failed to send your message. Please try again.',
    };
  }
}
