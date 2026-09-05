import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Shared server-side Supabase client factory. Prefers the service role key
// (bypasses Row Level Security; never exposed to the browser), falling back
// to the publishable key. Mirrors the inline getSupabase() helpers already
// used by src/app/api/log, admin-data, and admin-db-test — extracted here so
// the new Messenger persistence code (src/lib/messenger-store.ts) doesn't
// duplicate it a fourth time. Those existing routes are left untouched.
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}
