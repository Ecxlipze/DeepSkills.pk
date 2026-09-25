-- Question log for the public site assistant (/api/chat).
-- Its purpose is the unanswered-question report in the admin panel: the entries
-- visitors ask about but the knowledge base does not cover yet.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  -- Lower-cased, whitespace-collapsed copy so repeated askings group together.
  question_key TEXT NOT NULL,
  matched BOOLEAN NOT NULL DEFAULT FALSE,
  entry_id TEXT,
  confidence NUMERIC(5, 3),
  source_path TEXT,
  -- Which engine answered: 'keyword', an AI provider name, or 'keyword_fallback'.
  answered_by TEXT DEFAULT 'keyword',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe to re-run if an earlier version of this table already exists.
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS answered_by TEXT DEFAULT 'keyword';

CREATE INDEX IF NOT EXISTS chat_logs_created_at_idx ON chat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_logs_unmatched_idx ON chat_logs (matched, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_logs_question_key_idx ON chat_logs (question_key);

-- Visitor-typed text: readable by signed-in staff and the service role only.
-- No anon policy is created, so the public anon key cannot read or write it;
-- the API route writes through the service-role client.
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_logs_authenticated_admin_access ON chat_logs;
CREATE POLICY chat_logs_authenticated_admin_access
  ON chat_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
