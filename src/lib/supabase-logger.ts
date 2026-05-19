export interface ChatSessionInput {
  sessionId: string;
  pagePath?: string;
  route?: string;
  source?: string;
  userAgent?: string;
}

export interface ChatMessageInput {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  quote?: unknown;
  pagePath?: string;
  route?: string;
  eventType?: string;
  source?: string;
  language?: string;
  userAgent?: string;
}

export interface ContactSubmissionInput {
  sessionId?: string | null;
  name: string;
  company?: string | null;
  email: string;
  message: string;
  availableDate?: string | null;
  availableTime?: string | null;
  pagePath?: string;
  route?: string;
  userAgent?: string;
}

export interface SupabaseEventInput {
  sessionId?: string | null;
  eventType?: string;
  source?: string;
  pagePath?: string;
  route?: string;
  language?: string;
  prompt?: string;
  response?: string;
  quote?: unknown;
  message?: string;
  details?: Record<string, unknown> | null;
  userAgent?: string;
}

async function postLog(action: string, data: unknown): Promise<void> {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    });
  } catch (err) {
    console.error('[supabase-logger] postLog error:', err);
  }
}

export async function logChatMessage(data: ChatMessageInput): Promise<void> {
  await postLog('chat_message', data);
}

export async function logContactSubmission(data: ContactSubmissionInput): Promise<void> {
  await postLog('contact_submission', data);
}

export async function logSupabaseEvent(
  table: 'traffic_events' | 'agent_logs' | 'error_logs',
  data: SupabaseEventInput
): Promise<void> {
  await postLog('event', { ...data, table });
}
