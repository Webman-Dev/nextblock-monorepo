BEGIN;

-- ============================================================
-- 1. Fix Duplicate Policies on public.blocks
-- ============================================================

-- Drop the "extra" policies that were causing duplicates.
-- These appear to have been introduced in 20250619124100_fix_rls_performance_warnings.sql
-- but conflict with the standard naming convention used in other migrations.

DROP POLICY IF EXISTS "Allow read access to blocks" ON public.blocks;
DROP POLICY IF EXISTS "Allow insert for admins and writers on blocks" ON public.blocks;
DROP POLICY IF EXISTS "Allow update for admins and writers on blocks" ON public.blocks;
DROP POLICY IF EXISTS "Allow delete for admins and writers on blocks" ON public.blocks;

-- Ensure the canonical policies are in place (they should be, but good to be safe).
-- The canonical policies are:
-- SELECT: "blocks_authenticated_comprehensive_select" (from 20251127110000_fix_blocks_visibility_for_missing_profiles.sql)
-- INSERT: "blocks_admin_writer_can_insert" (from 20251126133000_fix_blocks_rls.sql)
-- UPDATE: "blocks_admin_writer_can_update" (from 20251126133000_fix_blocks_rls.sql)
-- DELETE: "blocks_admin_writer_can_delete" (from 20251126133000_fix_blocks_rls.sql)

-- Note: "blocks_anon_can_read_published_blocks" is also a valid policy for anon users.


-- ============================================================
-- 2. Fix Duplicate Policies on public.media
-- ============================================================

-- Drop the specific "admin/writer" read policy, as "media_public_can_read" covers everyone.
DROP POLICY IF EXISTS "media_admin_writer_can_read" ON public.media;

-- Ensure "media_public_can_read" exists (it should, from 20250526183746_fix_media_select_rls_v12.sql)
-- If for some reason it's missing, we can recreate it, but usually dropping the duplicate is enough.

COMMIT;
