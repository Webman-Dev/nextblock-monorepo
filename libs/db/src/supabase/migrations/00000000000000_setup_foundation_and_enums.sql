-- 00000000000000_setup_foundation_and_enums.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000000_setup_schema_privileges.sql
-- Foundation privileges for the public schema.

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 00000000000001_setup_auth_and_content_enums.sql
-- Core enums used by auth and content tables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WRITER', 'USER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_status') THEN
    CREATE TYPE public.page_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END
$$;

-- 00000000000002_setup_navigation_and_revision_enums.sql
-- Supporting enums for navigation and revision history.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_location') THEN
    CREATE TYPE public.menu_location AS ENUM ('HEADER', 'FOOTER', 'SIDEBAR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revision_type') THEN
    CREATE TYPE public.revision_type AS ENUM ('snapshot', 'diff');
  END IF;
END
$$;
