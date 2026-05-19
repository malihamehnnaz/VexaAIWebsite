import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { sanitizeText } from '@/lib/sanitize';
import { rateLimit } from '@/lib/rate-limit';

const DB_CONTENT_LIMIT = 4000;
const DB_SHORT_LIMIT = 500;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role key (never exposed to browser); fall back to publishable
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function upsertSession(supabase: ReturnType<typeof getSupabase>, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  const { error: e1 } = await supabase.from('chat_sessions').upsert(
    { session_id: data.sessionId, page_path: data.pagePath ?? null, route: data.route ?? null,
      source: data.source ?? null, user_agent: data.userAgent ?? null, first_seen: now, last_seen: now },
    { onConflict: 'session_id', ignoreDuplicates: true }
  );
  if (e1) console.error('[api/log] upsert session:', e1.message);

  const { error: e2 } = await supabase.from('chat_sessions')
    .update({ last_seen: now, updated_at: now })
    .eq('session_id', data.sessionId);
  if (e2) console.error('[api/log] update session last_seen:', e2.message);
}

export async function POST(request: Request) {
  // Same-origin guard: Origin must match host
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip')?.trim() ?? 'unknown';
  const origin = h.get('origin');
  const host = h.get('host');
  if (origin && host && !origin.includes(host.split(':')[0])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!await rateLimit(ip, 'log', 60, '1 m')) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const data = (body.data ?? {}) as Record<string, unknown>;

    if (body.action === 'chat_message') {
      await upsertSession(supabase, data);
      const { error } = await supabase.from('chat_messages').insert({
        session_id: data.sessionId,
        role: data.role,
        content: sanitizeText(String(data.content ?? ''), DB_CONTENT_LIMIT),
        quote: data.quote ?? null,
        timestamp_tz: new Date().toISOString(),
        page_path: data.pagePath ? sanitizeText(String(data.pagePath), DB_SHORT_LIMIT) : null,
        route: data.route ? sanitizeText(String(data.route), DB_SHORT_LIMIT) : null,
        event_type: data.eventType ?? null,
        source: data.source ?? null,
        language: data.language ?? null,
        user_agent: data.userAgent ? sanitizeText(String(data.userAgent), DB_SHORT_LIMIT) : null,
      });
      if (error) console.error('[api/log] chat_messages insert:', error.message);
    }

    else if (body.action === 'contact_submission') {
      const { error } = await supabase.from('contact_submissions').insert({
        session_id: data.sessionId ?? null,
        name: data.name,
        company: data.company ?? null,
        email: data.email,
        message: data.message,
        available_date: data.availableDate ?? null,
        available_time: data.availableTime ?? null,
        page_path: data.pagePath ?? null,
        route: data.route ?? null,
        user_agent: data.userAgent ?? null,
      });
      if (error) console.error('[api/log] contact_submissions insert:', error.message);
    }

    else if (body.action === 'event') {
      const table = data.table as 'traffic_events' | 'agent_logs' | 'error_logs';
      if (!['traffic_events', 'agent_logs', 'error_logs'].includes(table)) {
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
      }
      const row: Record<string, unknown> = {
        session_id: data.sessionId ?? null,
        event_type: data.eventType ?? null,
        source: data.source ?? null,
        page_path: data.pagePath ?? null,
        route: data.route ?? null,
        user_agent: data.userAgent ?? null,
        details: data.details ?? null,
      };
      if (table === 'agent_logs') {
        row.language = data.language ?? null;
        row.prompt = data.prompt ?? null;
        row.response = data.response ?? null;
        row.quote = data.quote ?? null;
        row.message = data.message ?? null;
      }
      if (table === 'error_logs') {
        row.message = data.message ?? null;
      }
      const { error } = await supabase.from(table).insert(row);
      if (error) console.error(`[api/log] ${table} insert:`, error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/log] error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
