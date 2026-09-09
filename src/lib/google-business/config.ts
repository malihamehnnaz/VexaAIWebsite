// Config access for Google Business Profile review management — same
// pattern as every other integration's config.ts in this codebase (plain
// process.env reads, no config service/module exists here to route
// through). Re-exports VEXA_ADMIN_USER_ID rather than duplicating it — this
// feature has exactly one tenant today, same as every other integration,
// keyed the same way as the underlying google_connections row it reuses.

export { VEXA_ADMIN_USER_ID } from '@/lib/google/store';

export const MAX_REPLY_LENGTH = 4096; // Google's own limit on a review reply

export type GoogleBusinessClientMode = 'fake' | 'real';

export function getGoogleBusinessClientMode(): GoogleBusinessClientMode {
  const mode = process.env.GOOGLE_BUSINESS_CLIENT_MODE?.trim().toLowerCase();
  return mode === 'real' ? 'real' : 'fake'; // defaults to fake — never silently calls a real, possibly-unapproved Google API
}
