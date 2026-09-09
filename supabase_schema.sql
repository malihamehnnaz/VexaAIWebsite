-- Supabase schema for admin dashboard data tracking
-- Run this script in Supabase SQL editor or your Postgres database.

-- Enable UUID generation helper if not already available.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table for admin and anonymous profiles.
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,
  email text,
  full_name text,
  first_name text,
  last_name text,
  role text DEFAULT 'user',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Contact form submissions for admin review.
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  session_id text,
  name text NOT NULL,
  company text,
  email text NOT NULL,
  message text NOT NULL,
  available_date date,
  available_time text,
  page_path text,
  route text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- Chat sessions grouped by session ID.
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id text PRIMARY KEY,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  page_path text,
  route text,
  source text,
  user_agent text,
  first_seen timestamptz,
  last_seen timestamptz,
  message_count integer NOT NULL DEFAULT 0,
  quote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_seen ON chat_sessions(last_seen DESC);

-- Individual chat messages for session playback and auditing.
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  quote jsonb,
  timestamp_tz timestamptz NOT NULL DEFAULT now(),
  page_path text,
  route text,
  event_type text,
  source text,
  language text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp_tz DESC);

-- AI agent logs for tracing prompt/response events.
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  session_id text,
  event_type text,
  source text,
  page_path text,
  route text,
  language text,
  prompt text,
  response text,
  quote jsonb,
  message text,
  details jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);

-- Traffic and page event tracking.
CREATE TABLE IF NOT EXISTS traffic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  session_id text,
  event_type text,
  source text,
  page_path text,
  route text,
  details jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_traffic_events_session_id ON traffic_events(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_events_created_at ON traffic_events(created_at DESC);

-- Error logs for monitoring issues in user flows.
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  session_id text,
  event_type text,
  source text,
  page_path text,
  route text,
  message text,
  details jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- Optional table for quote payloads extracted from assistant responses.
CREATE TABLE IF NOT EXISTS project_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  quote_id text,
  currency text,
  timeline text,
  team_size text,
  cloud_deployment text,
  api_call_volume text,
  subtotal_sek numeric,
  contingency_sek numeric,
  total_sek numeric,
  price_range text,
  confidence text,
  assumptions jsonb,
  items jsonb,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_project_quotes_session_id ON project_quotes(session_id);
CREATE INDEX IF NOT EXISTS idx_project_quotes_created_at ON project_quotes(created_at DESC);

-- Optional table for service recommendation requests.
CREATE TABLE IF NOT EXISTS service_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  input jsonb,
  output jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_service_recommendations_session_id ON service_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_service_recommendations_created_at ON service_recommendations(created_at DESC);

-- Optional admin audit log table for dashboard actions.
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  object_type text,
  object_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- ── Facebook Messenger ─────────────────────────────────────────────────────────
-- Backs the /webhook (Messenger events in) and /api/messenger/* (marketing
-- website API out) routes. One conversation per (page_id, sender_id) pair;
-- supports multiple Facebook Pages — every row is tagged with its page_id.

CREATE TABLE IF NOT EXISTS messenger_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  sender_id text NOT NULL,
  last_message_text text,
  last_message_at timestamptz,
  last_direction text CHECK (last_direction IN ('inbound', 'outbound')),
  message_count integer NOT NULL DEFAULT 0,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  UNIQUE (page_id, sender_id)
);

CREATE INDEX IF NOT EXISTS idx_messenger_conversations_page_id ON messenger_conversations(page_id);
CREATE INDEX IF NOT EXISTS idx_messenger_conversations_last_message_at ON messenger_conversations(last_message_at DESC);

-- Individual Messenger messages, inbound and outbound. dedupe_key is the
-- idempotency key: Meta's own message id ("mid:<id>") when available, else a
-- deterministic composite for event types (postbacks) that have no mid — so
-- a retried webhook delivery is never stored twice.
CREATE TABLE IF NOT EXISTS messenger_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  sender_id text NOT NULL,
  recipient_id text NOT NULL,
  message_id text,
  dedupe_key text NOT NULL,
  event_type text NOT NULL DEFAULT 'message',
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  text text,
  status text NOT NULL DEFAULT 'received',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messenger_messages_dedupe_key ON messenger_messages(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_conversation_id ON messenger_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_page_id ON messenger_messages(page_id);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_occurred_at ON messenger_messages(occurred_at DESC);

-- ── Google OAuth / GA4 ─────────────────────────────────────────────────────────
-- Backs /api/google/oauth(/callback) and /api/google/analytics/*.
-- user_id is 'admin' today — this app has exactly one authenticated identity
-- (the shared admin login in src/lib/session.ts; app_users above exists in
-- schema but isn't wired to any real multi-user auth flow). If real per-user
-- auth is added later, this table's user_id is the one place that needs to
-- start storing a real user identifier instead of the constant.
-- refresh_token_encrypted / access_token_encrypted are AES-256-GCM ciphertext
-- (see src/lib/google/crypto.ts) — never stored in plaintext.
CREATE TABLE IF NOT EXISTS google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'admin',
  provider text NOT NULL DEFAULT 'google',
  google_account_id text,
  google_email text,
  refresh_token_encrypted text NOT NULL,
  access_token_encrypted text,
  access_token_expires_at timestamptz,
  property_id text NOT NULL,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  metadata jsonb,
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_google_connections_user_id ON google_connections(user_id);

-- ── Facebook Comments ──────────────────────────────────────────────────────────
-- Backs /webhook (Page "feed" comment events, alongside the existing
-- Messenger handling) and /api/facebook/comments/* (the separate marketing
-- website's API). Scoped in application code to page_id = '106658601471856'
-- (GP's - Guilty Pleasure Café) only — see src/lib/facebook/config.ts; Nitol
-- Bot (211548128717427) is never written here. No access tokens are stored
-- in either table.

CREATE TABLE IF NOT EXISTS facebook_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  post_id text NOT NULL,
  message text,
  permalink text,
  created_at_meta timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_page_id ON facebook_posts(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_created_at_meta ON facebook_posts(created_at_meta DESC);

-- status lifecycle: new -> read -> replied (see src/lib/facebook/store.ts).
-- parent_comment_id is null for a top-level comment (its Meta "parent" is
-- the post itself), or another comment's comment_id for a nested reply.
CREATE TABLE IF NOT EXISTS facebook_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  post_id text NOT NULL,
  comment_id text NOT NULL,
  parent_comment_id text,
  commenter_id text,
  commenter_name text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at_meta timestamptz,
  updated_at_meta timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_facebook_comments_page_id ON facebook_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_comments_post_id ON facebook_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_facebook_comments_parent_comment_id ON facebook_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_facebook_comments_status ON facebook_comments(status);
CREATE INDEX IF NOT EXISTS idx_facebook_comments_created_at_meta ON facebook_comments(created_at_meta DESC);

-- One row per (page_id, metric, date) — deduplicated history of Facebook
-- Page organic Insights, populated opportunistically by every real
-- /api/facebook/insights request (src/lib/facebook/store.ts). Same shape/
-- purpose as instagram_insights, except upserted (not append-only) since
-- the unique constraint is exactly what makes repeated syncs idempotent
-- rather than an append-only audit log.
CREATE TABLE IF NOT EXISTS facebook_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  metric text NOT NULL,
  value numeric,
  date date NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, metric, date)
);

CREATE INDEX IF NOT EXISTS idx_facebook_insights_page_id ON facebook_insights(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_insights_metric ON facebook_insights(metric);
CREATE INDEX IF NOT EXISTS idx_facebook_insights_date ON facebook_insights(date DESC);

-- ── Instagram ──────────────────────────────────────────────────────────────────
-- Backs /webhook (Instagram "comments"/messaging events, alongside the
-- existing Messenger and Facebook Comments handling) and /api/instagram/*
-- (the separate Marketing Website's API). Scoped in application code to
-- Instagram Business Account 17841444033414031, connected via Page
-- 106658601471856 — see src/lib/instagram/config.ts. No access tokens are
-- stored in any of these tables (reuses the Page's token via
-- src/lib/meta/config.ts, same as Messenger/Facebook Comments).

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
