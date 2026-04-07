-- 20260408000000_setup_shipping.sql
-- Setup Shipping Zones, Locations, and Methods

-- 1. Create shipping_zones table
CREATE TABLE IF NOT EXISTS public.shipping_zones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    priority_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create shipping_zone_locations table
CREATE TABLE IF NOT EXISTS public.shipping_zone_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
    country_code text NOT NULL, -- ISO 3166-1 alpha-2
    state_code text,            -- ISO 3166-2
    postal_code text,           -- Exact postal code or wildcard pattern
    created_at timestamptz DEFAULT now()
);

-- 3. Create shipping_zone_methods table
CREATE TABLE IF NOT EXISTS public.shipping_zone_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
    method_type text NOT NULL CHECK (method_type IN ('flat_rate', 'free_shipping')),
    cost_amount integer NOT NULL DEFAULT 0, -- In cents
    cost_currency text NOT NULL DEFAULT 'usd',
    name text NOT NULL, -- e.g. "Standard Shipping"
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. RLS Policies
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zone_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zone_methods ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage shipping_zones" ON public.shipping_zones FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage shipping_zone_locations" ON public.shipping_zone_locations FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage shipping_zone_methods" ON public.shipping_zone_methods FOR ALL TO authenticated USING (public.is_admin());

-- Public (Anonymous/Authenticated) can read for checkout
CREATE POLICY "Public read shipping_zones" ON public.shipping_zones FOR SELECT USING (true);
CREATE POLICY "Public read shipping_zone_locations" ON public.shipping_zone_locations FOR SELECT USING (true);
CREATE POLICY "Public read shipping_zone_methods" ON public.shipping_zone_methods FOR SELECT USING (true);

-- 5. Seed Initial Data (example: North America)
DO $$
DECLARE
    v_zone_id uuid;
BEGIN
    INSERT INTO public.shipping_zones (name, priority_order)
    VALUES ('North America', 10)
    RETURNING id INTO v_zone_id;

    INSERT INTO public.shipping_zone_locations (zone_id, country_code)
    VALUES 
        (v_zone_id, 'US'),
        (v_zone_id, 'CA'),
        (v_zone_id, 'MX');

    INSERT INTO public.shipping_zone_methods (zone_id, method_type, cost_amount, name)
    VALUES 
        (v_zone_id, 'flat_rate', 1500, 'Standard Shipping'),
        (v_zone_id, 'free_shipping', 0, 'Free Shipping (Orders over $100)');
END $$;

-- 6. Grants
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
