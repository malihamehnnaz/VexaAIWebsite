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
