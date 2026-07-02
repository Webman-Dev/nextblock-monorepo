-- 00000000000039_setup_interactions.sql
-- Migration establishing Product Reviews and Post Comments schema.

-- 1. Create Enums
CREATE TYPE public.interaction_type AS ENUM ('review', 'comment');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'denied');

-- 2. Alter Products Table to support aggregations
ALTER TABLE public.products 
  ADD COLUMN average_rating numeric(3,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN total_reviews integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.products.average_rating IS 'Aggregated average 1-5 rating of approved reviews.';
COMMENT ON COLUMN public.products.total_reviews IS 'Total count of approved reviews for this product.';

-- 3. Create Interactions Table
CREATE TABLE public.cms_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.interaction_type NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  content text NOT NULL,
  rating integer,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  post_id bigint REFERENCES public.posts(id) ON DELETE CASCADE,
  reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure polymorphism is respected (either product or post)
  CONSTRAINT check_product_or_post CHECK (
    (product_id IS NOT NULL AND post_id IS NULL)
    OR (post_id IS NOT NULL AND product_id IS NULL)
  ),

  -- Ensure rating matches business rules
  CONSTRAINT check_rating_only_for_review CHECK (
    (type = 'review' AND rating IS NOT NULL AND rating >= 1 AND rating <= 5)
    OR (type = 'comment' AND rating IS NULL)
  )
);

COMMENT ON TABLE public.cms_interactions IS 'Stores user-submitted product reviews and blog post comments.';
COMMENT ON COLUMN public.cms_interactions.rating IS 'Star rating 1-5, only populated for product reviews.';
COMMENT ON COLUMN public.cms_interactions.reactions IS 'JSONB structure tracking counts of reactions (likes, etc.).';

-- 4. Create rating aggregation trigger function
CREATE OR REPLACE FUNCTION public.update_product_ratings()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id uuid;
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  -- Determine which product_id we need to update
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  IF v_product_id IS NOT NULL THEN
    -- Calculate average and count of approved reviews for this product
    SELECT COALESCE(avg(rating), 0.00), count(*)
    INTO v_avg, v_count
    FROM public.cms_interactions
    WHERE product_id = v_product_id
      AND type = 'review'
      AND status = 'approved';

    -- Update products table
    UPDATE public.products
    SET average_rating = ROUND(COALESCE(v_avg, 0.00), 2),
        total_reviews = v_count
    WHERE id = v_product_id;
  END IF;

  -- Handle old product_id if it changed on UPDATE (e.g. transfer of reviews)
  IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT NULL AND OLD.product_id <> NEW.product_id THEN
    SELECT COALESCE(avg(rating), 0.00), count(*)
    INTO v_avg, v_count
    FROM public.cms_interactions
    WHERE product_id = OLD.product_id
      AND type = 'review'
      AND status = 'approved';

    UPDATE public.products
    SET average_rating = ROUND(COALESCE(v_avg, 0.00), 2),
        total_reviews = v_count
    WHERE id = OLD.product_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Attach trigger to interactions table
CREATE TRIGGER trigger_update_product_ratings
AFTER INSERT OR UPDATE OR DELETE
ON public.cms_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_product_ratings();

-- 6. Attach update_at timestamp trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.cms_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 7. Enable RLS and define policies
ALTER TABLE public.cms_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_interactions_read_policy
  ON public.cms_interactions
  FOR SELECT
  TO public
  USING (
    status = 'approved'
    OR ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY cms_interactions_insert_policy
  ON public.cms_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (status = 'pending' OR (SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY cms_interactions_update_policy
  ON public.cms_interactions
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  )
  WITH CHECK (
    ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

CREATE POLICY cms_interactions_delete_policy
  ON public.cms_interactions
  FOR DELETE
  TO authenticated
  USING (
    ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  );

-- 8. Grant Table Permissions
GRANT SELECT ON public.cms_interactions TO anon;
GRANT ALL ON public.cms_interactions TO authenticated;
GRANT ALL ON public.cms_interactions TO service_role;
