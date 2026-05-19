// Server-safe input sanitization and validation utilities.
// Used by server actions and API routes — never import client-only modules here.

export const MAX_CHAT_CHARS = 700;
export const MAX_CONTACT_MESSAGE_CHARS = 2000;
export const MAX_NAME_CHARS = 120;
export const MAX_EMAIL_CHARS = 254;
export const MAX_COMPANY_CHARS = 200;
export const MAX_HISTORY_TURNS = 10;
export const MAX_HISTORY_CONTENT_CHARS = 500;

// ── Pattern detection ─────────────────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?)/i,
  /forget\s+(your|all|the)\s+(instructions?|rules?|training|context)/i,
  /you\s+are\s+now\s+(a\s+)?(new|different|other|another)/i,
  /new\s+system\s+prompt/i,
  /\[system\]/i,
  /<\s*system\s*>/i,
  /act\s+as\s+(a\s+)?(different|evil|unfiltered|uncensored)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a\s+)?(different|evil|unfiltered)/i,
  /jailbreak/i,
  /\bDAN\s+mode\b/i,
  /do\s+anything\s+now/i,
  /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?)/i,
  /override\s+(all\s+)?your\s+(instructions?|rules?|settings?)/i,
  /from\s+now\s+on\s+(you|act|respond|behave)/i,
  /your\s+(true|real|actual)\s+(self|nature|purpose)/i,
];

const DANGEROUS_CONTENT_PATTERNS = [
  /<script[\s\S]*?>/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /on\w+\s*=\s*["']?[^"'\s>]+/i, // inline event handlers
  /data\s*:\s*text\/html/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /expression\s*\(/i,        // CSS expression()
  /url\s*\(\s*["']?\s*javascript/i,
];

// ── Text sanitization ─────────────────────────────────────────────────────────

export function stripUnsafeChars(text: string): string {
  return (
    text
      .replace(/<[^>]{0,500}>/g, '')         // strip HTML tags (bounded to prevent ReDoS)
      .replace(/\x00/g, '')                   // null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars (keep \t \n \r)
      .trim()
  );
}

export function sanitizeText(raw: string, maxLength: number): string {
  return stripUnsafeChars(raw).slice(0, maxLength);
}

// ── Detection ─────────────────────────────────────────────────────────────────

export function containsPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(p => p.test(text));
}

export function containsDangerousContent(text: string): boolean {
  return DANGEROUS_CONTENT_PATTERNS.some(p => p.test(text));
}

// ── Validated result type ─────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'injection' | 'dangerous' };

// ── Chat message validation ───────────────────────────────────────────────────

export function validateChatMessage(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' };

  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.length > MAX_CHAT_CHARS) return { ok: false, reason: 'too_long' };
  if (containsDangerousContent(trimmed)) return { ok: false, reason: 'dangerous' };
  if (containsPromptInjection(trimmed)) return { ok: false, reason: 'injection' };

  return { ok: true, value: sanitizeText(trimmed, MAX_CHAT_CHARS) };
}

// ── Chat history validation ───────────────────────────────────────────────────

export type HistoryTurn = { role: 'user' | 'assistant'; content: string };

export function sanitizeHistory(history: unknown): HistoryTurn[] {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY_TURNS * 2) // take last N*2 before filtering
    .filter(
      (turn): turn is HistoryTurn =>
        turn !== null &&
        typeof turn === 'object' &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string'
    )
    .slice(-MAX_HISTORY_TURNS)
    .map(turn => ({
      role: turn.role,
      content: sanitizeText(turn.content, MAX_HISTORY_CONTENT_CHARS),
    }))
    .filter(turn => turn.content.length > 0);
}

// ── Contact form validation ───────────────────────────────────────────────────

export type ContactFields = {
  name: string;
  email: string;
  message: string;
  company?: string;
  honeypot?: string; // hidden field — must be empty
};

export function validateContactForm(data: ContactFields): ValidationResult {
  // Honeypot: bots fill hidden fields, humans never see them
  if (data.honeypot && data.honeypot.trim().length > 0) {
    // Silently appear to succeed — don't tip off the bot
    return { ok: false, reason: 'dangerous' };
  }

  if (!data.name?.trim() || data.name.trim().length < 2 || data.name.length > MAX_NAME_CHARS) {
    return { ok: false, reason: 'empty' };
  }
  if (!data.email?.trim() || !data.email.includes('@') || data.email.length > MAX_EMAIL_CHARS) {
    return { ok: false, reason: 'empty' };
  }
  if (!data.message?.trim() || data.message.trim().length < 10 || data.message.length > MAX_CONTACT_MESSAGE_CHARS) {
    return { ok: false, reason: 'too_long' };
  }

  const allFields = [data.name, data.email, data.message, data.company ?? ''];
  if (allFields.some(f => containsDangerousContent(f))) return { ok: false, reason: 'dangerous' };

  return { ok: true, value: 'valid' };
}
