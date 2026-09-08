-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Instagram backend tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Standalone, idempotent extract of the Instagram section already committed
-- to supabase_schema.sql (see "Add Instagram backend/API for GP's - Guilty
-- Pleasure Cafe"). That section was written and committed but never applied
-- to the production database — confirmed via live REST queries returning
-- PGRST205 "Could not find the table" for all six tables below. This file
-- exists so it can be run standalone in the Supabase SQL editor without
-- re-pasting the entire schema file.
--
-- Safe to run multiple times: every statement is CREATE TABLE/INDEX IF NOT
-- EXISTS, there are no DROP statements, and no existing data is touched.
-- Column names/types match src/lib/instagram/store.ts exactly (verified
-- field-by-field against every query and insert/update in that file before
-- writing this).
--
-- Row Level Security: intentionally NOT enabled here, for consistency with
-- every other table in supabase_schema.sql (facebook_comments, messenger_*,
-- google_connections, etc.) — none of them have RLS enabled. This backend
-- only ever talks to Supabase via the service-role key (getSupabaseAdmin()),
-- which bypasses RLS entirely regardless, and the service role is never
-- exposed to the browser or to the Marketing OS. Enabling RLS now would be
-- an architectural change nothing else in this schema does, and would add
-- risk (a misconfigured policy silently blocking the server-side service
-- role) for no benefit given the current single-service-role access model.
--
-- Reuses the Page's existing Meta access token (src/lib/meta/config.ts) —
-- no tokens/secrets are stored in any of these tables.

CREATE TABLE IF NOT EXISTS instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_account_id text NOT NULL UNIQUE,
  username text,
  name text,
  connected_page_id text NOT NULL,
  followers_count integer,
  status text NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instagram_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id text NOT NULL UNIQUE,
  account_id text NOT NULL,
  caption text,
  media_type text,
  media_product_type text,
  timestamp timestamptz,
  permalink text,
  media_url text,
  thumbnail_url text,
  metadata jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_media_account_id ON instagram_media(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_media_timestamp ON instagram_media(timestamp DESC);

-- One row per (metric, period, media_id) fetch — a history/audit log, not a
-- point-in-time cache; media_id is null for account-level metrics.
CREATE TABLE IF NOT EXISTS instagram_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  media_id text REFERENCES instagram_media(media_id) ON DELETE CASCADE,
  metric text NOT NULL,
  value numeric,
  period text NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_insights_account_id ON instagram_insights(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_insights_media_id ON instagram_insights(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_insights_metric ON instagram_insights(metric);
CREATE INDEX IF NOT EXISTS idx_instagram_insights_fetched_at ON instagram_insights(fetched_at DESC);

-- status lifecycle: new -> read -> replied (see src/lib/instagram/store.ts).
CREATE TABLE IF NOT EXISTS instagram_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id text NOT NULL UNIQUE,
  media_id text NOT NULL,
  account_id text NOT NULL,
  parent_comment_id text,
  user_id text,
  username text,
  text text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at_meta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_comments_media_id ON instagram_comments(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_account_id ON instagram_comments(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_parent_comment_id ON instagram_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_status ON instagram_comments(status);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_created_at_meta ON instagram_comments(created_at_meta DESC);

-- conversation_id is the Meta conversation id from a real sync, or the
-- customer's IGSID when first created from a webhook "wake up" before a
-- sync has resolved it — see src/lib/instagram-webhook.ts.
CREATE TABLE IF NOT EXISTS instagram_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL UNIQUE,
  account_id text NOT NULL,
  participant_id text,
  participant_username text,
  last_message_at timestamptz,
  unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_account_id ON instagram_conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_last_message_at ON instagram_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE,
  conversation_id text NOT NULL REFERENCES instagram_conversations(conversation_id) ON DELETE CASCADE,
  sender_id text,
  recipient_id text,
  message text,
  occurred_at timestamptz,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  attachments jsonb,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation_id ON instagram_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_occurred_at ON instagram_messages(occurred_at DESC);
