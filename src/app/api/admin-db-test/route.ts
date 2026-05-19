import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const TABLES = ['chat_sessions', 'chat_messages', 'contact_submissions', 'agent_logs', 'traffic_events', 'error_logs'] as const;

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('admin-panel-auth')?.value !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Missing env vars' }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1. Count rows in each table (SELECT test)
  const counts: Record<string, { count: number | null; readError: string | null }> = {};
  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    counts[table] = { count: count ?? null, readError: error ? error.message : null };
  }

  // 2. INSERT test into traffic_events (least constrained table — no FK)
  const testSessionId = `diag-test-${Date.now()}`;
  const { error: insertError } = await supabase.from('traffic_events').insert({
    session_id: testSessionId,
    event_type: 'diagnostic',
    source: 'admin-db-test',
    page_path: '/admin',
  });

  // 3. Clean up test row (ignore cleanup error)
  if (!insertError) {
    await supabase.from('traffic_events').delete().eq('session_id', testSessionId).eq('event_type', 'diagnostic');
  }

  // 4. INSERT test into chat_sessions then chat_messages (FK chain test)
  const { error: sessionInsertError } = await supabase.from('chat_sessions').insert({
    session_id: testSessionId,
    source: 'admin-db-test',
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  });

  let msgInsertError: string | null = null;
  if (!sessionInsertError) {
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      session_id: testSessionId,
      role: 'user',
      content: 'diagnostic test message',
      timestamp_tz: new Date().toISOString(),
    });
    msgInsertError = msgErr ? msgErr.message : null;

    // Clean up
    await supabase.from('chat_sessions').delete().eq('session_id', testSessionId);
  }

  return NextResponse.json({
    ok: !insertError && !sessionInsertError && !msgInsertError,
    supabaseUrl: url,
    keyPrefix: key.slice(0, 20) + '…',
    tables: counts,
    insertTests: {
      traffic_events: insertError ? `FAIL: ${insertError.message}` : 'OK',
      chat_sessions: sessionInsertError ? `FAIL: ${sessionInsertError.message}` : 'OK',
      chat_messages: sessionInsertError ? 'SKIPPED (session insert failed)' : (msgInsertError ? `FAIL: ${msgInsertError}` : 'OK'),
    },
  });
}
