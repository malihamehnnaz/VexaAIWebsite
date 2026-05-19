
'use server';

import {headers} from 'next/headers';

import {
  answerCustomerQuestions,
  type AnswerCustomerQuestionsInput,
  type AnswerCustomerQuestionsOutput,
} from '@/ai/flows/answer-customer-questions';
import type {
  RecommendServicePackagesInput,
  RecommendServicePackagesOutput,
} from '@/ai/flows/recommend-service-packages';
import {
  validateChatMessage,
  sanitizeHistory,
  validateContactForm,
  sanitizeText,
  MAX_NAME_CHARS,
  MAX_EMAIL_CHARS,
  MAX_COMPANY_CHARS,
  MAX_CONTACT_MESSAGE_CHARS,
} from '@/lib/sanitize';
import { rateLimit } from '@/lib/rate-limit';

export type SendContactEmailInput = {
  name: string;
  company?: string;
  email: string;
  message: string;
  availableDate?: string;
  availableTime?: string;
  honeypot?: string;
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

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip')?.trim() ||
      'unknown'
    );
  } catch {
    return 'unknown';
  }
}

async function getClientKey(): Promise<string> {
  try {
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip')?.trim() ||
      'unknown';
    const ua = h.get('user-agent')?.trim()?.slice(0, 100) ?? 'unknown';
    return `${ip}:${ua}`;
  } catch {
    return `fallback:${Date.now().toString().slice(-8)}`;
  }
}

// ── Public actions ────────────────────────────────────────────────────────────

export async function getRecommendation(
  input: RecommendServicePackagesInput
): Promise<RecommendServicePackagesOutput> {
  const {recommendServicePackages} = await import('@/ai/flows/recommend-service-packages');
  return await recommendServicePackages(input);
}

export async function getChatbotResponse(
  input: AnswerCustomerQuestionsInput
): Promise<AnswerCustomerQuestionsOutput> {
  const language = input.language === 'sv' ? 'sv' : 'en';

  // 1. Rate limit — 20 messages per minute per IP+UA, persists across cold starts with Upstash
  const clientKey = await getClientKey();
  if (!await rateLimit(clientKey, 'chatbot', 20, '1 m')) {
    return {
      answer:
        language === 'sv'
          ? 'Du skickar meddelanden för snabbt. Vänta en minut och försök igen.'
          : 'You are sending messages too quickly. Please wait a minute and try again.',
    };
  }

  // 2. Validate and sanitize the message
  const msgResult = validateChatMessage(input.question);
  if (!msgResult.ok) {
    if (msgResult.reason === 'too_long') {
      return {
        answer:
          language === 'sv'
            ? 'Meddelandet är för långt. Håll det under 700 tecken.'
            : 'Your message is too long. Please keep it under 700 characters.',
      };
    }
    if (msgResult.reason === 'injection' || msgResult.reason === 'dangerous') {
      return {
        answer:
          language === 'sv'
            ? 'Jag är Vexa AI:s assistent och kan bara svara på frågor om våra tjänster.'
            : "I'm Vexa AI's assistant and can only answer questions about our services.",
      };
    }
    return {
      answer:
        language === 'sv'
          ? 'Skriv en fråga om Vexa AI.'
          : 'Please enter a question about Vexa AI.',
    };
  }

  // 3. Sanitize and cap history
  const safeHistory = sanitizeHistory(input.history ?? []);

  try {
    return await answerCustomerQuestions({
      question: msgResult.value,
      language,
      history: safeHistory,
      sessionId: clientKey,
    });
  } catch (error) {
    console.error('Chatbot request failed', error);
    return {
      answer:
        language === 'sv'
          ? 'Tyvärr har jag problem att ansluta just nu. Försök igen senare.'
          : "Sorry, I'm having trouble connecting. Please try again later.",
    };
  }
}

export async function sendContactEmail(
  input: SendContactEmailInput
): Promise<SendContactEmailResult> {
  // 1. Honeypot + field validation
  const contactResult = validateContactForm({
    name: String(input.name ?? ''),
    email: String(input.email ?? ''),
    message: String(input.message ?? ''),
    company: input.company ? String(input.company) : undefined,
    honeypot: input.honeypot,
  });

  if (!contactResult.ok) {
    if (contactResult.reason === 'dangerous') {
      // Don't reveal to bots that they were caught; pretend success
      return { success: true, message: 'Your message was sent successfully. We will get back to you soon.' };
    }
    return { success: false, message: 'Please check your inputs and try again.' };
  }

  // 2. Rate limit contact form — 3 submissions per 10 minutes per IP
  const ip = await getClientIp();
  if (!await rateLimit(ip, 'contact', 3, '10 m')) {
    return {
      success: false,
      message: 'Too many submissions. Please wait a few minutes before trying again.',
    };
  }

  // 3. Sanitize before email
  const safeName    = sanitizeText(input.name, MAX_NAME_CHARS);
  const safeEmail   = sanitizeText(input.email, MAX_EMAIL_CHARS);
  const safeCompany = input.company ? sanitizeText(input.company, MAX_COMPANY_CHARS) : '';
  const safeMessage = sanitizeText(input.message, MAX_CONTACT_MESSAGE_CHARS);

  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: 'Email sending is not configured yet. Please contact us directly.',
      };
    }

    const subject = `New Vexa AI inquiry from ${safeName}`;
    const text = [
      `Name: ${safeName}`,
      `Company: ${safeCompany || 'Not provided'}`,
      `Email: ${safeEmail}`,
      `Availability date: ${input.availableDate || 'Not provided'}`,
      `Availability time: ${input.availableTime || 'Not provided'}`,
      '',
      'Message:',
      safeMessage,
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
        reply_to: safeEmail || getOwnerReplyToEmail(),
        subject,
        text,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to send contact email', await response.text());
      return {
        success: false,
        message: 'Could not send your message right now. Please try again later.',
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
