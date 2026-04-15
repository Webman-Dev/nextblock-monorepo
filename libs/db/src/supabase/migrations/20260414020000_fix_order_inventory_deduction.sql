-- Fixes paid-order stock reconciliation for environments where the initial
-- inventory deduction function referenced a missing orders.updated_at column.

CREATE OR REPLACE FUNCTION public.apply_order_inventory_deduction(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track_quantities boolean := public.get_ecommerce_track_quantities();
  v_item record;
  v_variant_product_id uuid;
  v_inventory_deducted_at timestamptz;
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
      v_variant_product_id := NULL;

      UPDATE public.product_variants
      SET
        stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - v_item.quantity, 0),
        updated_at = now()
      WHERE id = v_item.variant_id
      RETURNING product_id INTO v_variant_product_id;

      IF v_variant_product_id IS NOT NULL THEN
        UPDATE public.products
        SET
          stock = COALESCE((
            SELECT SUM(COALESCE(stock_quantity, 0))
            FROM public.product_variants
            WHERE product_id = v_variant_product_id
          ), 0),
          updated_at = now()
        WHERE id = v_variant_product_id;
      END IF;
    ELSIF v_item.product_id IS NOT NULL THEN
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
