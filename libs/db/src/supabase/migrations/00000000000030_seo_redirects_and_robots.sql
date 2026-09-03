-- SEO engine: managed 301/302 redirects and operator-configurable robots directives.
--
-- Two unrelated-looking things ship in one migration because they are the same
-- feature from an operator's point of view: the `/cms/settings/seo` screen is where
-- someone goes to say "this URL moved" and "do not crawl that". Splitting them
-- across two migrations would only mean two files that must always be applied
-- together.
--
-- WHY A TABLE AND NOT next.config.js redirects(). Redirects are content, not
-- configuration. An editor who renames a page's slug needs the old URL to keep
-- working immediately, without a redeploy and without touching source control.
-- That rules out the build-time array; it has to be data.
--
-- WHY THE PROXY READS THIS WITH THE ANON KEY. apps/nextblock/proxy.ts (Next 16's
-- renamed middleware) resolves redirects before rendering, and it holds a Supabase
-- client built from the anon key. So the public SELECT policy below is load-bearing:
-- without an explicit `TO authenticated, anon` grant the proxy's lookup would return
-- zero rows for every anonymous visitor -- silently, with no error -- and no redirect
-- would ever fire. Only is_active rows are exposed, so a half-written rule is never
-- live.
--
-- WHY status_code IS AN integer AND NOT AN ENUM. The same reasoning migration 27
-- recorded for `source`: a Postgres enum cannot be extended and used inside the same
-- transaction, which is exactly the scope of one migration file. A CHECK constraint
-- is replaceable in a single statement. 301 and 302 are the only two values the
-- admin UI offers; 307/308 are deliberately not exposed, because their
-- method-preserving semantics surprise operators who just want "this page moved".
--
-- LOOP SAFETY is enforced in application code (wouldCreateLoop in
-- @nextblock-cms/utils, called by the admin server actions) rather than by a
-- constraint, because detecting a cycle requires walking the whole table and a CHECK
-- constraint can only see one row. The self-redirect case IS cheap to check per row,
-- so that one is a constraint -- it is the cycle operators actually hit.
--
-- SECURITY POSTURE. A redirect can send every visitor of a path to an arbitrary
-- external origin, which makes this table an open-redirect surface and a phishing
-- lever. Writes are therefore ADMIN-only -- WRITER is deliberately excluded, matching
-- site_scripts rather than the content tables. Reads are public but limited to active
-- rows. The robots settings live in site_settings, whose existing read policy is
-- already public for non-secret keys; nothing here is secret.
--
-- Forward-only and idempotent.

CREATE TABLE IF NOT EXISTS public.cms_redirects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    -- The incoming site-relative path to match, normalized by the application to a
    -- leading slash with no trailing slash (except root). Matching is exact: prefix
    -- and wildcard rules are deliberately not supported, because they are the usual
    -- way an operator builds an accidental loop.
    source_path text NOT NULL,
    -- Where to send the visitor. Either another site-relative path or a fully
    -- qualified https URL for an off-site move.
    destination_path text NOT NULL,
    -- 301 permanent (the SEO-meaningful one: search engines transfer ranking signals
    -- and browsers cache it aggressively) or 302 temporary.
    status_code integer DEFAULT 301 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cms_redirects_pkey PRIMARY KEY (id),
    -- One rule per source. This UNIQUE constraint also provides the index the proxy
    -- lookup relies on, so no separate plain index on source_path is needed.
    CONSTRAINT cms_redirects_source_path_key UNIQUE (source_path),
    CONSTRAINT cms_redirects_status_code_check
        CHECK ((status_code = ANY (ARRAY[301, 302]))),
    -- A source is always a path on this site; accepting an absolute URL here would
    -- silently never match, since the proxy only ever compares pathnames.
    CONSTRAINT cms_redirects_source_path_check
        CHECK ((source_path ~ '^/')),
    -- A destination is either a site-relative path or an https URL. Plain http is
    -- refused so a redirect can never downgrade a visitor to cleartext.
    CONSTRAINT cms_redirects_destination_path_check
        CHECK (((destination_path ~ '^/') OR (destination_path ~ '^https://'))),
    -- The one cycle a single row can express, and the one operators actually create.
    CONSTRAINT cms_redirects_no_self_redirect_check
        CHECK ((source_path <> destination_path))
);

COMMENT ON TABLE public.cms_redirects IS
    'Operator-managed 301/302 redirects resolved by apps/nextblock/proxy.ts before rendering. Only is_active rows are publicly readable; only ADMIN may write, because a redirect rule is an open-redirect surface.';
COMMENT ON COLUMN public.cms_redirects.source_path IS
    'Exact site-relative path to match, normalized to a leading slash and no trailing slash (except root). No wildcards, by design.';
COMMENT ON COLUMN public.cms_redirects.destination_path IS
    'Site-relative path or absolute https URL to send the visitor to.';
COMMENT ON COLUMN public.cms_redirects.status_code IS
    '301 permanent or 302 temporary. 307/308 are not offered by the admin UI.';
COMMENT ON COLUMN public.cms_redirects.is_active IS
    'Only active rows are readable by anon, and only active rows are matched by the proxy.';

-- The proxy loads the whole active set once per cache window rather than querying per
-- request, so the hot query is "all active rows" and this partial index is what serves
-- it. Carrying source_path in the index keeps that read index-only.
CREATE INDEX IF NOT EXISTS cms_redirects_active_source_idx
    ON public.cms_redirects USING btree (source_path) WHERE (is_active);

DROP TRIGGER IF EXISTS set_cms_redirects_updated_at ON public.cms_redirects;
CREATE TRIGGER set_cms_redirects_updated_at
    BEFORE UPDATE ON public.cms_redirects
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.cms_redirects ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.cms_redirects TO anon;
GRANT ALL ON TABLE public.cms_redirects TO authenticated;
GRANT ALL ON TABLE public.cms_redirects TO service_role;

-- The proxy runs as anon for a logged-out visitor, which is the overwhelming majority
-- of traffic and the only traffic redirects really matter for. Without this policy the
-- lookup returns zero rows and the feature is silently dead.
DROP POLICY IF EXISTS "Public read active redirects" ON public.cms_redirects;
CREATE POLICY "Public read active redirects" ON public.cms_redirects
    FOR SELECT TO authenticated, anon USING (is_active);

DROP POLICY IF EXISTS "Admins read all redirects" ON public.cms_redirects;
CREATE POLICY "Admins read all redirects" ON public.cms_redirects
    FOR SELECT TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins insert redirects" ON public.cms_redirects;
CREATE POLICY "Admins insert redirects" ON public.cms_redirects
    FOR INSERT TO authenticated
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins update redirects" ON public.cms_redirects;
CREATE POLICY "Admins update redirects" ON public.cms_redirects
    FOR UPDATE TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role))
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins delete redirects" ON public.cms_redirects;
CREATE POLICY "Admins delete redirects" ON public.cms_redirects
    FOR DELETE TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

-- Robots directives live in site_settings rather than a table of their own: there is
-- exactly one robots.txt per install, so a dedicated table would only ever hold one
-- row, and site_settings already carries the public-read / staff-write policy this
-- needs. The stored shape matches `RobotsSettings` in @nextblock-cms/utils, and
-- `normalizeRobotsSettings` tolerates a missing or malformed value -- so this seed is
-- a convenience for the settings screen, not a correctness requirement for rendering.
--
-- ON CONFLICT DO NOTHING because an install that has already configured robots must
-- not have its rules reset by a replay of this migration.
INSERT INTO public.site_settings (key, value)
VALUES (
    'seo_robots_settings',
    '{"customRules": "", "isIndexingEnabled": true, "sitemapEnabled": true, "userAgentRules": [{"allow": ["/"], "disallow": [], "userAgent": "*"}]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
