-- 00000000000040_add_profiles_fk_to_interactions.sql
-- Alter cms_interactions.user_id to reference public.profiles directly for PostgREST joins.

ALTER TABLE public.cms_interactions
  DROP CONSTRAINT IF EXISTS cms_interactions_user_id_fkey,
  ADD CONSTRAINT cms_interactions_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.cms_interactions.user_id IS 'References public.profiles.id';
