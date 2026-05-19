import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken } from '@/lib/session';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-panel-auth')?.value ?? '';
  if (!token || !await verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const [msgsRes, subsRes, agentRes, trafficRes, errorRes] = await Promise.all([
      supabase.from('chat_messages').select('*').order('timestamp_tz', { ascending: false }).limit(500),
      supabase.from('contact_submissions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('traffic_events').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    const tableErrors: Record<string, string> = {};
    if (msgsRes.error) tableErrors.chat_messages = msgsRes.error.message;
    if (subsRes.error) tableErrors.contact_submissions = subsRes.error.message;
    if (agentRes.error) tableErrors.agent_logs = agentRes.error.message;
    if (trafficRes.error) tableErrors.traffic_events = trafficRes.error.message;
    if (errorRes.error) tableErrors.error_logs = errorRes.error.message;

    return NextResponse.json({
      chatMessages: msgsRes.data ?? [],
      submissions: subsRes.data ?? [],
      agentLogs: agentRes.data ?? [],
      trafficEvents: trafficRes.data ?? [],
      errorLogs: errorRes.data ?? [],
      tableErrors,
    });
  } catch (err) {
    console.error('[admin-data] error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
