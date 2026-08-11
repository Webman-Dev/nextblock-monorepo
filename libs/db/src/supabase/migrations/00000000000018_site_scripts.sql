-- Site scripts: admin-authored JavaScript injected into every page of the public site.
--
-- Rich-text blocks can already carry an inline <script>, but that script belongs to
-- one block on one page. This table is for behaviour that spans the site: chat
-- widgets, third-party embeds, and the scroll/animation helpers that page classes
-- rely on. Each row gets a name, an on/off switch, and a defined injection point.
--
-- NOT the same thing as `site_settings.privacy_settings -> custom_scripts`, which is
-- a single consent-gated blob for marketing tags and only fires once a visitor
-- accepts cookies. Rows here are functional site code and run unconditionally, so
-- anything requiring consent belongs in that setting instead, not this table.
--
-- Scripts are emitted with the request's CSP nonce by the root layout, so they run
-- under the site's existing Content-Security-Policy rather than forcing it open.
--
-- Security posture: this is arbitrary JavaScript on every page, so writes are
-- ADMIN-only (WRITER is deliberately excluded, unlike most content tables) and the
-- public may read only rows that are switched on, so a half-written draft is never
-- served to a visitor.

CREATE TABLE IF NOT EXISTS public.site_scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    -- Raw JavaScript, stored WITHOUT the surrounding <script> tag. The layout adds
    -- the tag so the nonce and attributes are always applied by us, never by the
    -- author. Ignored when `src` is set.
    code text DEFAULT ''::text NOT NULL,
    -- When set, an external script is loaded from this URL and `code` is ignored.
    src text,
    -- Where the tag is emitted. 'head' runs before first paint (blocking, use
    -- sparingly); 'body_end' runs once the markup exists and is the right default
    -- for anything that queries the DOM.
    placement text DEFAULT 'body_end'::text NOT NULL,
    -- Applies to external `src` scripts; inline code ignores it.
    load_strategy text DEFAULT 'default'::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_scripts_pkey PRIMARY KEY (id),
    CONSTRAINT site_scripts_placement_check
        CHECK ((placement = ANY (ARRAY['head'::text, 'body_start'::text, 'body_end'::text]))),
    CONSTRAINT site_scripts_load_strategy_check
        CHECK ((load_strategy = ANY (ARRAY['default'::text, 'defer'::text, 'async'::text]))),
    -- An external script must be https so it cannot be downgraded in transit.
    CONSTRAINT site_scripts_src_scheme_check
        CHECK ((src IS NULL OR src ~ '^https://')),
    -- A row has to actually do something: inline code or an external src.
    CONSTRAINT site_scripts_has_payload_check
        CHECK ((src IS NOT NULL OR length(btrim(code)) > 0))
);

COMMENT ON TABLE public.site_scripts IS
    'Admin-authored JavaScript injected into the public site by the root layout, with the request CSP nonce applied. Only is_active rows are publicly readable; only ADMIN may write. Distinct from privacy_settings.custom_scripts, which is consent-gated marketing tags.';

CREATE INDEX IF NOT EXISTS site_scripts_active_placement_sort_idx
    ON public.site_scripts USING btree (is_active, placement, sort_order);

DROP TRIGGER IF EXISTS set_site_scripts_updated_at ON public.site_scripts;
CREATE TRIGGER set_site_scripts_updated_at
    BEFORE UPDATE ON public.site_scripts
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.site_scripts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.site_scripts TO anon;
GRANT ALL ON TABLE public.site_scripts TO authenticated;
GRANT ALL ON TABLE public.site_scripts TO service_role;

-- Anonymous visitors need the active scripts to render the page. Inactive rows stay
-- private so a half-written script is never exposed before it is switched on.
DROP POLICY IF EXISTS "Public read active site scripts" ON public.site_scripts;
CREATE POLICY "Public read active site scripts" ON public.site_scripts
    FOR SELECT TO authenticated, anon USING (is_active);

DROP POLICY IF EXISTS "Admins read all site scripts" ON public.site_scripts;
CREATE POLICY "Admins read all site scripts" ON public.site_scripts
    FOR SELECT TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins insert site scripts" ON public.site_scripts;
CREATE POLICY "Admins insert site scripts" ON public.site_scripts
    FOR INSERT TO authenticated
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins update site scripts" ON public.site_scripts;
CREATE POLICY "Admins update site scripts" ON public.site_scripts
    FOR UPDATE TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role))
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins delete site scripts" ON public.site_scripts;
CREATE POLICY "Admins delete site scripts" ON public.site_scripts
    FOR DELETE TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));
