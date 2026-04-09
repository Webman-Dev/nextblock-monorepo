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

-- 2. Harden Orders Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_intent_id') THEN
        ALTER TABLE public.orders ADD COLUMN payment_intent_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_details') THEN
        ALTER TABLE public.orders ADD COLUMN customer_details jsonb;
    END IF;
END $$;

-- 3. Unified Service Role Access
-- Ensure background processes (webhooks) are never blocked
DROP POLICY IF EXISTS "Service Role manages orders" ON public.orders;
CREATE POLICY "Service Role manages orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role manages order items" ON public.order_items;
CREATE POLICY "Service Role manages order items" ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Grants
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT ALL ON TABLE public.products TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
