// Facebook Comments is scoped to exactly one Page — GP's - Guilty Pleasure
// Café. This is a fixed business requirement, not environment-specific
// configuration, so it's a plain constant rather than another env var (per
// the explicit instruction to avoid unnecessary new env vars). Every
// Comments API route and the webhook feed handler must check requests
// against this — Nitol Bot (211548128717427) and any other Page ID must be
// rejected/ignored.
export const GP_CAFE_PAGE_ID = '106658601471856';

export function isSupportedCommentsPageId(pageId: string | null | undefined): boolean {
  return pageId === GP_CAFE_PAGE_ID;
}
