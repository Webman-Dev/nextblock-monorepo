-- 00000000000019_add_product_categories.sql
-- Migration adding categories and many-to-many product_categories join table.

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Indexing foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON public.product_categories(category_id);

-- Documenting the tables
COMMENT ON TABLE public.categories IS 'Product categories for organizing catalog items.';
COMMENT ON TABLE public.product_categories IS 'Junction table mapping products to multiple categories.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies
CREATE POLICY "Public can view categories"
  ON public.categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view product_categories"
  ON public.product_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

CREATE POLICY "Admin can manage product_categories"
  ON public.product_categories
  FOR ALL
  TO authenticated
  USING (((SELECT public.is_admin()) IS TRUE))
  WITH CHECK (((SELECT public.is_admin()) IS TRUE));

-- Define Grants for roles
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.product_categories TO anon;
GRANT ALL ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
