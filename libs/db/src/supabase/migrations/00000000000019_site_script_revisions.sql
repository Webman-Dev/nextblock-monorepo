-- Audit trail and undo for site scripts.
--
-- `site_scripts` ships arbitrary JavaScript to every visitor, which makes it the
-- highest-privilege write in the CMS: a bad or malicious snippet can read cookies,
-- watch checkout forms, or phone home. Content has Revision History for exactly this
-- reason; code needs it more, not less. Every create/update/delete writes one row
-- here, and every row is a complete, restorable snapshot — so this table is both the
-- log ("who shipped what, when, from where") and the undo.
--
-- APPEND-ONLY BY CONSTRUCTION. There are no UPDATE or DELETE policies, and the
-- trigger below rejects both even for the service role, which otherwise bypasses
-- RLS. An audit trail that the compromised credential can rewrite is not an audit
-- trail. Reverting therefore writes a NEW 'revert' row rather than removing history.
--
-- `script_id` and `actor_user_id` are deliberately PLAIN uuids with no foreign keys:
-- an FK with ON DELETE SET NULL would have to UPDATE this table when a script or a
-- profile is deleted, which the append-only trigger forbids. `script_name` is
-- denormalised so a deleted script is still identifiable in the log.

CREATE TABLE IF NOT EXISTS public.site_script_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid,
    script_name text NOT NULL,
    revision_type text NOT NULL,
    -- Null when the actor could not be resolved (e.g. a localhost dev connection).
    actor_user_id uuid,
    -- Which surface made the change, so an unexpected edit can be traced back to
    -- the dashboard or to an MCP token.
    source text DEFAULT 'cms'::text NOT NULL,
    summary text,
    -- Full restorable state of the script at this revision. For 'delete' it is the
    -- state immediately BEFORE removal, so restoring it brings the script back.
    snapshot jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_script_revisions_pkey PRIMARY KEY (id),
    CONSTRAINT site_script_revisions_type_check
        CHECK ((revision_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'revert'::text]))),
    CONSTRAINT site_script_revisions_source_check
        CHECK ((source = ANY (ARRAY['cms'::text, 'mcp'::text]))),
    CONSTRAINT site_script_revisions_snapshot_is_object_check
        CHECK ((jsonb_typeof(snapshot) = 'object'))
);

COMMENT ON TABLE public.site_script_revisions IS
    'Append-only audit log and undo history for site_scripts. Each row is a restorable snapshot. UPDATE and DELETE are blocked by trigger, including for the service role.';

CREATE INDEX IF NOT EXISTS site_script_revisions_script_created_idx
    ON public.site_script_revisions USING btree (script_id, created_at DESC);

CREATE INDEX IF NOT EXISTS site_script_revisions_created_idx
    ON public.site_script_revisions USING btree (created_at DESC);

-- Enforced in the database rather than the application so it holds for every
-- caller, including the service-role client the MCP server uses.
CREATE OR REPLACE FUNCTION public.prevent_site_script_revision_rewrite() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
  RAISE EXCEPTION 'site_script_revisions is append-only; % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_site_script_revisions_append_only ON public.site_script_revisions;
CREATE TRIGGER trg_site_script_revisions_append_only
    BEFORE UPDATE OR DELETE ON public.site_script_revisions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_site_script_revision_rewrite();

ALTER TABLE public.site_script_revisions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.site_script_revisions TO authenticated;
GRANT ALL ON TABLE public.site_script_revisions TO service_role;

-- Read is ADMIN-only: snapshots contain the full source of scripts that may not be
-- active yet, and the log itself reveals operational history.
DROP POLICY IF EXISTS "Admins read site script revisions" ON public.site_script_revisions;
CREATE POLICY "Admins read site script revisions" ON public.site_script_revisions
    FOR SELECT TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins insert site script revisions" ON public.site_script_revisions;
CREATE POLICY "Admins insert site script revisions" ON public.site_script_revisions
    FOR INSERT TO authenticated
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));
