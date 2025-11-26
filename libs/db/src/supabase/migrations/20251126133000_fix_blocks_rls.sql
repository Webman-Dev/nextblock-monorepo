-- Fix blocks update policy
-- Explicitly allow authenticated users with ADMIN or WRITER roles to update blocks
-- Cleans up potential conflicting policies and ensures permissions are granted

BEGIN;

-- 1. Grant permissions to the role (in case they were missing)
GRANT ALL ON TABLE public.blocks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.blocks_id_seq TO authenticated;

-- 2. Drop ALL known previous/conflicting update policies
DROP POLICY IF EXISTS "Allow authenticated users to update blocks" ON public.blocks;
DROP POLICY IF EXISTS "Allow admins and writers to update blocks" ON public.blocks;
DROP POLICY IF EXISTS "blocks_admin_writer_can_update" ON public.blocks;
DROP POLICY IF EXISTS "admins_and_writers_can_manage_blocks" ON public.blocks;

-- 3. Create new policy using the trusted security definer function
-- We use get_my_role() which is SECURITY DEFINER to bypass RLS on profiles table
CREATE POLICY "Allow admins and writers to update blocks"
ON public.blocks
FOR UPDATE
TO authenticated
USING (
  get_my_role() IN ('ADMIN', 'WRITER')
)
WITH CHECK (
  get_my_role() IN ('ADMIN', 'WRITER')
);

-- 4. Also fix INSERT/DELETE just in case, using the same robust method
DROP POLICY IF EXISTS "blocks_admin_writer_can_insert" ON public.blocks;
CREATE POLICY "Allow admins and writers to insert blocks"
ON public.blocks
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() IN ('ADMIN', 'WRITER')
);

DROP POLICY IF EXISTS "blocks_admin_writer_can_delete" ON public.blocks;
CREATE POLICY "Allow admins and writers to delete blocks"
ON public.blocks
FOR DELETE
TO authenticated
USING (
  get_my_role() IN ('ADMIN', 'WRITER')
);

COMMIT;
