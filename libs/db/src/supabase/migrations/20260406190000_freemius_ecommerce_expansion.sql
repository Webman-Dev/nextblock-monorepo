-- Freemius synchronization tables
CREATE TABLE IF NOT EXISTS public.freemius_plans (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    name text not null,
    title text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_freemius_plans_product_id on public.freemius_plans(product_id);
ALTER TABLE public.freemius_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read access for freemius_plans" on public.freemius_plans for select using (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.freemius_pricing (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.freemius_plans(id) on delete cascade,
    api_monthly_price numeric,
    api_annual_price numeric,
    api_lifetime_price numeric,
    override_monthly_price numeric,
    override_annual_price numeric,
    override_lifetime_price numeric,
    license_quota integer,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_freemius_pricing_plan_id on public.freemius_pricing(plan_id);
ALTER TABLE public.freemius_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read access for freemius_pricing" on public.freemius_pricing for select using (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grants
grant select on table public.freemius_plans to anon, authenticated;
grant all on table public.freemius_plans to service_role;

grant select on table public.freemius_pricing to anon, authenticated;
grant all on table public.freemius_pricing to service_role;

-- Translations
INSERT INTO public.translations (key, translations) VALUES
  ('ecommerce.pricing_unavailable', '{"en": "Pricing Unavailable", "es": "Precios no disponibles"}'),
  ('ecommerce.monthly', '{"en": "Monthly", "es": "Mensual"}'),
  ('ecommerce.annual', '{"en": "Annual", "es": "Anual"}'),
  ('ecommerce.lifetime', '{"en": "Lifetime", "es": "De por vida"}'),
  ('ecommerce.year', '{"en": "year", "es": "año"}'),
  ('ecommerce.month', '{"en": "month", "es": "mes"}'),
  ('ecommerce.get_license', '{"en": "Get License", "es": "Obtener Licencia"}'),
  ('ecommerce.added_to_cart_success', '{"en": "{item} added to your cart.", "es": "{item} añadido al carrito."}'),
  ('ecommerce.added_to_cart_error', '{"en": "Could not add item to cart.", "es": "No se pudo añadir el artículo al carrito."}')
ON CONFLICT (key) DO UPDATE
SET translations = excluded.translations;
