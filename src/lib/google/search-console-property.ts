// Resolves which Search Console property a request targets — never
// hard-coded to a specific website (per the integration spec).
//
// Resolution order:
//   1. ?property=... query param, if supplied
//   2. SEARCH_CONSOLE_PROPERTY env var, if set
//   3. the first property the connected Google account can actually access
//
// In every case the resolved property is validated against the account's
// real site list, so a caller can't point these endpoints at an arbitrary
// property the connected account doesn't own — same defensive posture as
// the Page-ID enforcement on the Facebook/Instagram routes.

import { listSites, SearchConsoleApiError, type SearchConsoleSite } from '@/lib/google/search-console';
import { withCache } from '@/lib/google/cache';

const SITES_CACHE_TTL_SECONDS = 600;

export class SearchConsolePropertyError extends Error {
  constructor(message: string, public readonly code: 'no_properties' | 'not_authorized') {
    super(message);
    this.name = 'SearchConsolePropertyError';
  }
}

export async function getAccessibleSites(accessToken: string): Promise<SearchConsoleSite[]> {
  return withCache('sc:sites', SITES_CACHE_TTL_SECONDS, () => listSites(accessToken));
}

export async function resolveProperty(accessToken: string, requested: string | null): Promise<string> {
  const sites = await getAccessibleSites(accessToken);

  if (sites.length === 0) {
    throw new SearchConsolePropertyError(
      'This Google account has no Search Console properties available',
      'no_properties'
    );
  }

  const candidate = requested ?? process.env.SEARCH_CONSOLE_PROPERTY ?? null;
  if (!candidate) return sites[0].siteUrl;

  const match = sites.find(site => site.siteUrl === candidate);
  if (!match) {
    throw new SearchConsolePropertyError(
      'The requested Search Console property is not available to the connected Google account',
      'not_authorized'
    );
  }
  return match.siteUrl;
}

export { SearchConsoleApiError };
