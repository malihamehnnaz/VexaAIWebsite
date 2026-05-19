'use client';

import { supabaseConfig } from '@/firebase/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function initializeFirebase() {
  return getSdks();
}

export function getSdks() {
  if (supabaseClient) {
    return { supabase: supabaseClient };
  }

  supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  return { supabase: supabaseClient };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firebase-app';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './logging';
