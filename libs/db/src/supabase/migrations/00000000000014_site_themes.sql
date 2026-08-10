-- Editable site themes.
--
-- Themes used to be hardcoded CSS classes in libs/ui/src/styles/theme.css
-- (:root / .dark / .vibrant) with the switcher list duplicated in
-- apps/nextblock/app/providers.tsx and components/theme-switcher.tsx. This moves
-- the palette into the database so an ADMIN can retint the site, add themes and
-- remove them from /cms/settings/global-css without a redeploy.
--
-- Rendering: apps/nextblock/lib/themes/buildThemeCss.ts turns each row into a
-- `:root.<slug> { --token: value; ... }` rule injected into <head> by
-- app/layout.tsx. The `:root.x` form is two-class specificity, so generated
-- themes always beat the (0,1,0) fallback rules still shipped in theme.css for
-- consumers of the published @nextblock-cms/ui package.
--
-- Forward-only and idempotent.

CREATE TABLE IF NOT EXISTS public.site_themes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    -- lucide-react icon name rendered by the theme switcher.
    icon text NOT NULL DEFAULT 'Palette',
    -- Drives the CSS `color-scheme` property and decides whether the theme also
    -- carries Tailwind's `.dark` class so `dark:` variants resolve correctly.
    color_scheme text NOT NULL DEFAULT 'light',
    -- Flat map of design token -> raw CSS value, keys WITHOUT the leading `--`,
    -- e.g. {"background": "0 0% 100%", "radius": "0.75rem"}.
    tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Optional per-theme CSS, emitted nested inside the theme rule so it is
    -- automatically scoped. Authors use the `&` nesting selector,
    -- e.g. `& h1 { text-shadow: 0 0 5px hsl(var(--primary)); }`.
    extra_css text,
    -- System themes cannot be deleted: next-themes' `enableSystem` resolves to
    -- 'light' or 'dark', so those two slugs must always exist.
    is_system boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_themes_pkey PRIMARY KEY (id),
    CONSTRAINT site_themes_slug_key UNIQUE (slug),
    CONSTRAINT site_themes_color_scheme_check CHECK ((color_scheme = ANY (ARRAY['light'::text, 'dark'::text]))),
    -- The slug becomes a CSS class and a next-themes value; keep it safe for both.
    CONSTRAINT site_themes_slug_format_check CHECK ((slug ~ '^[a-z][a-z0-9-]{0,38}[a-z0-9]$')),
    CONSTRAINT site_themes_tokens_is_object_check CHECK ((jsonb_typeof(tokens) = 'object'))
);

COMMENT ON TABLE public.site_themes IS 'Editable colour themes. Each row renders to a `:root.<slug>` CSS rule injected by the root layout. Publicly readable (anonymous visitors need the palette); only ADMIN may write.';

CREATE INDEX IF NOT EXISTS site_themes_active_sort_idx ON public.site_themes USING btree (is_active, sort_order);

-- Exactly one default theme.
CREATE UNIQUE INDEX IF NOT EXISTS site_themes_single_default_idx ON public.site_themes USING btree (is_default) WHERE (is_default = true);

DROP TRIGGER IF EXISTS set_site_themes_updated_at ON public.site_themes;
CREATE TRIGGER set_site_themes_updated_at
    BEFORE UPDATE ON public.site_themes
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- A system theme must never be deleted, whoever asks.
CREATE OR REPLACE FUNCTION public.prevent_system_theme_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Theme "%" is a system theme and cannot be deleted', OLD.slug
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_system_theme_delete ON public.site_themes;
CREATE TRIGGER trg_prevent_system_theme_delete
    BEFORE DELETE ON public.site_themes
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_theme_delete();

-- Promoting a theme to default demotes the previous one, so the unique partial
-- index above can never trip on a normal "make this the default" write.
CREATE OR REPLACE FUNCTION public.handle_default_theme_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.site_themes
       SET is_default = false
     WHERE id <> NEW.id AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_default_theme_change ON public.site_themes;
CREATE TRIGGER trg_handle_default_theme_change
    AFTER INSERT OR UPDATE OF is_default ON public.site_themes
    FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION public.handle_default_theme_change();

ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.site_themes TO anon;
GRANT ALL ON TABLE public.site_themes TO authenticated;
GRANT ALL ON TABLE public.site_themes TO service_role;

DROP POLICY IF EXISTS "Public read active themes" ON public.site_themes;
CREATE POLICY "Public read active themes" ON public.site_themes
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admins insert themes" ON public.site_themes;
CREATE POLICY "Admins insert themes" ON public.site_themes
    FOR INSERT TO authenticated
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins update themes" ON public.site_themes;
CREATE POLICY "Admins update themes" ON public.site_themes
    FOR UPDATE TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role))
    WITH CHECK (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Admins delete themes" ON public.site_themes;
CREATE POLICY "Admins delete themes" ON public.site_themes
    FOR DELETE TO authenticated
    USING (((SELECT public.get_current_user_role()) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS "Service role manages themes" ON public.site_themes;
CREATE POLICY "Service role manages themes" ON public.site_themes
    TO service_role USING (true) WITH CHECK (true);

-- Seed the three shipped themes from libs/ui/src/styles/theme.css.
-- `--warning` / `--warning-foreground` are declared in the Tailwind theme
-- (libs/ui/tailwind.config.js) but were never defined in CSS, so bg-warning and
-- text-warning resolved to an invalid colour. They are given real values here.
INSERT INTO public.site_themes (slug, name, description, icon, color_scheme, is_system, is_default, sort_order, tokens, extra_css)
VALUES
  (
    'light', 'Light', 'Clean, technical, stark.', 'Sun', 'light', true, true, 10,
    '{
      "background": "0 0% 100%",
      "foreground": "222 47% 11%",
      "card": "0 0% 100%",
      "card-foreground": "222 47% 11%",
      "popover": "0 0% 100%",
      "popover-foreground": "222 47% 11%",
      "primary": "211.55 50.26% 37.84%",
      "primary-foreground": "210 40% 98%",
      "secondary": "210 40% 96.1%",
      "secondary-foreground": "222 47% 11%",
      "muted": "210 40% 96.1%",
      "muted-foreground": "215 16% 47%",
      "accent": "210 40% 96.1%",
      "accent-foreground": "222 47% 11%",
      "destructive": "0 84.2% 60.2%",
      "destructive-foreground": "210 40% 98%",
      "warning": "38 92% 50%",
      "warning-foreground": "222 47% 11%",
      "border": "214.3 31.8% 91.4%",
      "input": "214.3 31.8% 91.4%",
      "ring": "211.55 50.26% 37.84%",
      "radius": "0.75rem",
      "chart-1": "211.55 50.26% 37.84%",
      "chart-2": "215 16% 47%",
      "chart-3": "215 25% 27%",
      "chart-4": "210 40% 96%",
      "chart-5": "214 32% 91%"
    }'::jsonb,
    NULL
  ),
  (
    'dark', 'Dark', 'Midnight / neon tech.', 'Moon', 'dark', true, false, 20,
    '{
      "background": "222 47% 2%",
      "foreground": "210 40% 98%",
      "card": "222 47% 11%",
      "card-foreground": "210 40% 98%",
      "popover": "222 47% 11%",
      "popover-foreground": "210 40% 98%",
      "primary": "217 91% 60%",
      "primary-foreground": "222 47% 11%",
      "secondary": "217.2 32.6% 17.5%",
      "secondary-foreground": "210 40% 98%",
      "muted": "217.2 32.6% 17.5%",
      "muted-foreground": "215 20.2% 65.1%",
      "accent": "217.2 32.6% 17.5%",
      "accent-foreground": "210 40% 98%",
      "destructive": "0 62.8% 30.6%",
      "destructive-foreground": "210 40% 98%",
      "warning": "38 92% 50%",
      "warning-foreground": "222 47% 11%",
      "border": "217.2 32.6% 17.5%",
      "input": "217.2 32.6% 17.5%",
      "ring": "224 76% 48%",
      "radius": "0.75rem",
      "chart-1": "220 70% 50%",
      "chart-2": "160 60% 45%",
      "chart-3": "30 80% 55%",
      "chart-4": "280 65% 60%",
      "chart-5": "340 75% 55%"
    }'::jsonb,
    NULL
  ),
  (
    'vibrant', 'Vibrant', 'Cyberpunk neon.', 'Zap', 'dark', false, false, 30,
    '{
      "background": "260 50% 5%",
      "foreground": "180 100% 90%",
      "card": "260 50% 8%",
      "card-foreground": "180 100% 90%",
      "popover": "260 50% 8%",
      "popover-foreground": "180 100% 90%",
      "primary": "320 100% 55%",
      "primary-foreground": "0 0% 100%",
      "secondary": "180 100% 50%",
      "secondary-foreground": "260 50% 5%",
      "muted": "260 30% 15%",
      "muted-foreground": "260 20% 65%",
      "accent": "280 100% 50%",
      "accent-foreground": "0 0% 100%",
      "destructive": "0 100% 50%",
      "destructive-foreground": "0 0% 100%",
      "warning": "60 100% 50%",
      "warning-foreground": "260 50% 5%",
      "border": "320 100% 55%",
      "input": "260 30% 15%",
      "ring": "320 100% 55%",
      "radius": "0px",
      "chart-1": "320 100% 55%",
      "chart-2": "180 100% 50%",
      "chart-3": "280 100% 50%",
      "chart-4": "60 100% 50%",
      "chart-5": "120 100% 50%"
    }'::jsonb,
    '& h1, & h2, & h3, & h4, & h5, & h6 {
  text-shadow: 0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--secondary));
}
& button, & [role="button"] {
  box-shadow: 0 0 5px hsl(var(--primary) / 0.5);
  transition: box-shadow 0.3s ease;
}
& button:hover, & [role="button"]:hover {
  box-shadow: 0 0 15px hsl(var(--primary));
}
& .card, & [class*="card"] {
  border: 1px solid hsl(var(--primary));
  box-shadow: 0 0 10px hsl(var(--primary) / 0.2);
}
& .border {
  border-color: hsl(var(--border));
  box-shadow: 0 0 5px hsl(var(--border) / 0.3);
}'
  )
ON CONFLICT (slug) DO NOTHING;
