-- 20260408000001_update_shipping_constraints.sql
-- Add minimum order amount and refine RLS

-- 1. Add min_order_amount to shipping_zone_methods
ALTER TABLE public.shipping_zone_methods 
ADD COLUMN IF NOT EXISTS min_order_amount integer NOT NULL DEFAULT 0;

-- 2. Refine RLS Policies
-- Drop existing policies first to ensures a clean state
DROP POLICY IF EXISTS "Admins manage shipping_zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "Admins manage shipping_zone_locations" ON public.shipping_zone_locations;
DROP POLICY IF EXISTS "Admins manage shipping_zone_methods" ON public.shipping_zone_methods;

-- Robust Admin Access: Using service_role bypasses RLS anyway, 
-- but for specific authenticated admins, we explicitly allow all.
CREATE POLICY "Admins manage shipping_zones" ON public.shipping_zones FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage shipping_zone_locations" ON public.shipping_zone_locations FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage shipping_zone_methods" ON public.shipping_zone_methods FOR ALL TO authenticated USING (public.is_admin());

-- Ensure SELECT is truly public for resolution engine
DROP POLICY IF EXISTS "Public read shipping_zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "Public read shipping_zone_locations" ON public.shipping_zone_locations;
DROP POLICY IF EXISTS "Public read shipping_zone_methods" ON public.shipping_zone_methods;

CREATE POLICY "Public read shipping_zones" ON public.shipping_zones FOR SELECT USING (true);
CREATE POLICY "Public read shipping_zone_locations" ON public.shipping_zone_locations FOR SELECT USING (true);
CREATE POLICY "Public read shipping_zone_methods" ON public.shipping_zone_methods FOR SELECT USING (true);

-- 3. Update Existing Data (Optional cleanup)
COMMENT ON COLUMN public.shipping_zone_methods.min_order_amount IS 'Minimum order total (in cents) required for this shipping method to be available.';
