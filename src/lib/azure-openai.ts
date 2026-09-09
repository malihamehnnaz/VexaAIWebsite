// Shared Azure OpenAI client factory for server-side AI generation outside
// the chatbot flow. Deliberately NOT imported from/into
// src/ai/flows/answer-customer-questions.ts (which has its own internal,
// working client) — kept fully separate so nothing here can regress the
// chatbot, and vice versa. Same env vars (already documented in
// .env.example), same client library, same instantiation pattern — just a
// second, independent instance.

import { AzureOpenAI } from 'openai';

const AZURE_OPENAI_API_VERSION_DEFAULT = '2024-12-01-preview';

let cachedClient: AzureOpenAI | null | undefined;

export function getAzureOpenAIClient(): AzureOpenAI | null {
  if (cachedClient !== undefined) return cachedClient;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || AZURE_OPENAI_API_VERSION_DEFAULT;

  if (!endpoint || !apiKey) {
    cachedClient = null;
    return null;
  }

  try {
    cachedClient = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  } catch {
    cachedClient = null;
  }
  return cachedClient;
}

export function getAzureOpenAIDeployment(): string | null {
  return process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || process.env.AZURE_OPENAI_MODEL?.trim() || null;
}
