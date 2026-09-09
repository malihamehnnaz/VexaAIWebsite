// Real restaurant/business context — reuses the existing, already-working
// Facebook/Instagram identity calls (no new Meta auth, no duplicated token
// logic, per requirement 11). Every field is either real data or null —
// never a guessed/fabricated persona.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getPageIdentity } from '@/lib/facebook/graph';
import { getAccountFields } from '@/lib/instagram/graph';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { IG_BUSINESS_ACCOUNT_ID } from '@/lib/instagram/config';
import type { RestaurantContext } from '@/lib/content-intelligence/types';

async function getLatestPageFollowers(pageId: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('facebook_insights')
    .select('value')
    .eq('page_id', pageId)
    .eq('metric', 'page_follows')
    .eq('level', 'page')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.value != null ? Number(data.value) : null;
}

// pageId is a parameter (not hard-coded inside this function) so the
// architecture supports a different connected Page without a code change —
// callers pass GP_CAFE_PAGE_ID today because that's the only connected
// restaurant, per the single-Page architecture decided for this app.
export async function getRestaurantContext(pageId: string = GP_CAFE_PAGE_ID): Promise<RestaurantContext> {
  const [pageIdentity, igFields, facebookFollowers] = await Promise.all([
    getPageIdentity(pageId).catch(() => null),
    getAccountFields(IG_BUSINESS_ACCOUNT_ID).catch(() => null),
    getLatestPageFollowers(pageId),
  ]);

  return {
    pageId,
    pageName: pageIdentity?.name ?? null,
    instagramUsername: igFields?.username ?? null,
    instagramFollowers: igFields?.followers_count ?? null,
    facebookFollowers,
  };
}
