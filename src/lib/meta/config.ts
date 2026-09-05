// Shared Meta/Facebook Graph API configuration — Graph API version and
// per-Page access token resolution. Extracted from messenger-send.ts so the
// new Facebook Comments integration reuses the exact same version/token
// handling rather than a second copy of it (messenger-send.ts now imports
// from here too; its behavior is unchanged).

const DEFAULT_GRAPH_API_VERSION = 'v26.0';

export function getGraphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
}

// Page Access Tokens, one per Facebook Page. Looked up as
// META_PAGE_ACCESS_TOKEN_<pageId> first so more Pages can be added later by
// just setting another env var; falls back to the single generic
// META_PAGE_ACCESS_TOKEN for a one-Page setup. Never logged, never returned
// to any API response.
export function resolvePageAccessToken(pageId: string): string | null {
  const perPage = process.env[`META_PAGE_ACCESS_TOKEN_${pageId}`];
  if (perPage) return perPage;
  return process.env.META_PAGE_ACCESS_TOKEN || null;
}
