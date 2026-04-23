-- 00000000000003_setup_catalog_and_licensing.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000009_setup_products_and_media.sql
-- Core product catalog tables.

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id bigint NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  translation_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('physical', 'digital')),
  payment_provider text NOT NULL CHECK (payment_provider IN ('stripe', 'freemius')),
  price integer NOT NULL,
  prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  sale_price integer,
  sale_prices jsonb,
  stock integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
  short_description text,
  description_json jsonb,
  metadata jsonb,
  freemius_plan_id text,
  freemius_product_id text,
  upc text,
  is_taxable boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT products_type_provider_consistency_check CHECK (
    (product_type = 'physical' AND payment_provider = 'stripe')
    OR (product_type = 'digital' AND payment_provider = 'freemius')
  ),
  CONSTRAINT products_language_id_slug_key UNIQUE (language_id, slug),
  CONSTRAINT products_language_id_sku_key UNIQUE (language_id, sku)
);

COMMENT ON COLUMN public.products.is_taxable IS
  'When true, this product participates in Stripe tax calculation.';
COMMENT ON COLUMN public.products.prices IS
  'Regular prices by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.products.sale_prices IS
  'Sale prices by ISO 4217 code in the smallest currency unit.';

CREATE TABLE public.product_media (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

-- 00000000000010_setup_product_variants_and_attributes.sql
-- Variant attributes, terms, and sellable variants.

CREATE TABLE public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  name_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_attribute_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  value_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_attribute_terms_attribute_id_slug_key UNIQUE (attribute_id, slug)
);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  price_adjustment integer NOT NULL DEFAULT 0,
  price integer NOT NULL DEFAULT 0,
  prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  sale_price integer,
  sale_prices jsonb,
  stock_quantity integer NOT NULL DEFAULT 0,
  upc text,
  main_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_variants_product_id_sku_key UNIQUE (product_id, sku)
);

COMMENT ON COLUMN public.product_variants.prices IS
  'Variant regular prices by ISO 4217 code in the smallest currency unit.';
COMMENT ON COLUMN public.product_variants.sale_prices IS
  'Variant sale prices by ISO 4217 code in the smallest currency unit.';

CREATE TABLE public.inventory_items (
  sku text PRIMARY KEY,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inventory_items IS
  'Source-of-truth inventory records keyed by sellable SKU.';
COMMENT ON COLUMN public.inventory_items.sku IS
  'Global sellable SKU. Matching products or variants share inventory.';
COMMENT ON COLUMN public.inventory_items.quantity IS
  'Available quantity for this SKU.';

CREATE TABLE public.variant_attribute_mapping (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_term_id uuid NOT NULL REFERENCES public.product_attribute_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (variant_id, attribute_term_id)
);

-- 00000000000011_setup_licensing_and_freemius.sql
-- Package activations and Freemius plan metadata.

CREATE TABLE public.package_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL,
  instance_name text NOT NULL,
  package_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  meta jsonb DEFAULT '{}'::jsonb,
  last_validated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (license_key, package_id)
);

CREATE TABLE public.freemius_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.freemius_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.freemius_plans(id) ON DELETE CASCADE,
  api_monthly_price numeric,
  api_annual_price numeric,
  api_lifetime_price numeric,
  override_monthly_price numeric,
  override_annual_price numeric,
  override_lifetime_price numeric,
  license_quota integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
