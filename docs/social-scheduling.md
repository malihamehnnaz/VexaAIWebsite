# Facebook Page post scheduling

Server-side scheduling, storage, and real Meta publishing for Facebook Page
posts — the Marketing Website's Content Planner consumes this API. No UI is
built here.

## Architecture

```
Marketing Website
  -> Guilty Pleasure Backend (proxies, same pattern as its existing /api/messenger proxy)
  -> Vexa Backend (this repo) — /api/social/scheduled-posts/*
  -> src/lib/social-scheduling/publish.ts -> src/lib/facebook/graph.ts
  -> Meta Graph API
  -> GP's - Guilty Pleasure Café Facebook Page
```

This repo only implements the Vexa Backend layer above (the layer that
actually owns the Meta Page Access Token). The Guilty Pleasure backend
(`GuiltyPleasure-ultimate-main/server`, a separate repository) is not
touched by this change — if its frontend needs to reach these endpoints, it
should proxy to them the same way it already proxies `/api/messenger` to
this same Vexa backend.

## Why generated_content, not a new table

`generated_content` already existed (added for Content Intelligence) with
exactly the columns a Content Planner needs: `page_id`, `platform`,
`caption`, `hashtags`, and a status lifecycle. Rather than duplicate it,
`supabase_migration_social_scheduling.sql` widens it: `opportunity_id`
becomes nullable (a scheduled post no longer has to originate from a
Content Intelligence opportunity), and `status` gains
`schedule_pending | scheduled | publishing | published | failed |
cancelled` alongside Content Intelligence's existing `draft | approved |
rejected`. Nothing about Content Intelligence's own behavior changed — its
`/generate` endpoint still always supplies an `opportunity_id` exactly as
before.

## The real server-side scheduler — read this before assuming it "just works"

**This app runs on Vercel (serverless functions) — there is no persistent
worker process here, and there never will be on this deployment model.**
`src/lib/social-scheduling/worker.ts`'s `runTick()` is the actual scheduler
logic: "find whatever is due right now, atomically claim it, publish it."
It is safe to call as often as you like, from anywhere — every claim is a
single conditional database UPDATE, so overlapping/duplicate calls never
double-publish (see "Duplicate-publish protection" below).

**Vercel's own native Cron Jobs are deliberately NOT used here.** Confirmed
against Vercel's current documentation (2026-09-13): Hobby-plan projects
are capped at **once per day**, with timing only guaranteed to ±59 minutes
— either of which would make "schedule for 6:30pm" meaningless, and adding
a `vercel.json` cron entry more frequent than daily **fails the next
deployment outright** on a Hobby-plan project. Since this project's Vercel
plan wasn't confirmed, no `vercel.json` was added, to avoid that risk.

**What you need to set up in production:** point any external scheduler at
`POST /api/social/scheduler/run` (also accepts `GET`, for services that
only support that) every 1–5 minutes, with header
`Authorization: Bearer <MESSENGER_API_KEY>` (the same shared secret every
other Vexa API already uses — no new secret to create). Options that need
no Vercel plan upgrade:

- **cron-job.org** (free) — create a job hitting the URL above on a 1–5 min
  interval, with that Authorization header.
- **GitHub Actions scheduled workflow** — a `schedule:` cron trigger in this
  (or any) repo running a single `curl` step.
- **UptimeRobot** or similar — a "monitor" configured to hit the URL
  periodically with the header set.
- If this project **is** actually on Vercel Pro/Enterprise, a native
  `vercel.json` cron entry is the simplest option instead — only add this
  after confirming the plan.

**The API is fully usable without the scheduler running at all** — creating,
listing, editing, and cancelling scheduled posts all work regardless; only
the actual publish-at-the-right-time behavior depends on something calling
`/scheduler/run` regularly. `POST /:id/publish-now` also works independent
of the scheduler, for an immediate manual publish.

## Duplicate-publish protection

Every claim (`scheduled -> publishing`) is one conditional `UPDATE ... WHERE
status = 'scheduled'`. Two overlapping scheduler ticks (or two external
triggers firing close together) racing on the same row: Postgres's row
locking serializes them, the second `UPDATE` affects 0 rows, and that
worker simply moves on — it never publishes what the first one already
claimed.

**The one gap that cannot be fully closed by software alone:** if the
process is killed or times out in the exact window after Meta has already
returned a successful post id but before that id is saved to the database,
the row is stuck in `publishing` with a real, live Facebook post this
database doesn't know about. After `STUCK_PUBLISHING_TIMEOUT_MINUTES` (5),
such a row is marked `failed` with `error_code: "stuck_unknown_outcome"` —
deliberately **not** auto-retried, because retrying it might create a
second real post if the first one actually did publish. A human needs to
check the Page and either `/retry` (if it never actually posted) or leave
it as-is (if it did). Meta's own duplicate-post detection (error code 506)
is a partial, secondary safety net for this exact scenario, but isn't
relied on as the primary mechanism (see `src/lib/social-scheduling/errors.ts`).

## Retry policy

Transient failures (rate limiting, 5xx, network) are retried automatically
by the worker up to 3 attempts total, with backoff (2 / 10 / 30 minutes).
Permanent failures (bad permissions, invalid content, expired auth, a 506
duplicate-post rejection) go straight to `failed` — never auto-retried.
`POST /:id/retry` is for a human-initiated retry of a `failed` post
(resets the attempt budget, re-queues for the next tick); `/publish-now`
treats its own failure as terminal immediately (no auto-retry for a
synchronous manual action).

## Timezone handling

The caller sends a local wall-clock time (`"2026-09-20T18:30:00"`, no
offset) plus an IANA zone name (`"Australia/Sydney"`). `date-fns-tz` (a new
dependency, added specifically for this — DST correctness isn't worth
hand-rolling) converts this to the correct UTC instant, verified against a
real Sydney DST-transition case (AEST/UTC+10 before, AEDT/UTC+11 after) in
`timezone.test.ts`. `scheduled_at` is always stored as UTC; `timezone` is
kept alongside for display — every `ScheduledPostDto` includes a
pre-formatted `scheduledAtDisplay` (e.g. `"20 Sep 2026, 18:30"`) so the
frontend doesn't need its own timezone library.

## Media support

This app has no media upload/storage infrastructure of its own. v1
supports **at most one photo**, given as a real, publicly-fetchable HTTPS
URL — Meta fetches it directly (`POST /{page-id}/photos` with a `url`
param), nothing is uploaded through this backend. A video URL, more than
one photo, or anything else returns a clear validation error
("... is not currently supported for Facebook scheduling") rather than
silently scheduling something that can't actually publish.

## Content Intelligence integration

Unchanged — `generated_content` rows created by
`POST /api/content-intelligence/generate` still work exactly as before
(`status: 'draft'`). To schedule AI-generated content, pass its
`opportunityId` when calling `POST /api/social/scheduled-posts` — nothing
in Content Intelligence's scoring/generation logic was touched.

## API contract

All endpoints require `Authorization: Bearer <MESSENGER_API_KEY>` — no new
auth mechanism.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/social/scheduled-posts` | Create. Body: `platform`, `pageId`, `caption`, `mediaUrls?`, `scheduledAt`, `timezone`, `opportunityId?`. |
| GET | `/api/social/scheduled-posts?platform=&status=&from=&to=&cursor=` | List, filtered/paginated. |
| GET | `/api/social/scheduled-posts/:id` | Full status. |
| PATCH | `/api/social/scheduled-posts/:id` | Edit/reschedule — only while `schedule_pending`/`scheduled`/`failed`. |
| POST | `/api/social/scheduled-posts/:id/cancel` | Idempotent. |
| POST | `/api/social/scheduled-posts/:id/publish-now` | Immediate publish, same shared publishing service as the scheduler. |
| POST | `/api/social/scheduled-posts/:id/retry` | Only from `failed`. |
| POST or GET | `/api/social/scheduler/run` | The scheduler tick — point an external trigger here (see above). |

### ScheduledPostDto

```ts
{
  id: string,
  platform: "facebook",
  pageId: string,
  caption: string | null,
  mediaUrls: string[],
  status: "schedule_pending" | "scheduled" | "publishing" | "published" | "failed" | "cancelled",
  scheduledAt: string | null,       // ISO, UTC
  timezone: string | null,          // IANA zone
  scheduledAtDisplay: string | null,// e.g. "20 Sep 2026, 18:30", pre-formatted in `timezone`
  publishedAt: string | null,
  externalPostId: string | null,    // real Meta post id, only once published
  externalPermalink: string | null, // https://www.facebook.com/{externalPostId}
  attemptCount: number,
  lastAttemptAt: string | null,
  nextRetryAt: string | null,
  errorCode: string | null,
  errorMessage: string | null,
  opportunityId: string | null,
  createdAt: string,
  updatedAt: string,
}
```

## Files

- `src/lib/social-scheduling/types.ts` — shared types
- `src/lib/social-scheduling/config.ts` — supported-platform/Page checks, retry/backoff constants
- `src/lib/social-scheduling/timezone.ts` — DST-correct local-time <-> UTC conversion
- `src/lib/social-scheduling/media.ts` — media URL validation
- `src/lib/social-scheduling/validation.ts` — request input validation
- `src/lib/social-scheduling/store.ts` — persistence + the atomic claim/retry state machine
- `src/lib/social-scheduling/publish.ts` — the ONE shared Meta-publishing service
- `src/lib/social-scheduling/errors.ts` — permanent-vs-transient Meta error classification
- `src/lib/social-scheduling/worker.ts` — the scheduler tick orchestration
- `src/lib/facebook/graph.ts` — extended (not duplicated) with `createPageFeedPost`/`createPagePhotoPost`, reusing the existing Page Access Token resolution
- `supabase_migration_social_scheduling.sql` — run this once, by hand, in the Supabase SQL editor
