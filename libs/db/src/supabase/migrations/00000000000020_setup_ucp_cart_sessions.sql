-- 00000000000019_setup_ucp_cart_sessions.sql
-- Persist Universal Commerce Protocol cart sessions for agentic cart handoff.

CREATE TABLE IF NOT EXISTS public.ucp_cart_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'completed')),
  currency text NOT NULL DEFAULT 'USD',
  locale text,
  buyer_identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  totals jsonb NOT NULL DEFAULT '[]'::jsonb,
  checkout_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT ucp_cart_sessions_buyer_identity_object
    CHECK (jsonb_typeof(buyer_identity) = 'object'),
  CONSTRAINT ucp_cart_sessions_context_object
    CHECK (jsonb_typeof(context) = 'object'),
  CONSTRAINT ucp_cart_sessions_signals_object
    CHECK (jsonb_typeof(signals) = 'object'),
  CONSTRAINT ucp_cart_sessions_attribution_object
    CHECK (jsonb_typeof(attribution) = 'object'),
  CONSTRAINT ucp_cart_sessions_line_items_array
    CHECK (jsonb_typeof(line_items) = 'array'),
  CONSTRAINT ucp_cart_sessions_totals_array
    CHECK (jsonb_typeof(totals) = 'array'),
  CONSTRAINT ucp_cart_sessions_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_ucp_cart_sessions_status_expires_at
  ON public.ucp_cart_sessions (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_ucp_cart_sessions_created_at
  ON public.ucp_cart_sessions (created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_ucp_cart_sessions_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_ucp_cart_sessions_update
  ON public.ucp_cart_sessions;

CREATE TRIGGER trg_handle_ucp_cart_sessions_update
  BEFORE UPDATE ON public.ucp_cart_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ucp_cart_sessions_update();

ALTER TABLE public.ucp_cart_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucp_cart_sessions_service_role_policy
  ON public.ucp_cart_sessions;

CREATE POLICY ucp_cart_sessions_service_role_policy
  ON public.ucp_cart_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ucp_cart_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_ucp_cart_sessions_update() TO service_role;
