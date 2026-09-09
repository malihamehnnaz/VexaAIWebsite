# Google Business Profile review management

Server-side API for reading and replying to Google reviews across GP's two
verified café locations (Sundsvall, Umeå). Built for the separate Marketing
OS frontend to consume — no UI is built here.

## Architecture notes (read this first if the brief and this doc disagree)

This app is **Next.js App Router, not NestJS** — there is no Nest anywhere
in this codebase (no modules/DI/controllers/guards). Everything below is
built in this app's real conventions: plain exported `GET`/`POST`/etc.
handlers under `src/app/api/**/route.ts`, a plain auth-check function
called at the top of each handler (no Guard class), `process.env` reads in
small `config.ts` files (no config service), and Supabase Postgres via
`@supabase/supabase-js` with hand-run SQL migrations (no ORM, no migration
runner).

Two deliberate deviations from the brief, both agreed on before building:

1. **One shared Google connection, not two.** Google Business Profile
   reuses the *exact same* OAuth connection GA4 and Search Console already
   use (`google_connections` table) — `business.manage` is simply a third
   scope requested alongside `analytics.readonly`/`webmasters.readonly`
   (`src/lib/google/oauth.ts`). There is no second OAuth client, no second
   token table, no second callback route. Consequence worth knowing:
   **`POST /api/google/business/disconnect` disconnects the whole Google
   connection**, not just review management — GA4 and Search Console stop
   working too, because it's the same underlying token. This was an
   accepted trade-off for not duplicating OAuth/token/encryption logic.
2. **No scheduled sync.** This app has no cron/scheduler anywhere (every
   other integration — GA4, Instagram, Facebook Insights — uses the same
   pattern below). Instead of a 15–30 min background job,
   `GET /api/google/business/reviews` triggers an opportunistic refresh
   when the local store is more than 20 minutes stale
   (`src/lib/google-business/sync.ts`), and always serves from that local
   store — never live from Google — so the admin UI keeps working even when
   Google is unreachable or the connection needs reconnecting.
   `POST /api/google/business/sync` forces an immediate refresh regardless
   of staleness.

## Google Cloud Console setup

1. **Enable these APIs** on the same Cloud project `GOOGLE_CLIENT_ID`
   belongs to:
   - **My Business Account Management API** (`mybusinessaccountmanagement.googleapis.com`)
   - **My Business Business Information API** (`mybusinessbusinessinformation.googleapis.com`)
   - **My Business API** (`mybusiness.googleapis.com`) — the legacy v4 API;
     this is where Reviews live. There is no newer replacement for reviews
     specifically, and it is not deprecated for this purpose.
   Business Profile API access for a given Cloud project is subject to
   Google's own approval — this can be pending indefinitely. That's exactly
   why `GOOGLE_BUSINESS_CLIENT_MODE=fake` exists: every endpoint below works
   against realistic fixture data with zero API access, so the frontend
   team is never blocked on Google's approval queue.
2. **Redirect URI**: nothing new to register — this feature reuses the
   existing OAuth client's `GOOGLE_REDIRECT_URI`
   (`https://www.vexaai.se/api/google/oauth/callback` in production),
   already registered in Cloud Console → Credentials → Web client 1 →
   Authorized redirect URIs. Do not add a second redirect URI for this
   feature.
3. **Scope**: `https://www.googleapis.com/auth/business.manage` was added
   to this app's requested scope list. **Existing connections do not
   automatically gain it** — see "Running the connect flow" below.

## Running the connect flow locally

1. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
   `GOOGLE_TOKEN_ENCRYPTION_KEY` in `.env.local` (same vars GA4/Search
   Console already use — see `.env.example`).
2. Run the [SQL migration](../supabase_migration_google_business.sql)
   against your Supabase project (Supabase SQL editor — there is no
   migration runner in this codebase, every schema change here is a hand-run
   `.sql` file).
3. Log into `/admin` and click "Connect Google" (or hit
   `GET /api/google/oauth` directly while admin-authenticated) — this
   redirects to Google's consent screen requesting all three scopes
   together, including `business.manage`. **If you already have a
   connection from before this feature existed**, you must go through this
   flow again — an existing connection keeps whatever scopes it was
   originally granted; `business.manage` is not retroactively added.
4. After consent, Google redirects back to
   `/api/google/oauth/callback`, which exchanges the code, stores the
   (encrypted) refresh token, and redirects to the dashboard with
   `?ga_connected=1`.
5. Confirm the scope actually landed:
   `GET /api/google/business/status` (bearer or admin-session auth) →
   `capabilities.googleBusiness` should be `true` on the underlying
   `/api/google/status` response, and `/api/google/business/status` itself
   should report `"status": "connected"`.
6. Set `GOOGLE_BUSINESS_CLIENT_MODE=real` once you're ready to test against
   live data (requires the Cloud Console APIs above to actually be
   approved) — until then, leave it unset/`fake` and every route below
   already works.

## Final endpoint contract (as built)

All paths differ from the brief's suggested `/admin/google/*` /
`/admin/reviews*` — that prefix means the human-facing admin dashboard
*page* area in this codebase, not an API namespace. Everything here follows
the existing `/api/google/*` convention instead (matching
`/api/google/analytics/*`, `/api/google/status`).

Auth: every route below uses `isAuthorizedForGa4()`
(`src/lib/google/auth.ts`) — the Vexa admin session cookie **or** the
shared bearer key (`Authorization: Bearer <MESSENGER_API_KEY>`), the same
dual-auth already protecting `/api/google/analytics/*` and
`/api/google/status`. No new auth mechanism.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/google/oauth` | **Reused, not new.** Admin-session-gated; starts the OAuth flow for all three scopes together. |
| GET | `/api/google/oauth/callback` | **Reused, not new.** Exchanges the code, stores the connection. |
| POST | `/api/google/business/disconnect` | Clears the stored token — see the shared-connection caveat above. |
| GET | `/api/google/business/status` | `{ status, connectedAccount, locations, lastSyncedAt }` — see `StatusDto`. |
| GET | `/api/google/business/reviews?locationId=&hasReply=true\|false&minRating=1-5&cursor=` | Always served from the local store; triggers an opportunistic sync first if stale. Returns `{ reviews: ReviewDto[], nextCursor }`. |
| PUT | `/api/google/business/reviews/:locationId/:reviewId/reply` | Body `{ comment }`, max 4096 chars (validated server-side). Creates or overwrites. Refetches only that one review afterward — never a full sync. |
| DELETE | `/api/google/business/reviews/:locationId/:reviewId/reply` | Same refetch behavior. |
| POST | `/api/google/business/sync` | Forces an immediate sync regardless of staleness. |

### DTO shapes

```ts
// GET /api/google/business/status
{
  success: true,
  status: "connected" | "disconnected" | "needs_reconnect",
  connectedAccount: { googleEmail: string | null } | null,
  locations: Array<{ locationId: string; title: string | null; address: unknown | null }>,
  lastSyncedAt: string | null, // ISO
}

// GET /api/google/business/reviews
{
  success: true,
  reviews: Array<{
    locationId: string,
    reviewId: string,
    reviewer: { displayName: string | null; profilePhotoUrl: string | null; isAnonymous: boolean },
    starRating: 1 | 2 | 3 | 4 | 5 | null,
    comment: string | null,       // null for a rating-only review
    createdAt: string | null,     // ISO
    updatedAt: string | null,     // ISO
    reply: {
      comment: string,
      updatedAt: string | null,
      state: string | null,       // Google's ReviewReplyState verbatim: PENDING | REJECTED | APPROVED — never assumed published from a 200
      policyViolation: unknown | null,
    } | null,
  }>,
  nextCursor: string | null,
}
```

Never returned by any endpoint: an access token, refresh token, the Google
account id, or any raw Google API response body.

## Files

- `src/lib/google-business/types.ts` — `GoogleBusinessClient` interface + DTOs
- `src/lib/google-business/fake-client.ts` / `real-client.ts` — the two implementations
- `src/lib/google-business/client-factory.ts` — selects by `GOOGLE_BUSINESS_CLIENT_MODE`
- `src/lib/google-business/resource-id.ts` — the `accounts/{id}` / `locations/{id}` prefix-stripping helper (tested — see `resource-id.test.ts`)
- `src/lib/google-business/store.ts` — local review/location persistence
- `src/lib/google-business/sync.ts` — staleness-checked sync orchestration
- `src/lib/google/store.ts` — extended (not duplicated) with `needs_reconnect` state, `disconnectGoogle()`, and a same-process concurrent-refresh guard
- `supabase_migration_google_business.sql` — run this once, by hand, in the Supabase SQL editor
