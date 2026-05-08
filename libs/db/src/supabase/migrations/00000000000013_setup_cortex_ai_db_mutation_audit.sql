-- 00000000000013_setup_cortex_ai_db_mutation_audit.sql
-- Durable audit trail for confirmed Cortex AI database mutations.

CREATE TABLE IF NOT EXISTS public.cortex_ai_db_mutation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  action_name text NOT NULL,
  target_tables text[] NOT NULL DEFAULT '{}'::text[],
  operation_summary text NOT NULL,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cortex_ai_db_mutation_audit IS
  'Audit trail for confirmed Cortex AI database mutation attempts.';
COMMENT ON COLUMN public.cortex_ai_db_mutation_audit.payload IS
  'Redacted tool input payload for the confirmed mutation attempt.';
COMMENT ON COLUMN public.cortex_ai_db_mutation_audit.preview IS
  'Redacted confirmation preview shown before the mutation was confirmed.';

ALTER TABLE public.cortex_ai_db_mutation_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.cortex_ai_db_mutation_audit TO authenticated, service_role;

DROP POLICY IF EXISTS cortex_ai_db_mutation_audit_admin_read_policy
  ON public.cortex_ai_db_mutation_audit;

CREATE POLICY cortex_ai_db_mutation_audit_admin_read_policy
  ON public.cortex_ai_db_mutation_audit
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

DROP POLICY IF EXISTS cortex_ai_db_mutation_audit_service_role_policy
  ON public.cortex_ai_db_mutation_audit;

CREATE POLICY cortex_ai_db_mutation_audit_service_role_policy
  ON public.cortex_ai_db_mutation_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
