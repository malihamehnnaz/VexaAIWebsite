// Instagram is scoped to exactly one connected Business Account, reached
// through the same Facebook Page already used for Messenger/Comments — the
// Instagram Graph API authenticates via that Page's Access Token (Instagram
// professional accounts connected to a Page don't have a separate token).
// No second Meta auth system, no second token system.

import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { resolvePageAccessToken } from '@/lib/meta/config';

export const IG_CONNECTED_PAGE_ID = GP_CAFE_PAGE_ID;
export const IG_BUSINESS_ACCOUNT_ID = '17841444033414031';

export function resolveInstagramAccessToken(): string | null {
  return resolvePageAccessToken(IG_CONNECTED_PAGE_ID);
}

export function isSupportedInstagramAccountId(accountId: string | null | undefined): boolean {
  return accountId === IG_BUSINESS_ACCOUNT_ID;
}
