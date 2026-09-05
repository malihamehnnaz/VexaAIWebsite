// Dual authentication for the /api/google/analytics/* + /api/google/status
// routes. Two legitimate callers exist:
//   1. The Vexa dashboard's own browser-side panel (src/components/features/
//      google-analytics-panel.tsx) — same-origin fetch, admin session cookie.
//   2. The separate Guilty Pleasure Marketing OS's Express backend — a
//      server-to-server call with no cookie, authenticated instead with the
//      same shared bearer key already used for Messenger/Facebook Comments
//      (MESSENGER_API_KEY — reused rather than inventing a third secret for
//      what is, in practice, the same external consumer).
// Neither existing mechanism is weakened: the admin cookie check is
// untouched, and the bearer check is the exact one already protecting
// /api/messenger/* and /api/facebook/comments/*.

import { isAdminAuthenticated } from '@/lib/require-admin-session';
import { isAuthorizedRequest } from '@/lib/messenger-api';

export async function isAuthorizedForGa4(request: Request): Promise<boolean> {
  if (await isAdminAuthenticated()) return true;
  return isAuthorizedRequest(request);
}
