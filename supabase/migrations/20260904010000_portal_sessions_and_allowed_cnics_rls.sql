-- Migration: 20260904010000_portal_sessions_and_allowed_cnics_rls.sql
-- Description: Creates portal_sessions table for server-side revocable CNIC authentication
-- and locks down allowed_cnics with Row Level Security (RLS) denying all direct client access.

-- 1. Create portal_sessions table
CREATE TABLE IF NOT EXISTS public.portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL,
    cnic TEXT NOT NULL,
    role TEXT NOT NULL,
    actor_id UUID NULL,
    actor_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    revoked_reason TEXT NULL,
    user_agent TEXT NULL,
    ip_address TEXT NULL
);

-- 2. Indexes on portal_sessions
CREATE INDEX IF NOT EXISTS idx_portal_sessions_cnic ON public.portal_sessions(cnic);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires_at ON public.portal_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_revoked_at ON public.portal_sessions(revoked_at);

-- 3. Secure portal_sessions with RLS
ALTER TABLE public.portal_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.portal_sessions FROM anon;
REVOKE ALL ON TABLE public.portal_sessions FROM authenticated;
GRANT ALL ON TABLE public.portal_sessions TO service_role;

DROP POLICY IF EXISTS portal_sessions_no_client_access ON public.portal_sessions;
CREATE POLICY portal_sessions_no_client_access ON public.portal_sessions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 4. Secure allowed_cnics with RLS
ALTER TABLE public.allowed_cnics ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.allowed_cnics FROM anon;
REVOKE ALL ON TABLE public.allowed_cnics FROM authenticated;
GRANT ALL ON TABLE public.allowed_cnics TO service_role;

DROP POLICY IF EXISTS allowed_cnics_deny_anon ON public.allowed_cnics;
CREATE POLICY allowed_cnics_deny_anon ON public.allowed_cnics
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS allowed_cnics_deny_authenticated ON public.allowed_cnics;
CREATE POLICY allowed_cnics_deny_authenticated ON public.allowed_cnics
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
