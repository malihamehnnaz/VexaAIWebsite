// Sync orchestration for Google Business Profile reviews (Part 3b). This
// codebase has no cron/scheduler anywhere (confirmed across every prior
// integration — GA4, Instagram, Facebook Insights all use the same model),
// so "sync on a schedule" here means: /admin/reviews always reads the local
// store, and a sync runs opportunistically when that store is stale (TTL
// below, within the brief's suggested 15-30 min range) rather than on every
// request — same caching discipline as Facebook Insights'
// request-time-fetch-and-persist. POST /admin/reviews/sync forces an
// immediate one regardless of staleness.
//
// Account id and location list are each resolved once and cached (Part 2's
// "resolve once, cache on the tenant record") — re-resolved only if the
// cache is empty, never on every sync.

import { getGoogleBusinessClient } from '@/lib/google-business/client-factory';
import { getValidAccessToken, mergeConnectionMetadata, getConnectionMetadata } from '@/lib/google/store';
import { upsertLocation, upsertReview, listStoredLocations, recordSyncOutcome, getLastSyncedAt } from '@/lib/google-business/store';
import { stripAccountPrefix } from '@/lib/google-business/resource-id';

const SYNC_TTL_MS = 20 * 60 * 1000; // 20 minutes — within the brief's 15-30 min range

async function resolveAccountId(accessToken: string): Promise<string> {
  const metadata = await getConnectionMetadata();
  const cached = metadata?.businessAccountId;
  if (typeof cached === 'string' && cached) return cached;

  const client = getGoogleBusinessClient();
  const accounts = await client.listAccounts(accessToken);
  if (accounts.length === 0) throw new Error('Google returned no Business Profile accounts for this connection');

  const accountId = accounts[0].accountId; // single-tenant/single-account today — see brief's scope
  await mergeConnectionMetadata({ businessAccountId: accountId });
  return accountId;
}

async function resolveLocations(accessToken: string, accountId: string): Promise<Array<{ locationId: string }>> {
  const stored = await listStoredLocations();
  if (stored.length > 0) return stored;

  const client = getGoogleBusinessClient();
  const locations = await client.listLocations(accessToken, accountId);
  await Promise.all(locations.map(l => upsertLocation(accountId, l)));
  return locations;
}

async function syncLocationReviews(accessToken: string, accountId: string, locationId: string): Promise<void> {
  const client = getGoogleBusinessClient();
  let pageToken: string | undefined;
  do {
    const page = await client.listReviewsPage(accessToken, accountId, locationId, pageToken);
    await Promise.all(page.reviews.map(r => upsertReview(locationId, r)));
    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken);
}

export interface SyncResult {
  ran: boolean; // false if skipped because the store was still fresh
  status: 'success' | 'partial' | 'failed' | null;
  error: string | null;
}

export async function syncIfStale(force = false): Promise<SyncResult> {
  if (!force) {
    const lastSyncedAt = await getLastSyncedAt();
    if (lastSyncedAt && Date.now() - new Date(lastSyncedAt).getTime() < SYNC_TTL_MS) {
      return { ran: false, status: null, error: null };
    }
  }

  try {
    const { accessToken } = await getValidAccessToken();
    const accountIdRaw = await resolveAccountId(accessToken);
    const accountId = accountIdRaw.startsWith('accounts/') ? stripAccountPrefix(accountIdRaw) : accountIdRaw; // defensive — resolveAccountId already stores a bare id, but never trust a cached value blindly
    const locations = await resolveLocations(accessToken, accountId);

    let anyFailed = false;
    for (const location of locations) {
      try {
        await syncLocationReviews(accessToken, accountId, location.locationId);
      } catch (err) {
        anyFailed = true;
        console.error(`[google-business/sync] failed syncing location ${location.locationId}:`, err instanceof Error ? err.message : err);
      }
    }

    const status = anyFailed ? 'partial' : 'success';
    await recordSyncOutcome(status, anyFailed ? 'One or more locations failed to sync — see server logs' : null);
    return { ran: true, status, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    console.error('[google-business/sync] sync failed:', message);
    await recordSyncOutcome('failed', message).catch(() => { /* best-effort */ });
    return { ran: true, status: 'failed', error: message };
  }
}
