-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Facebook Page post scheduling
-- ─────────────────────────────────────────────────────────────────────────────
-- Standalone, idempotent. Backs src/lib/social-scheduling/* and
-- /api/social/scheduled-posts/*.
--
-- Deliberately does NOT create a new "scheduled_social_posts" table.
-- generated_content (added earlier for Content Intelligence — see
-- supabase_migration_content_intelligence.sql) IS the Content Planner table
-- this feature needs: it already has page_id, platform, caption, hashtags,
-- and a status lifecycle. This migration widens it rather than duplicating
-- it, per the explicit instruction to prefer extending an existing planner
-- table over creating a parallel one.
--
-- Two changes to the existing table:
--   1. opportunity_id becomes nullable — a scheduled post no longer has to
--      originate from a Content Intelligence opportunity (the generic
--      "write a caption and schedule it" flow has none). Every row created
--      by the existing Content Intelligence /generate endpoint keeps
--      supplying one exactly as before; nothing there changes.
--   2. status gains 6 new values (schedule_pending, scheduled, publishing,
--      failed, cancelled — 'published' already existed) alongside the 3
--      Content Intelligence already uses (draft, approved, rejected).
--
-- Plus the scheduling/publishing columns themselves — all additive.
--
-- Safe to run multiple times: only ADD COLUMN IF NOT EXISTS / a
-- constraint-replace guarded to not fail if already applied, and one
-- DROP NOT NULL (safe, non-destructive, reversible, touches no data). No
-- DROP TABLE/COLUMN, no data deleted. No existing Facebook/Instagram/
-- Messenger/Google tables touched.

ALTER TABLE generated_content ALTER COLUMN opportunity_id DROP NOT NULL;

ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check
  CHECK (status IN ('draft', 'approved', 'rejected', 'published', 'schedule_pending', 'scheduled', 'publishing', 'failed', 'cancelled'));

-- Remote HTTPS URLs only (see src/lib/social-scheduling/media.ts) — this
-- app has no media upload/storage infrastructure of its own, so scheduling
-- never invents or hosts media; it only ever hands Meta a URL the caller
-- already provided. v1 supports at most one photo URL; anything else is
-- rejected at the validation layer with a clear error, never silently
-- scheduled unpublishable.
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS media_urls jsonb;

-- The canonical scheduled instant (always UTC, exact Postgres timestamptz
-- semantics) — never ambiguous local time. `timezone` is the caller's
-- original IANA zone name, kept for display/audit only; scheduled_at is
-- always what the worker compares against now().
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS external_post_id text;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS external_permalink text;

ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS error_message text;

-- Set the instant a worker claimed this row (scheduled -> publishing) — used
-- both for observability and to detect a row stuck in 'publishing' past a
-- sane timeout (see src/lib/social-scheduling/worker.ts's header comment on
-- why a stuck row is never auto-retried).
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_generated_content_scheduled_at ON generated_content(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_generated_content_platform ON generated_content(platform);
-- The worker's actual "find due posts" query filters on (status, scheduled_at)
-- together — a composite index serves that directly rather than relying on
-- the two single-column indexes above (which still help other filtered
-- queries, e.g. GET /scheduled-posts?status=&platform=).
CREATE INDEX IF NOT EXISTS idx_generated_content_status_scheduled_at ON generated_content(status, scheduled_at);
