-- 20260408120000_harden_ecommerce_fulfillment.sql
-- Foundation for physical goods fulfillment: tables, functions, and RLS

-- 1. Helper Function: is_admin
-- Used by multiple modules for RLS checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'ADMIN' FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Table: user_addresses
-- Stores multiple addresses per user (billing/shipping)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    address_type text NOT NULL CHECK (address_type IN ('billing', 'shipping')),
    is_default boolean DEFAULT false,
    line1 text,
    line2 text,
    city text,
    state text,
    postal_code text,
    country_code text, -- ISO 3166-1 alpha-2
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON public.user_addresses(address_type);

-- RLS for user_addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage own addresses"
  ON public.user_addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages all addresses" ON public.user_addresses;
CREATE POLICY "Service role manages all addresses"
  ON public.user_addresses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Harden Orders Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_intent_id') THEN
        ALTER TABLE public.orders ADD COLUMN payment_intent_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_details') THEN
        ALTER TABLE public.orders ADD COLUMN customer_details jsonb;
    END IF;
END $$;

-- 4. Unified Service Role Access
-- Ensure background processes (webhooks) are never blocked
DROP POLICY IF EXISTS "Service Role manages orders" ON public.orders;
CREATE POLICY "Service Role manages orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role manages order items" ON public.order_items;
CREATE POLICY "Service Role manages order items" ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Grants
GRANT ALL ON TABLE public.user_addresses TO service_role;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT ALL ON TABLE public.products TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
