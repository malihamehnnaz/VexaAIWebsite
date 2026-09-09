-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Google Business Profile review management
-- ─────────────────────────────────────────────────────────────────────────────
-- Standalone, idempotent. Backs src/lib/google-business/* and
-- /api/google/business/*.
--
-- Deliberately does NOT create a second Google connection/token table.
-- Google Business Profile reuses the existing google_connections row (same
-- refresh token, same encryption, same tenant key — business.manage is
-- simply a third scope alongside analytics.readonly/webmasters.readonly,
-- added the same way Search Console was added alongside GA4). This
-- migration only:
--   1. Adds a `status` column to the EXISTING google_connections table
--      (connected | disconnected | needs_reconnect) — the one genuinely new
--      piece of connection-level state this feature needs, since GA4/Search
--      Console never had a persistent "needs reconnect" concept (a failed
--      live call just surfaced an error; this feature needs it durable so
--      /status can report it without a live Google call).
--   2. Adds three new tables for locations/reviews — Business Profile's own
--      data, unrelated to the connection/token itself.
--
-- Row Level Security: intentionally NOT enabled, for the same reason as
-- every other table in this schema — this backend only ever talks to
-- Supabase via the service-role key, which bypasses RLS regardless.

ALTER TABLE google_connections ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'connected';
DO $$ BEGIN
  ALTER TABLE google_connections ADD CONSTRAINT google_connections_status_check CHECK (status IN ('connected', 'disconnected', 'needs_reconnect'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Required for disconnect/revocation to actually clear the stored refresh
-- token (a non-negotiable: "clearable on request") rather than leaving a
-- known-dead value in place — the original column predates this feature
-- and was NOT NULL because every previous integration (GA4/Search Console)
-- only ever wrote a real token, never cleared one.
ALTER TABLE google_connections ALTER COLUMN refresh_token_encrypted DROP NOT NULL;

-- Resolved once per Google's account-discovery API, cached here rather than
-- re-resolved on every request (src/lib/google-business/sync.ts). One row
-- per tenant (user_id, matching google_connections' own tenant key) per
-- location — a second client is additional rows, not a schema change.
CREATE TABLE IF NOT EXISTS google_business_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'admin',
  google_account_id text NOT NULL,   -- bare numeric id, prefix already stripped (see resource-id.ts)
  location_id text NOT NULL,          -- bare numeric id, prefix already stripped
  title text,
  address jsonb,                      -- storefrontAddress, as Google returns it
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_google_business_locations_user_id ON google_business_locations(user_id);

-- The local store /admin/reviews (per this feature's real route) always
-- reads from — never live from Google — per Part 3b. One row per
-- (location_id, review_id), upserted on every sync so re-running a sync is
-- idempotent and never duplicates a review.
CREATE TABLE IF NOT EXISTS google_business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL REFERENCES google_business_locations(location_id) ON DELETE CASCADE,
  review_id text NOT NULL,
  reviewer_display_name text,
  reviewer_photo_url text,
  reviewer_is_anonymous boolean NOT NULL DEFAULT false,
  star_rating integer,                -- 1-5, mapped from Google's ONE..FIVE enum; null is not expected but never assumed
  comment text,                       -- null for a rating-only review — handled without throwing throughout
  create_time timestamptz,
  update_time timestamptz,
  reply_comment text,
  reply_update_time timestamptz,
  reply_state text,                   -- Google's ReviewReplyState, surfaced verbatim — a 200 on the reply PUT does not mean published
  policy_violation jsonb,             -- Google's PolicyViolation object, when present
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_google_business_reviews_location_id ON google_business_reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_google_business_reviews_create_time ON google_business_reviews(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_google_business_reviews_star_rating ON google_business_reviews(star_rating);

-- One row, updated in place — when the whole-account sync (all locations)
-- last ran and its outcome, so /admin/google/status and the sync endpoint
-- can report staleness without re-deriving it from review rows.
CREATE TABLE IF NOT EXISTS google_business_sync_state (
  user_id text PRIMARY KEY DEFAULT 'admin',
  last_synced_at timestamptz,
  last_sync_status text,              -- 'success' | 'partial' | 'failed'
  last_sync_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
