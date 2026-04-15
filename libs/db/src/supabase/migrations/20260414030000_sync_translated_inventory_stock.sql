-- Keeps translated product inventory synchronized across languages and
-- normalizes existing stock drift caused by per-language deductions.

WITH simple_product_groups AS (
  SELECT
    translation_group_id,
    MIN(COALESCE(stock, 0))::integer AS shared_stock
  FROM public.products
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.product_variants
    WHERE product_id = public.products.id
  )
  GROUP BY translation_group_id
)
UPDATE public.products AS products
SET
  stock = simple_product_groups.shared_stock,
  updated_at = now()
FROM simple_product_groups
WHERE products.translation_group_id = simple_product_groups.translation_group_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants
    WHERE product_id = products.id
  );

WITH shared_variant_groups AS (
  SELECT
    products.translation_group_id,
    variants.sku,
    MIN(COALESCE(variants.stock_quantity, 0))::integer AS shared_stock
  FROM public.product_variants AS variants
  JOIN public.products ON public.products.id = variants.product_id
  GROUP BY products.translation_group_id, variants.sku
)
UPDATE public.product_variants AS variants
SET
  stock_quantity = shared_variant_groups.shared_stock,
  updated_at = now()
FROM public.products AS products,
     shared_variant_groups
WHERE products.id = variants.product_id
  AND products.translation_group_id = shared_variant_groups.translation_group_id
  AND variants.sku = shared_variant_groups.sku;

UPDATE public.products AS products
SET
  stock = COALESCE((
    SELECT SUM(COALESCE(variants.stock_quantity, 0))
    FROM public.product_variants AS variants
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
  v_translation_group_id uuid;
  v_variant_sku text;
  v_shared_stock integer;
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
    IF v_item.variant_id IS NOT NULL THEN
      SELECT
        products.translation_group_id,
        variants.sku
        INTO v_translation_group_id,
             v_variant_sku
      FROM public.product_variants AS variants
      JOIN public.products ON public.products.id = variants.product_id
      WHERE variants.id = v_item.variant_id
      LIMIT 1;

      IF v_translation_group_id IS NOT NULL AND v_variant_sku IS NOT NULL THEN
        SELECT MIN(COALESCE(variants.stock_quantity, 0))::integer
          INTO v_shared_stock
        FROM public.product_variants AS variants
        JOIN public.products ON public.products.id = variants.product_id
        WHERE public.products.translation_group_id = v_translation_group_id
          AND variants.sku = v_variant_sku;

        UPDATE public.product_variants AS variants
        SET
          stock_quantity = GREATEST(COALESCE(v_shared_stock, 0) - v_item.quantity, 0),
          updated_at = now()
        FROM public.products
        WHERE public.products.id = variants.product_id
          AND public.products.translation_group_id = v_translation_group_id
          AND variants.sku = v_variant_sku;

        UPDATE public.products AS products
        SET
          stock = COALESCE((
            SELECT SUM(COALESCE(stock_quantity, 0))
            FROM public.product_variants
            WHERE product_id = products.id
          ), 0),
          updated_at = now()
        WHERE products.translation_group_id = v_translation_group_id;

        CONTINUE;
      END IF;

      UPDATE public.product_variants
      SET
        stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - v_item.quantity, 0),
        updated_at = now()
      WHERE id = v_item.variant_id;

      UPDATE public.products AS products
      SET
        stock = COALESCE((
          SELECT SUM(COALESCE(stock_quantity, 0))
          FROM public.product_variants
          WHERE product_id = products.id
        ), 0),
        updated_at = now()
      WHERE products.id = (
        SELECT product_id
        FROM public.product_variants
        WHERE id = v_item.variant_id
        LIMIT 1
      );

      CONTINUE;
    END IF;

    IF v_item.product_id IS NOT NULL THEN
      SELECT translation_group_id
        INTO v_translation_group_id
      FROM public.products
      WHERE id = v_item.product_id
      LIMIT 1;

      IF v_translation_group_id IS NOT NULL THEN
        SELECT MIN(COALESCE(stock, 0))::integer
          INTO v_shared_stock
        FROM public.products
        WHERE translation_group_id = v_translation_group_id;

        UPDATE public.products
        SET
          stock = GREATEST(COALESCE(v_shared_stock, 0) - v_item.quantity, 0),
          updated_at = now()
        WHERE translation_group_id = v_translation_group_id;

        CONTINUE;
      END IF;

      UPDATE public.products
      SET
        stock = GREATEST(COALESCE(stock, 0) - v_item.quantity, 0),
        updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET inventory_deducted_at = now()
  WHERE id = p_order_id;
END;
$$;
