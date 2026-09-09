-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Facebook Content Intelligence
-- ─────────────────────────────────────────────────────────────────────────────
-- Standalone, idempotent. Backs the new Content Intelligence pipeline:
-- src/lib/content-intelligence/* and /api/content-intelligence/*.
--
-- Four concepts, kept as separate tables per the architecture rule that
-- CURRENT TREND, GP PERFORMANCE, CONTENT OPPORTUNITY, and AI-GENERATED
-- CONTENT must stay distinguishable in the data model even though the
-- product combines them:
--
--   content_trend_signals — layer 1, CURRENT TREND. Raw, normalized signals
--     from external trend sources (currently: Google News RSS, food/
--     hospitality industry queries — see src/lib/content-intelligence/
--     trend-sources/google-news.ts). This table IS the caching layer for
--     trend data (requirement 8) — a fetch persists here; a subsequent
--     request within the TTL reads from here instead of re-fetching.
--     GP PERFORMANCE itself is NOT stored here — it already lives in
--     facebook_insights/instagram_insights/facebook_posts/instagram_media,
--     queried directly by src/lib/content-intelligence/performance.ts.
--
--   content_opportunities — layer 3, CONTENT OPPORTUNITY. Computed by
--     combining trend signals with real Facebook/Instagram performance data
--     (never stored twice — this table holds only the opportunity's own
--     scores/reasoning, plus a reference to which trend signal(s)
--     contributed, not a copy of the underlying performance data).
--
--   generated_content — layer 4, AI-GENERATED CONTENT. A draft produced
--     from one opportunity. status starts 'draft' and is never
--     auto-advanced to 'published' by this schema — publishing is a
--     separate, explicit operation (requirement 6), not implemented by this
--     migration.
--
--   content_performance — learning-loop preparation (requirement 7).
--     Schema only; nothing populates real metrics into it yet (there is no
--     publish step yet to measure the results of). Links a published post
--     back to the opportunity/trend/topic/format/generated content that
--     produced it, so a future "measure + learn" step has something to
--     write into. No fake scores are seeded here.
--
-- Safe to run multiple times: CREATE TABLE/INDEX IF NOT EXISTS only, no DROP
-- statements, no existing data touched.
--
-- Row Level Security: intentionally NOT enabled, for the same reason as
-- every other table in this schema — this backend only ever talks to
-- Supabase via the service-role key, which bypasses RLS regardless.
--
-- No Meta access tokens, App Secret, or Azure OpenAI keys are stored in any
-- of these tables.

CREATE TABLE IF NOT EXISTS content_trend_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  category text,
  description text,
  source text NOT NULL,          -- e.g. "google_news"
  source_url text,                -- the real article URL this signal is evidence from
  detected_at timestamptz NOT NULL,  -- the source's own published/detected time
  freshness text NOT NULL CHECK (freshness IN ('new', 'recent', 'aging', 'stale')),
  momentum_score numeric NOT NULL,
  relevance_score numeric NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  evidence jsonb NOT NULL,        -- array of {title, url, publishedAt, sourceName} — the real articles behind this signal
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_trend_signals_fetched_at ON content_trend_signals(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_trend_signals_category ON content_trend_signals(category);
CREATE INDEX IF NOT EXISTS idx_content_trend_signals_confidence ON content_trend_signals(confidence);
CREATE INDEX IF NOT EXISTS idx_content_trend_signals_freshness ON content_trend_signals(freshness);

CREATE TABLE IF NOT EXISTS content_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,           -- the connected restaurant's Page (GP_CAFE_PAGE_ID today; not hard-coded in code)
  title text NOT NULL,
  recommendation text NOT NULL,
  topic text NOT NULL,
  format text NOT NULL,            -- 'photo' | 'reel' | 'video' | 'carousel' | 'story' | 'text'
  reason text NOT NULL,
  trend_signal_id uuid REFERENCES content_trend_signals(id) ON DELETE SET NULL, -- null when this opportunity is grounded purely in the restaurant's own historical performance, with no matching current trend
  trend_score numeric NOT NULL,
  audience_fit_score numeric NOT NULL,
  historical_fit_score numeric NOT NULL,
  freshness_score numeric NOT NULL,
  opportunity_score numeric NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  recommended_day text,
  recommended_time text,
  supporting_evidence jsonb NOT NULL,  -- array of real, human-readable "why" strings + the data points behind them
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_opportunities_page_id ON content_opportunities(page_id);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_opportunity_score ON content_opportunities(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_computed_at ON content_opportunities(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_trend_signal_id ON content_opportunities(trend_signal_id);

CREATE TABLE IF NOT EXISTS generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES content_opportunities(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  format text NOT NULL,
  objective text,
  tone text,
  additional_instructions text,
  concept text,
  hook text,
  caption text,
  cta text,
  hashtags jsonb,
  creative_brief text,
  video_script text,
  visual_direction text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_content_opportunity_id ON generated_content(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_page_id ON generated_content(page_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);

-- Learning-loop preparation (requirement 7). Nothing writes real rows here
-- yet — there is no publish step in this migration — but the shape is
-- ready: once content is actually published, a future feature can insert a
-- row here linking it back to what produced it, then later update `metrics`
-- with real, measured performance (never fabricated).
CREATE TABLE IF NOT EXISTS content_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id uuid NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES content_opportunities(id) ON DELETE SET NULL,
  trend_signal_id uuid REFERENCES content_trend_signals(id) ON DELETE SET NULL,
  topic text,
  format text,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  published_post_id text,          -- the real Meta post/media id, once published
  published_at timestamptz,
  metrics jsonb,                   -- real, measured performance once available — null until then, never fabricated
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_performance_generated_content_id ON content_performance(generated_content_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_opportunity_id ON content_performance(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_trend_signal_id ON content_performance(trend_signal_id);
