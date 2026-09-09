-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Facebook Page organic Insights table
-- ─────────────────────────────────────────────────────────────────────────────
-- Standalone, idempotent extract of the facebook_insights table already
-- committed to supabase_schema.sql. Backs GET /api/facebook/insights (the
-- new Facebook Page organic-insights endpoint for the Marketing Website) —
-- see src/lib/facebook/store.ts / src/lib/facebook/graph.ts /
-- src/app/api/facebook/insights/route.ts.
--
-- Safe to run multiple times: CREATE TABLE/INDEX IF NOT EXISTS only, no DROP
-- statements, no existing data touched.
--
-- One row per (page_id, post_id, metric, date) — the UNIQUE constraint is
-- what makes repeated syncs idempotent (upserted via onConflict:
-- 'page_id,post_id,metric,date' in recordPageInsight), not an append-only
-- log like instagram_insights. Exclusively organic — there is no Facebook
-- Ads integration anywhere in this codebase to mix with.
--
-- post_id defaults to '' (empty string), not null: Postgres treats every
-- NULL as distinct from every other NULL in a UNIQUE constraint, which
-- would let duplicate page-level rows through if post_id were nullable.
-- '' means "this is a page-level metric"; a real Graph API post id means
-- post-level. `date` is the calendar day for a page-level (period=day)
-- metric, or the sync date for a post-level metric (Meta returns post
-- insights as lifetime-to-date totals, not a daily series).
--
-- Row Level Security: intentionally NOT enabled, for the same reason as
-- every other table in this schema (facebook_comments, instagram_*,
-- google_connections, etc.) — this backend only ever talks to Supabase via
-- the service-role key, which bypasses RLS regardless, and that key is
-- never exposed to the browser or the Marketing OS.
--
-- Reuses the existing Page's Meta access token (src/lib/meta/config.ts) —
-- no tokens/secrets are stored in this table.

CREATE TABLE IF NOT EXISTS facebook_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  post_id text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'page' CHECK (level IN ('page', 'post')),
  metric text NOT NULL,
  value numeric,
  date date NOT NULL,
  graph_api_version text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, post_id, metric, date)
);

CREATE INDEX IF NOT EXISTS idx_facebook_insights_page_id ON facebook_insights(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_insights_post_id ON facebook_insights(post_id);
CREATE INDEX IF NOT EXISTS idx_facebook_insights_level ON facebook_insights(level);
CREATE INDEX IF NOT EXISTS idx_facebook_insights_metric ON facebook_insights(metric);
CREATE INDEX IF NOT EXISTS idx_facebook_insights_date ON facebook_insights(date DESC);
