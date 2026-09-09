// Selects the fake or real GoogleBusinessClient by config
// (GOOGLE_BUSINESS_CLIENT_MODE) — the single place that decides which
// implementation is active. Every other file in this feature depends only
// on the GoogleBusinessClient interface, never on fake-client.ts/
// real-client.ts directly, so switching modes (or adding a third
// implementation later, e.g. for tests) never touches route/service code.

import { getGoogleBusinessClientMode } from '@/lib/google-business/config';
import { fakeGoogleBusinessClient } from '@/lib/google-business/fake-client';
import { realGoogleBusinessClient } from '@/lib/google-business/real-client';
import type { GoogleBusinessClient } from '@/lib/google-business/types';

export function getGoogleBusinessClient(): GoogleBusinessClient {
  return getGoogleBusinessClientMode() === 'real' ? realGoogleBusinessClient : fakeGoogleBusinessClient;
}
