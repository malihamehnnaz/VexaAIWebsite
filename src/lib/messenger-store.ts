// Persistence layer for Messenger conversations/messages, backed by the
// project's existing Supabase Postgres database (see the messenger_* tables
// in supabase_schema.sql). Kept separate from src/lib/messenger-webhook.ts
// (event parsing/logging) and src/lib/messenger-send.ts (Graph API calls) so
// each concern stays isolated and independently testable.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeText } from '@/lib/sanitize';

const MAX_TEXT_CHARS = 2000;

export type MessengerDirection = 'inbound' | 'outbound';
export type MessengerEventKind = 'message' | 'postback';

export interface ConversationSummary {
  conversationId: string;
  pageId: string;
  senderId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastDirection: MessengerDirection | null;
  messageCount: number;
  unreadCount: number;
}

export interface StoredMessage {
  id: string;
  messageId: string | null;
  conversationId: string;
  pageId: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  direction: MessengerDirection;
  eventType: string;
  status: string;
  timestamp: string | null;
  createdAt: string;
}

interface ConversationRow {
  id: string;
  message_count: number;
  unread_count: number;
}

interface MessageRow {
  id: string;
  message_id: string | null;
  conversation_id: string;
  page_id: string;
  sender_id: string;
  recipient_id: string;
  text: string | null;
  direction: MessengerDirection;
  event_type: string;
  status: string;
  occurred_at: string;
  created_at: string;
}

function mapMessageRow(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    messageId: row.message_id,
    conversationId: row.conversation_id,
    pageId: row.page_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    text: row.text,
    direction: row.direction,
    eventType: row.event_type,
    status: row.status,
    timestamp: row.occurred_at,
    createdAt: row.created_at,
  };
}

// ── Conversation get-or-create / counters ────────────────────────────────────
// One conversation row per (page_id, sender_id) pair. Counts are maintained
// with a plain select-then-update rather than a Postgres function, matching
// this project's existing convention of doing everything through the
// supabase-js client — a small race window under heavy concurrent traffic is
// an acceptable trade-off for a single Page's inbox (see requirement to not
// introduce unnecessary complexity yet).

async function getOrCreateConversation(pageId: string, senderId: string): Promise<ConversationRow> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from('messenger_conversations')
    .select('id, message_count, unread_count')
    .eq('page_id', pageId)
    .eq('sender_id', senderId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('messenger_conversations')
    .insert({ page_id: pageId, sender_id: senderId, message_count: 0, unread_count: 0 })
    .select('id, message_count, unread_count')
    .single();

  if (insertError) {
    // Unique violation on (page_id, sender_id): a concurrent request created
    // it first — re-select rather than fail.
    if (insertError.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('messenger_conversations')
        .select('id, message_count, unread_count')
        .eq('page_id', pageId)
        .eq('sender_id', senderId)
        .single();
      if (retryError) throw retryError;
      return retry;
    }
    throw insertError;
  }

  return created;
}

async function touchConversation(
  conversationId: string,
  current: ConversationRow,
  direction: MessengerDirection,
  lastMessage: string | null,
  lastMessageAt: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('messenger_conversations')
    .update({
      last_message_text: lastMessage,
      last_message_at: lastMessageAt,
      last_direction: direction,
      message_count: current.message_count + 1,
      unread_count: direction === 'inbound' ? current.unread_count + 1 : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
  if (error) throw error;
}

// ── Inbound (called from the webhook) ────────────────────────────────────────

export interface InboundEventInput {
  pageId: string;
  senderId: string;
  recipientId: string;
  eventType: MessengerEventKind;
  messageId?: string | null;
  text?: string | null;
  timestampMs?: number | null;
}

// Idempotency key: Meta's own message id when we have one (real messages),
// otherwise a deterministic composite. Postbacks don't carry a message id,
// so without this a retried webhook delivery for the same button click would
// be stored twice.
function dedupeKeyFor(input: InboundEventInput): string {
  if (input.messageId) return `mid:${input.messageId}`;
  return `evt:${input.pageId}:${input.senderId}:${input.eventType}:${input.timestampMs ?? 0}`;
}

export async function recordInboundEvent(input: InboundEventInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const conversation = await getOrCreateConversation(input.pageId, input.senderId);

  const text = input.text ? sanitizeText(input.text, MAX_TEXT_CHARS) : null;
  const occurredAt = input.timestampMs ? new Date(input.timestampMs).toISOString() : new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from('messenger_messages')
    .upsert(
      {
        conversation_id: conversation.id,
        page_id: input.pageId,
        sender_id: input.senderId,
        recipient_id: input.recipientId,
        message_id: input.messageId ?? null,
        dedupe_key: dedupeKeyFor(input),
        event_type: input.eventType,
        direction: 'inbound',
        text,
        status: 'received',
        occurred_at: occurredAt,
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!inserted) return; // duplicate delivery (Meta retry) — already recorded

  await touchConversation(conversation.id, conversation, 'inbound', text, occurredAt);
}

// ── Outbound (called from the reply API, after a successful Meta send) ──────

export interface OutboundMessageInput {
  pageId: string;
  recipientId: string; // the Messenger customer this reply is going to
  conversationId: string;
  text: string;
  metaMessageId: string | null;
}

export async function recordOutboundMessage(input: OutboundMessageInput): Promise<StoredMessage> {
  const supabase = getSupabaseAdmin();

  const { data: conversation, error: convError } = await supabase
    .from('messenger_conversations')
    .select('id, message_count, unread_count')
    .eq('id', input.conversationId)
    .single();
  if (convError) throw convError;

  const text = sanitizeText(input.text, MAX_TEXT_CHARS);
  const occurredAt = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('messenger_messages')
    .insert({
      conversation_id: input.conversationId,
      page_id: input.pageId,
      sender_id: input.pageId, // outbound: "sender" is the Page itself
      recipient_id: input.recipientId,
      message_id: input.metaMessageId,
      dedupe_key: input.metaMessageId ? `mid:${input.metaMessageId}` : `out:${input.conversationId}:${occurredAt}`,
      event_type: 'message',
      direction: 'outbound',
      text,
      status: 'sent',
      occurred_at: occurredAt,
    })
    .select('*')
    .single();
  if (error) throw error;

  await touchConversation(input.conversationId, conversation, 'outbound', text, occurredAt);

  return mapMessageRow(row as MessageRow);
}

// ── Reads (for the marketing website APIs) ───────────────────────────────────

export async function listConversations(pageId?: string): Promise<ConversationSummary[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('messenger_conversations')
    .select('id, page_id, sender_id, last_message_text, last_message_at, last_direction, message_count, unread_count')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (pageId) query = query.eq('page_id', pageId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(row => ({
    conversationId: row.id,
    pageId: row.page_id,
    senderId: row.sender_id,
    lastMessage: row.last_message_text,
    lastMessageAt: row.last_message_at,
    lastDirection: row.last_direction,
    messageCount: row.message_count,
    unreadCount: row.unread_count,
  }));
}

// Resolves a conversation id for a (page, customer) pair, creating the
// conversation if this is the first-ever contact with them. Lets the reply
// API accept a request that only has {pageId, recipientId, text} — e.g. when
// the marketing site is starting a fresh outbound message rather than
// replying inside an existing thread it already fetched.
export async function resolveConversationId(pageId: string, senderId: string): Promise<string> {
  const conversation = await getOrCreateConversation(pageId, senderId);
  return conversation.id;
}

export async function getConversationById(conversationId: string): Promise<{ id: string; pageId: string; senderId: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('messenger_conversations')
    .select('id, page_id, sender_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, pageId: data.page_id, senderId: data.sender_id };
}

export async function listMessages(conversationId: string, limit = 100): Promise<StoredMessage[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('messenger_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('occurred_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(row => mapMessageRow(row as MessageRow));
}
