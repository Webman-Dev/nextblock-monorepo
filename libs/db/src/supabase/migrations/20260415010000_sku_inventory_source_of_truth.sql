-- Makes SKU inventory the source of truth while keeping product and variant
-- stock columns synchronized as storefront/cache fields.

CREATE TABLE IF NOT EXISTS public.inventory_items (
  sku text PRIMARY KEY,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inventory_items IS 'Source-of-truth inventory records keyed by sellable SKU.';
COMMENT ON COLUMN public.inventory_items.sku IS 'Global sellable SKU. Matching products or variants share inventory.';
COMMENT ON COLUMN public.inventory_items.quantity IS 'Available quantity for this SKU.';

CREATE INDEX IF NOT EXISTS idx_inventory_items_updated_at
  ON public.inventory_items(updated_at DESC);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view inventory items" ON public.inventory_items;
CREATE POLICY "Public can view inventory items"
  ON public.inventory_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage inventory items" ON public.inventory_items;
CREATE POLICY "Admins can manage inventory items"
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service Role manages inventory items" ON public.inventory_items;
CREATE POLICY "Service Role manages inventory items"
  ON public.inventory_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE public.inventory_items TO anon, authenticated;
GRANT ALL ON TABLE public.inventory_items TO service_role;

CREATE OR REPLACE FUNCTION public.handle_inventory_items_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_inventory_items_update ON public.inventory_items;
CREATE TRIGGER on_inventory_items_update
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_inventory_items_update();

CREATE OR REPLACE FUNCTION public.sync_inventory_cache_for_sku(p_sku text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity integer := 0;
BEGIN
  IF NULLIF(trim(p_sku), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT quantity
    INTO v_quantity
  FROM public.inventory_items
  WHERE sku = p_sku
  LIMIT 1;

  v_quantity := COALESCE(v_quantity, 0);

  UPDATE public.product_variants
  SET
    stock_quantity = v_quantity,
    updated_at = now()
  WHERE sku = p_sku;

  UPDATE public.products AS products
  SET
    stock = v_quantity,
    updated_at = now()
  WHERE products.sku = p_sku
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_variants
      WHERE product_id = products.id
    );

  UPDATE public.products AS products
  SET
    stock = COALESCE((
      SELECT SUM(COALESCE(inventory.quantity, 0))
      FROM public.product_variants AS variants
      LEFT JOIN public.inventory_items AS inventory
        ON inventory.sku = variants.sku
      WHERE variants.product_id = products.id
    ), 0),
    updated_at = now()
  WHERE EXISTS (
    SELECT 1
    FROM public.product_variants AS variants
    WHERE variants.product_id = products.id
      AND variants.sku = p_sku
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_inventory_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku text := COALESCE(NEW.sku, OLD.sku);
BEGIN
  PERFORM public.sync_inventory_cache_for_sku(v_sku);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_inventory_item_change ON public.inventory_items;
CREATE TRIGGER on_inventory_item_change
  AFTER INSERT OR UPDATE OF quantity OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_inventory_item_change();

WITH sellable_skus AS (
  SELECT
    sku,
    MIN(quantity)::integer AS quantity
  FROM (
    SELECT
      products.sku,
      GREATEST(COALESCE(products.stock, 0), 0) AS quantity
    FROM public.products AS products
    WHERE NULLIF(trim(products.sku), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.product_variants
        WHERE product_id = products.id
      )

    UNION ALL

    SELECT
      variants.sku,
      GREATEST(COALESCE(variants.stock_quantity, 0), 0) AS quantity
    FROM public.product_variants AS variants
    WHERE NULLIF(trim(variants.sku), '') IS NOT NULL
  ) AS inventory_sources
  GROUP BY sku
)
INSERT INTO public.inventory_items (sku, quantity)
SELECT sku, quantity
FROM sellable_skus
ON CONFLICT (sku) DO UPDATE
SET
  quantity = EXCLUDED.quantity,
  updated_at = now();

UPDATE public.product_variants AS variants
SET
  stock_quantity = COALESCE(inventory.quantity, 0),
  updated_at = now()
FROM public.inventory_items AS inventory
WHERE inventory.sku = variants.sku;

UPDATE public.products AS products
SET
  stock = COALESCE(inventory.quantity, 0),
  updated_at = now()
FROM public.inventory_items AS inventory
WHERE inventory.sku = products.sku
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants
    WHERE product_id = products.id
  );

UPDATE public.products AS products
SET
  stock = COALESCE((
    SELECT SUM(COALESCE(inventory.quantity, 0))
    FROM public.product_variants AS variants
    LEFT JOIN public.inventory_items AS inventory
      ON inventory.sku = variants.sku
    WHERE variants.product_id = products.id
  ), 0),
  updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.product_variants
  WHERE product_id = products.id
);

CREATE OR REPLACE FUNCTION public.apply_order_inventory_deduction(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track_quantities boolean := public.get_ecommerce_track_quantities();
  v_item record;
  v_inventory_deducted_at timestamptz;
  v_sku text;
  v_current_quantity integer;
BEGIN
  SELECT inventory_deducted_at
    INTO v_inventory_deducted_at
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_inventory_deducted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT v_track_quantities THEN
    UPDATE public.orders
    SET inventory_deducted_at = now()
    WHERE id = p_order_id;

    RETURN;
  END IF;

  FOR v_item IN
    SELECT
      product_id,
      variant_id,
      SUM(quantity)::integer AS quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    GROUP BY product_id, variant_id
  LOOP
    v_sku := NULL;
    v_current_quantity := 0;

    IF v_item.variant_id IS NOT NULL THEN
      SELECT
        sku,
        GREATEST(COALESCE(stock_quantity, 0), 0)
        INTO v_sku,
             v_current_quantity
      FROM public.product_variants
      WHERE id = v_item.variant_id
      LIMIT 1;
    ELSIF v_item.product_id IS NOT NULL THEN
      SELECT
        sku,
        GREATEST(COALESCE(stock, 0), 0)
        INTO v_sku,
             v_current_quantity
      FROM public.products
      WHERE id = v_item.product_id
      LIMIT 1;
    END IF;

    IF NULLIF(trim(v_sku), '') IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.inventory_items (sku, quantity)
    VALUES (v_sku, v_current_quantity)
    ON CONFLICT (sku) DO NOTHING;

    UPDATE public.inventory_items
    SET
      quantity = GREATEST(COALESCE(quantity, 0) - v_item.quantity, 0),
      updated_at = now()
    WHERE sku = v_sku;
  END LOOP;

  UPDATE public.orders
  SET inventory_deducted_at = now()
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_inventory_cache_for_sku(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_inventory_cache_for_sku(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_order_inventory_deduction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_inventory_deduction(uuid) TO service_role;
