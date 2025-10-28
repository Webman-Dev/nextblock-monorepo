--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA supabase_functions;


ALTER SCHEMA supabase_functions OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgjwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;


--
-- Name: EXTENSION pgjwt; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgjwt IS 'JSON Web Token API for Postgresql';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: menu_location; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.menu_location AS ENUM (
    'HEADER',
    'FOOTER',
    'SIDEBAR'
);


ALTER TYPE public.menu_location OWNER TO postgres;

--
-- Name: page_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.page_status AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE public.page_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'WRITER',
    'USER'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: get_current_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION public.get_current_user_role() OWNER TO postgres;

--
-- Name: FUNCTION get_current_user_role(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_current_user_role() IS 'Fetches the role of the currently authenticated user. SECURITY DEFINER to prevent RLS recursion issues when used in policies.';


--
-- Name: get_my_claim(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_claim(claim text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    claims jsonb;
    claim_value text;
BEGIN
    -- Safely get claims, defaulting to NULL if not present or invalid JSON
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION
        WHEN invalid_text_representation THEN
            claims := NULL;
    END;

    -- If claims are NULL, return NULL
    IF claims IS NULL THEN
        RETURN NULL;
    END IF;

    -- Safely extract the claim value as text, removing quotes
    claim_value := claims ->> claim;

    RETURN claim_value;
END;
$$;


ALTER FUNCTION public.get_my_claim(claim text) OWNER TO postgres;

--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;


ALTER FUNCTION public.get_my_role() OWNER TO postgres;

--
-- Name: handle_blocks_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_blocks_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.handle_blocks_update() OWNER TO postgres;

--
-- Name: handle_languages_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_languages_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_languages_update() OWNER TO postgres;

--
-- Name: FUNCTION handle_languages_update(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_languages_update() IS 'Sets updated_at timestamp on language update. Includes explicit search_path and security definer.';


--
-- Name: handle_media_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_media_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.handle_media_update() OWNER TO postgres;

--
-- Name: handle_navigation_items_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_navigation_items_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.handle_navigation_items_update() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name', -- attempts to grab full_name from metadata if provided at signup
    new.raw_user_meta_data->>'avatar_url', -- attempts to grab avatar_url from metadata
    'USER' -- default role
  );
  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_new_user() IS 'creates a public.profile row for a new auth.users entry.';


--
-- Name: handle_pages_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_pages_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.handle_pages_update() OWNER TO postgres;

--
-- Name: handle_posts_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_posts_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.handle_posts_update() OWNER TO postgres;

--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;


ALTER FUNCTION public.set_current_timestamp_updated_at() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
  v_order_by text;
  v_sort_order text;
begin
  case
    when sortcolumn = 'name' then
      v_order_by = 'name';
    when sortcolumn = 'updated_at' then
      v_order_by = 'updated_at';
    when sortcolumn = 'created_at' then
      v_order_by = 'created_at';
    when sortcolumn = 'last_accessed_at' then
      v_order_by = 'last_accessed_at';
    else
      v_order_by = 'name';
  end case;

  case
    when sortorder = 'asc' then
      v_sort_order = 'asc';
    when sortorder = 'desc' then
      v_sort_order = 'desc';
    else
      v_sort_order = 'asc';
  end case;

  v_order_by = v_order_by || ' ' || v_sort_order;

  return query execute
    'with folders as (
       select path_tokens[$1] as folder
       from storage.objects
         where objects.name ilike $2 || $3 || ''%''
           and bucket_id = $4
           and array_length(objects.path_tokens, 1) <> $1
       group by folder
       order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
    DECLARE
      request_id bigint;
      payload jsonb;
      url text := TG_ARGV[0]::text;
      method text := TG_ARGV[1]::text;
      headers jsonb DEFAULT '{}'::jsonb;
      params jsonb DEFAULT '{}'::jsonb;
      timeout_ms integer DEFAULT 1000;
    BEGIN
      IF url IS NULL OR url = 'null' THEN
        RAISE EXCEPTION 'url argument is missing';
      END IF;

      IF method IS NULL OR method = 'null' THEN
        RAISE EXCEPTION 'method argument is missing';
      END IF;

      IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
        headers = '{"Content-Type": "application/json"}'::jsonb;
      ELSE
        headers = TG_ARGV[2]::jsonb;
      END IF;

      IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
        params = '{}'::jsonb;
      ELSE
        params = TG_ARGV[3]::jsonb;
      END IF;

      IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
        timeout_ms = 1000;
      ELSE
        timeout_ms = TG_ARGV[4]::integer;
      END IF;

      CASE
        WHEN method = 'GET' THEN
          SELECT http_get INTO request_id FROM net.http_get(
            url,
            params,
            headers,
            timeout_ms
          );
        WHEN method = 'POST' THEN
          payload = jsonb_build_object(
            'old_record', OLD,
            'record', NEW,
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
          );

          SELECT http_post INTO request_id FROM net.http_post(
            url,
            payload,
            params,
            headers,
            timeout_ms
          );
        ELSE
          RAISE EXCEPTION 'method argument % is invalid', method;
      END CASE;

      INSERT INTO supabase_functions.hooks
        (hook_table_id, hook_name, request_id)
      VALUES
        (TG_RELID, TG_NAME, request_id);

      RETURN NEW;
    END
  $$;


ALTER FUNCTION supabase_functions.http_request() OWNER TO supabase_functions_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocks (
    id bigint NOT NULL,
    page_id bigint,
    post_id bigint,
    language_id bigint NOT NULL,
    block_type text NOT NULL,
    content jsonb,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_exactly_one_parent CHECK ((((page_id IS NOT NULL) AND (post_id IS NULL)) OR ((post_id IS NOT NULL) AND (page_id IS NULL))))
);


ALTER TABLE public.blocks OWNER TO postgres;

--
-- Name: TABLE blocks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.blocks IS 'stores content blocks for pages and posts.';


--
-- Name: COLUMN blocks.block_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blocks.block_type IS 'type of the block, e.g., "text", "image".';


--
-- Name: COLUMN blocks.content; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blocks.content IS 'jsonb content specific to the block_type.';


--
-- Name: COLUMN blocks."order"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blocks."order" IS 'sort order of the block.';


--
-- Name: blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.blocks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: languages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.languages (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.languages OWNER TO postgres;

--
-- Name: TABLE languages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.languages IS 'Stores supported languages for the CMS.';


--
-- Name: COLUMN languages.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.languages.code IS 'BCP 47 language code (e.g., en, en-US, fr, fr-CA).';


--
-- Name: COLUMN languages.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.languages.name IS 'Human-readable name of the language.';


--
-- Name: COLUMN languages.is_default; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.languages.is_default IS 'Indicates if this is the default fallback language.';


--
-- Name: COLUMN languages.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.languages.is_active IS 'Indicates if the language is currently active and available for use.';


--
-- Name: languages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.languages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.languages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: logos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    media_id uuid
);


ALTER TABLE public.logos OWNER TO postgres;

--
-- Name: TABLE logos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.logos IS 'Stores company and brand logos.';


--
-- Name: COLUMN logos.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.logos.name IS 'The name of the brand or company for the logo.';


--
-- Name: COLUMN logos.media_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.logos.media_id IS 'Foreign key to the media table for the logo image.';


--
-- Name: media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploader_id uuid,
    file_name text NOT NULL,
    object_key text NOT NULL,
    file_type text,
    size_bytes bigint,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    width integer,
    height integer,
    blur_data_url text,
    variants jsonb,
    file_path text
);


ALTER TABLE public.media OWNER TO postgres;

--
-- Name: TABLE media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.media IS 'stores information about uploaded media assets.';


--
-- Name: COLUMN media.object_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media.object_key IS 'unique key (path) in cloudflare r2.';


--
-- Name: COLUMN media.width; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media.width IS 'Width of the image in pixels.';


--
-- Name: COLUMN media.height; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media.height IS 'Height of the image in pixels.';


--
-- Name: COLUMN media.blur_data_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media.blur_data_url IS 'Stores the base64 encoded string for image blur placeholders.';


--
-- Name: COLUMN media.variants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media.variants IS 'Stores an array of image variant objects, including different sizes and formats.';


--
-- Name: COLUMN media.file_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.media.file_path IS 'The full path to the file in the storage bucket.';


--
-- Name: navigation_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.navigation_items (
    id bigint NOT NULL,
    language_id bigint NOT NULL,
    menu_key public.menu_location NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    parent_id bigint,
    "order" integer DEFAULT 0 NOT NULL,
    page_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    translation_group_id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.navigation_items OWNER TO postgres;

--
-- Name: TABLE navigation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.navigation_items IS 'stores navigation menu items.';


--
-- Name: COLUMN navigation_items.menu_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navigation_items.menu_key IS 'identifies the menu this item belongs to.';


--
-- Name: COLUMN navigation_items.translation_group_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.navigation_items.translation_group_id IS 'Groups different language versions of the same conceptual navigation item.';


--
-- Name: navigation_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.navigation_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.navigation_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id bigint NOT NULL,
    language_id bigint NOT NULL,
    author_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    status public.page_status DEFAULT 'draft'::public.page_status NOT NULL,
    meta_title text,
    meta_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    translation_group_id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: TABLE pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pages IS 'stores static pages for the website.';


--
-- Name: COLUMN pages.language_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.language_id IS 'the language of this page version.';


--
-- Name: COLUMN pages.author_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.author_id IS 'the user who originally created the page.';


--
-- Name: COLUMN pages.slug; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.slug IS 'url-friendly identifier for the page, unique per language.';


--
-- Name: COLUMN pages.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.status IS 'publication status of the page.';


--
-- Name: COLUMN pages.meta_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.meta_title IS 'seo title for the page.';


--
-- Name: COLUMN pages.meta_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.meta_description IS 'seo description for the page.';


--
-- Name: COLUMN pages.translation_group_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pages.translation_group_id IS 'Groups different language versions of the same conceptual page.';


--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.pages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    language_id bigint NOT NULL,
    author_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    status public.page_status DEFAULT 'draft'::public.page_status NOT NULL,
    published_at timestamp with time zone,
    meta_title text,
    meta_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    translation_group_id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_image_id uuid
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: TABLE posts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.posts IS 'stores blog posts or news articles.';


--
-- Name: COLUMN posts.slug; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.posts.slug IS 'url-friendly identifier, unique per language.';


--
-- Name: COLUMN posts.excerpt; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.posts.excerpt IS 'a short summary of the post.';


--
-- Name: COLUMN posts.published_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.posts.published_at IS 'date and time for publication.';


--
-- Name: COLUMN posts.translation_group_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.posts.translation_group_id IS 'Groups different language versions of the same conceptual post.';


--
-- Name: COLUMN posts.feature_image_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.posts.feature_image_id IS 'ID of the media item to be used as the post''s feature image.';


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.posts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text,
    full_name text,
    avatar_url text,
    website text,
    role public.user_role DEFAULT 'USER'::public.user_role NOT NULL,
    CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.profiles IS 'profile information for each user, extending auth.users.';


--
-- Name: COLUMN profiles.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.id IS 'references auth.users.id';


--
-- Name: COLUMN profiles.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.role IS 'user role for rbac.';


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value jsonb
);


ALTER TABLE public.site_settings OWNER TO postgres;

--
-- Name: translations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.translations (
    key text NOT NULL,
    translations jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.translations OWNER TO postgres;

--
-- Name: COLUMN translations.key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.translations.key IS 'A unique, slugified identifier (e.g., "sign_in_button_text").';


--
-- Name: COLUMN translations.translations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.translations.translations IS 'Stores translations as key-value pairs (e.g., {"en": "Sign In", "fr": "s''inscrire"}).';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


ALTER TABLE supabase_functions.hooks OWNER TO supabase_functions_admin;

--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: supabase_functions_admin
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE supabase_functions.hooks_id_seq OWNER TO supabase_functions_admin;

--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE supabase_functions.migrations OWNER TO supabase_functions_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


ALTER TABLE supabase_migrations.seed_files OWNER TO postgres;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
00000000-0000-0000-0000-000000000000	b79eee60-a1fc-4fca-9607-f7b766a8a935	{"action":"user_confirmation_requested","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}	2025-05-14 12:52:27.878247+00	
00000000-0000-0000-0000-000000000000	82945f87-827f-44c2-b419-7b41a0c54e60	{"action":"user_signedup","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"team"}	2025-05-14 12:52:40.641746+00	
00000000-0000-0000-0000-000000000000	d2927548-4f80-4c6b-9caa-73112330b55d	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"email"}}	2025-05-14 12:52:41.693854+00	
00000000-0000-0000-0000-000000000000	7817b812-fab5-4c8b-bba1-5dd8c6657a23	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-14 12:54:24.051018+00	
00000000-0000-0000-0000-000000000000	2342b721-092d-4447-ac8d-7b671d1b5053	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-14 13:52:37.365734+00	
00000000-0000-0000-0000-000000000000	ea42b67a-1352-49fd-be30-028c2b8c73d9	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-14 13:52:37.369735+00	
00000000-0000-0000-0000-000000000000	fbe4f176-1cc8-4170-afc4-9b36e6723d15	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-14 15:03:06.151093+00	
00000000-0000-0000-0000-000000000000	cd9197d7-53b8-4fbd-bb75-f379a0444ebf	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-14 15:03:06.1548+00	
00000000-0000-0000-0000-000000000000	d5dc8341-376a-4ae9-8cb8-5a91771a01e1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 13:55:17.873437+00	
00000000-0000-0000-0000-000000000000	1f72af00-9556-4649-b4c2-da220d38a438	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 13:55:17.884745+00	
00000000-0000-0000-0000-000000000000	5774ded8-8987-479e-bcfd-1fffec507e6f	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 13:55:30.129268+00	
00000000-0000-0000-0000-000000000000	9bb9bca6-55a1-4b5c-b183-169a262f5c31	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 13:55:40.049838+00	
00000000-0000-0000-0000-000000000000	1b430cf4-898a-44ef-8c2e-2cd328477b51	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:22:32.722751+00	
00000000-0000-0000-0000-000000000000	8bd69752-3d33-4370-afda-0bbadfebb2e5	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 14:33:47.445408+00	
00000000-0000-0000-0000-000000000000	7b908c56-048a-42da-9a42-25b0ed34042d	{"action":"user_confirmation_requested","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}	2025-05-16 14:34:05.768079+00	
00000000-0000-0000-0000-000000000000	de7943cb-a34e-43fd-903e-4abeef505910	{"action":"user_signedup","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"team"}	2025-05-16 14:34:19.438877+00	
00000000-0000-0000-0000-000000000000	676e0a4a-d633-4e71-b8a0-fd74e6e55f84	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"email"}}	2025-05-16 14:34:20.562667+00	
00000000-0000-0000-0000-000000000000	c4dd5c46-d5dd-4119-a0e6-59337f30ecf9	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 14:34:28.343769+00	
00000000-0000-0000-0000-000000000000	eb16ebc1-e4a2-470b-abb3-479e2bf6588f	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:34:38.631465+00	
00000000-0000-0000-0000-000000000000	db8d48e6-0f99-4fed-b479-9d9c6693a6be	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 14:34:44.423999+00	
00000000-0000-0000-0000-000000000000	ca859689-0bde-45cb-aac1-16bf0d75c052	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:34:48.670815+00	
00000000-0000-0000-0000-000000000000	fdf3777c-8f85-4047-acb4-1c70096395cf	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:35:47.804813+00	
00000000-0000-0000-0000-000000000000	e45c8fae-3ebe-4fd4-aa8c-b2c9a6a12250	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:37:09.205376+00	
00000000-0000-0000-0000-000000000000	73e6d180-a6a9-4747-984f-584f76754884	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 14:38:21.808557+00	
00000000-0000-0000-0000-000000000000	b3a8f388-33f4-43ee-a218-417680bfbb5c	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:38:32.988801+00	
00000000-0000-0000-0000-000000000000	f2756f24-c46e-46c4-b9f5-482855eef049	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 14:39:09.623706+00	
00000000-0000-0000-0000-000000000000	a16a80c7-c8bd-47e5-8621-7789318490c3	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 14:39:13.865178+00	
00000000-0000-0000-0000-000000000000	c23cbafc-e210-4fd4-bb51-26e4b4739d89	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 15:38:18.89914+00	
00000000-0000-0000-0000-000000000000	2862cd19-3ab9-4f27-bf67-24d96e1b52c5	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 15:38:18.902007+00	
00000000-0000-0000-0000-000000000000	9a05153c-a4e0-4ea4-bc6a-9e5a4314dbc1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 16:39:42.787702+00	
00000000-0000-0000-0000-000000000000	04525150-986c-46fa-80f1-cdde7701fe57	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 16:39:42.789196+00	
00000000-0000-0000-0000-000000000000	920029fc-a2ee-4eaa-9985-fbce57f68bd3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 17:38:58.553195+00	
00000000-0000-0000-0000-000000000000	7317acd4-78d1-42f2-af79-27fb8348e3e4	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 17:38:58.556171+00	
00000000-0000-0000-0000-000000000000	a52074d0-c8a8-4dec-8ef6-2b37ddbfd769	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 17:54:09.418346+00	
00000000-0000-0000-0000-000000000000	6e7a7bdf-9164-4e06-8c64-37849d97cf5d	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 17:55:43.672542+00	
00000000-0000-0000-0000-000000000000	b3408413-e15b-4d30-bec4-c7f1be8f1b44	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 17:55:50.132991+00	
00000000-0000-0000-0000-000000000000	797da886-e4db-4979-beb2-0b5afd36e647	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-16 17:55:56.46614+00	
00000000-0000-0000-0000-000000000000	590b2d00-559f-47a8-b6a9-5ee0bab35f1c	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 17:55:59.385198+00	
00000000-0000-0000-0000-000000000000	9daee596-fd87-4f44-92a8-e0ca90f3c6da	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-16 18:00:55.688253+00	
00000000-0000-0000-0000-000000000000	47177454-278c-48e2-adce-6344c39fe8e0	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 18:59:06.185012+00	
00000000-0000-0000-0000-000000000000	587926df-fb7e-4545-8442-ae431925ab39	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 18:59:06.185997+00	
00000000-0000-0000-0000-000000000000	888ddf11-448c-4c2e-8a87-6652d9acc45a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 20:02:30.753545+00	
00000000-0000-0000-0000-000000000000	108c84a6-cf4c-40a6-a4b5-cc30620f5b40	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-16 20:02:30.757514+00	
00000000-0000-0000-0000-000000000000	ee4a1bfa-ef80-4c6c-b44e-9a5e28c09d23	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 16:13:13.517799+00	
00000000-0000-0000-0000-000000000000	b077d136-389f-49d4-8f72-c1ba6f8189c7	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 16:13:13.52767+00	
00000000-0000-0000-0000-000000000000	d35eb4ad-4e7c-4423-9f4f-b0910b046d50	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 17:28:32.134227+00	
00000000-0000-0000-0000-000000000000	8a6e8d8a-7636-4468-9331-a4da83f56db3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 17:28:32.137921+00	
00000000-0000-0000-0000-000000000000	190cc3a8-5025-4cc0-ba16-f1a92f808333	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 18:38:21.598079+00	
00000000-0000-0000-0000-000000000000	8b65a6be-7156-4102-8392-ef1c6a6cbcb7	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 18:38:21.605765+00	
00000000-0000-0000-0000-000000000000	29cd6c4a-08d0-4583-abd3-54dfafcc53e8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 19:36:56.033274+00	
00000000-0000-0000-0000-000000000000	522c2e04-7150-4e06-a5a4-f49733f97389	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-20 19:36:56.037168+00	
00000000-0000-0000-0000-000000000000	4ed7912c-5c24-421d-b8e9-aa2a448c150b	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-20 19:43:26.998513+00	
00000000-0000-0000-0000-000000000000	e56e0032-b7b3-47c7-94f0-b3ec9f7954da	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-20 19:43:32.544985+00	
00000000-0000-0000-0000-000000000000	3cff91ed-b210-4f7d-871e-0de1243f0088	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 12:46:45.500801+00	
00000000-0000-0000-0000-000000000000	5631a551-e77f-4bba-8036-863fa209ebe8	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 12:46:45.507913+00	
00000000-0000-0000-0000-000000000000	f786fba4-f57b-4d95-a012-d832880a3808	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 13:49:59.071367+00	
00000000-0000-0000-0000-000000000000	6312893d-df1d-48ae-ab2a-f99e44e37272	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 13:49:59.081678+00	
00000000-0000-0000-0000-000000000000	c0ac4805-87a9-4a10-b6f9-0eba6b45c958	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 14:48:38.843641+00	
00000000-0000-0000-0000-000000000000	7c0b8e2a-f729-499e-ae79-a1635345f592	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 14:48:38.846741+00	
00000000-0000-0000-0000-000000000000	4a59678b-887c-4699-b250-2dccce665b2e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 15:51:33.151687+00	
00000000-0000-0000-0000-000000000000	f427c89e-ab9d-4194-80e8-f27f2b892d34	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 15:51:33.154794+00	
00000000-0000-0000-0000-000000000000	9ad1ee1a-c0e4-4612-a884-659babfa2c46	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 19:37:52.892239+00	
00000000-0000-0000-0000-000000000000	056cd83b-f3c4-4813-b7f2-3eb2cf9ec8dc	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-21 19:37:52.902329+00	
00000000-0000-0000-0000-000000000000	de5f67bf-c519-4f11-8f65-40055221ba78	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 11:59:55.071076+00	
00000000-0000-0000-0000-000000000000	e5b9507e-0eb6-48b9-8d58-6f28c79e022f	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 11:59:55.0828+00	
00000000-0000-0000-0000-000000000000	cbee6e26-2eb6-4227-b030-4f71fcf7e127	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 12:59:07.78923+00	
00000000-0000-0000-0000-000000000000	8cc0082c-8685-4e61-8821-001dcd2a8b89	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 12:59:07.790851+00	
00000000-0000-0000-0000-000000000000	d4c00c8a-c928-4768-a1be-29d44e8429e9	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 14:04:01.311376+00	
00000000-0000-0000-0000-000000000000	c8b8b0f8-659e-4e4e-81ae-9d2bc0a49a99	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 14:04:01.312957+00	
00000000-0000-0000-0000-000000000000	f44114c6-d79c-45c5-a921-a85ec5c8e634	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 15:02:56.697715+00	
00000000-0000-0000-0000-000000000000	96f08115-41a7-440d-8f60-d89a863898e8	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 15:02:56.698813+00	
00000000-0000-0000-0000-000000000000	3dc6618c-8dc8-4065-8c6b-e78c2e6365ee	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 16:39:40.682449+00	
00000000-0000-0000-0000-000000000000	3496007c-76d5-4c59-b6bc-b0a1ea0e7e48	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-22 16:39:40.697804+00	
00000000-0000-0000-0000-000000000000	b3fbe536-aa44-467d-9d09-7bfa37d49ed0	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:19:04.747217+00	
00000000-0000-0000-0000-000000000000	fb9da028-a77b-4c5e-abd1-c7f9a7612b98	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:19:27.36523+00	
00000000-0000-0000-0000-000000000000	223693cf-718e-4bc2-9014-d9fee47d3121	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:19:34.71434+00	
00000000-0000-0000-0000-000000000000	fecc41d9-71a8-4a1e-96de-c62a3cffd112	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:24:17.951932+00	
00000000-0000-0000-0000-000000000000	d2471a98-512e-46e1-a6b4-fdd1830f4572	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:24:22.734571+00	
00000000-0000-0000-0000-000000000000	aa3271be-50c2-4409-b447-5157c5001563	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:24:37.706458+00	
00000000-0000-0000-0000-000000000000	3e399793-c861-4387-bc06-df50f869070a	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:24:40.380293+00	
00000000-0000-0000-0000-000000000000	aa1c67cb-dd4d-4e73-b315-97b777d1a92a	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:29:31.262923+00	
00000000-0000-0000-0000-000000000000	d2855686-2e5a-4164-92e4-bf4bb4c19b59	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:29:38.169841+00	
00000000-0000-0000-0000-000000000000	158b13a4-cbe2-4702-a36c-04528d8cdd52	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:29:54.157028+00	
00000000-0000-0000-0000-000000000000	6b3a3ed6-c29e-450d-9636-422062df29b7	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:30:10.376174+00	
00000000-0000-0000-0000-000000000000	27112d88-c016-43d0-a6fc-c736900ebf4c	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:30:42.708942+00	
00000000-0000-0000-0000-000000000000	f24406a4-7e55-4cfd-8f9f-73a941941ac4	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:30:51.261404+00	
00000000-0000-0000-0000-000000000000	cbb37dc5-3fae-4d9b-ba93-2b434eea2de6	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:33:59.437994+00	
00000000-0000-0000-0000-000000000000	24c8150c-6c57-446b-8d42-8a3a3eea87c1	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:34:05.331318+00	
00000000-0000-0000-0000-000000000000	ab231ff0-7751-4f7a-bd51-781ce88ad79e	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:34:13.426999+00	
00000000-0000-0000-0000-000000000000	9686697d-ee67-44ef-8856-9971115a1314	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:35:04.471261+00	
00000000-0000-0000-0000-000000000000	8fc3f214-8397-4c23-b1a2-d6b98a2181f0	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 15:53:50.144212+00	
00000000-0000-0000-0000-000000000000	cf403829-4005-4c64-850b-c28cb7847f14	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 15:54:59.365211+00	
00000000-0000-0000-0000-000000000000	94e65fa6-6109-404e-bb28-d8f83d9cae29	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:35:51.215083+00	
00000000-0000-0000-0000-000000000000	6a9ad206-55a0-45c9-8629-793b371ce8d6	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:35:56.519657+00	
00000000-0000-0000-0000-000000000000	30c1e585-9346-494b-a20e-ebe01f8bc7ac	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:37:32.62193+00	
00000000-0000-0000-0000-000000000000	df58ef42-2b49-491e-b23b-7078793a62fa	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:37:58.621294+00	
00000000-0000-0000-0000-000000000000	0ece2834-b3c5-446a-8b94-3f73ac2465bb	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:39:45.556381+00	
00000000-0000-0000-0000-000000000000	e3a04cd5-638d-4e41-8bc1-ef806b603944	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:40:17.290135+00	
00000000-0000-0000-0000-000000000000	b5f6ac58-65ab-4441-b5b5-02aa390c8a27	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:40:20.489247+00	
00000000-0000-0000-0000-000000000000	76ecd5c0-7960-4736-864a-b2c7fe32d8b6	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:40:24.213435+00	
00000000-0000-0000-0000-000000000000	a7f03293-03be-4175-8f30-b66d74421111	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:41:21.902194+00	
00000000-0000-0000-0000-000000000000	ec04f2c3-111b-4e6e-bb15-f6113b4e197a	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:43:55.425193+00	
00000000-0000-0000-0000-000000000000	5769e37e-8389-4ee3-a59c-de01750899e9	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:44:26.197703+00	
00000000-0000-0000-0000-000000000000	01e2ad82-d772-46da-8fff-25eb4094acff	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:44:30.43231+00	
00000000-0000-0000-0000-000000000000	9c920791-769b-42e3-81e8-88a68099ef26	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:44:33.858421+00	
00000000-0000-0000-0000-000000000000	71130b68-74ed-4db7-973a-f982d9ac1b76	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:44:37.587761+00	
00000000-0000-0000-0000-000000000000	7ba2057f-4bd2-4d97-a8ce-b252a58cbbb3	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-23 16:44:41.838544+00	
00000000-0000-0000-0000-000000000000	c6dfea0b-1dc3-4005-826e-c7a5338256f7	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-23 16:44:44.278187+00	
00000000-0000-0000-0000-000000000000	aa4eaef1-0bfb-4f43-bcf3-e12c228a0780	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-23 17:49:23.027972+00	
00000000-0000-0000-0000-000000000000	3c9c76bb-f55d-4af5-a7e3-10ac58db8849	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-23 17:49:23.03166+00	
00000000-0000-0000-0000-000000000000	47a47182-d642-4e9f-aa01-ea68b0f33ad1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-23 19:06:47.871021+00	
00000000-0000-0000-0000-000000000000	df665cdc-c824-4bd6-9d3c-ea1db90d6c63	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-23 19:06:47.873438+00	
00000000-0000-0000-0000-000000000000	5a353256-c5f6-49b0-9dd6-634a840cc24e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 12:36:49.341418+00	
00000000-0000-0000-0000-000000000000	36f40e55-461c-4766-af03-f353ace25233	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 12:36:49.351782+00	
00000000-0000-0000-0000-000000000000	5871e183-6da1-4e49-8539-93cb9fa889eb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 13:36:23.83739+00	
00000000-0000-0000-0000-000000000000	d3cf3a09-b60a-4a2b-b499-bcd520eb3671	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 13:36:23.84399+00	
00000000-0000-0000-0000-000000000000	b3b88a68-2893-495e-9e33-c7ad4ab44ea1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:29.615163+00	
00000000-0000-0000-0000-000000000000	05a939dd-6ca0-4a77-b097-4169f9436cb5	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:29.618426+00	
00000000-0000-0000-0000-000000000000	6c4079c2-740e-4bf1-b3a0-4524eb4ca414	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:29.647393+00	
00000000-0000-0000-0000-000000000000	dcf34c44-3527-459e-a440-8daa56a623e6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:31.287074+00	
00000000-0000-0000-0000-000000000000	dd12283d-b391-4be1-b662-06f4e56ae41c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:31.350876+00	
00000000-0000-0000-0000-000000000000	f9e82da4-939e-4804-b6b5-84e415303b8d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:32.147808+00	
00000000-0000-0000-0000-000000000000	cbe025fd-8e76-42f0-9d50-fed74ba9677a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:33.589105+00	
00000000-0000-0000-0000-000000000000	d82d0ddf-4c4d-4124-871f-f8d0841b2eb3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:34.786034+00	
00000000-0000-0000-0000-000000000000	e0bda713-44e4-4d77-9726-9f31f9f2b316	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:36.736337+00	
00000000-0000-0000-0000-000000000000	e3ce9296-c261-40eb-a09b-5211f1219194	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:37.497971+00	
00000000-0000-0000-0000-000000000000	99491aef-9697-4b8b-bc7a-5df0f0a0df1c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:37.546649+00	
00000000-0000-0000-0000-000000000000	d6fce75c-2f91-4ec0-be4e-7779d8ff2f85	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:37.559179+00	
00000000-0000-0000-0000-000000000000	0dc207ba-44d2-49f2-8835-724789e3c8a2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:38.220789+00	
00000000-0000-0000-0000-000000000000	64e42449-c48f-418b-8a7b-62b212a67ffb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:40.314988+00	
00000000-0000-0000-0000-000000000000	5db00063-dc47-4190-80d4-b74f071d5f34	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:41.147426+00	
00000000-0000-0000-0000-000000000000	d9baa482-c266-4f30-abd0-84c2ef3ae88b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 14:47:42.542084+00	
00000000-0000-0000-0000-000000000000	506a9a65-1118-45ef-8244-20957b2b2f2a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:01.657563+00	
00000000-0000-0000-0000-000000000000	96215935-b21a-4e15-93de-82f28db31f7c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:01.669841+00	
00000000-0000-0000-0000-000000000000	c37cf849-1219-4a8e-ade6-9ec100292489	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:01.699592+00	
00000000-0000-0000-0000-000000000000	f8ec4137-7071-4126-89fd-fa6e9758beb4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:01.723467+00	
00000000-0000-0000-0000-000000000000	364319e1-7f02-425e-b17e-2747a0e9f749	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:04.284906+00	
00000000-0000-0000-0000-000000000000	1944cda5-8405-41ec-b10e-062b815b9e8c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:04.307814+00	
00000000-0000-0000-0000-000000000000	26a4ae05-70e0-437c-a9ea-8139014c9b29	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:04.314668+00	
00000000-0000-0000-0000-000000000000	776b1e3c-f856-4f4d-a594-a1ad554c95e5	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:06.618442+00	
00000000-0000-0000-0000-000000000000	43343376-dd48-4f9e-ad60-ec871cbd1a49	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:07.393045+00	
00000000-0000-0000-0000-000000000000	a5a902a0-b61c-407d-ac4d-a79610a996b5	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:08.249199+00	
00000000-0000-0000-0000-000000000000	c0cd97ed-41db-42aa-9816-a0e53ad85e34	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 15:50:09.432532+00	
00000000-0000-0000-0000-000000000000	0e1b509a-d814-4a7f-b701-926445bae16c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 16:48:51.371798+00	
00000000-0000-0000-0000-000000000000	0bddfd61-4083-4d9e-9727-3a50cf961e6b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 16:48:51.377823+00	
00000000-0000-0000-0000-000000000000	4f57e201-96a2-43c6-b5f0-e24ec4b289e4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:10.208731+00	
00000000-0000-0000-0000-000000000000	ebca8b65-eff8-4828-8d84-8df0548b9852	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:10.216965+00	
00000000-0000-0000-0000-000000000000	10caff78-68b1-4a23-b28a-4a83aa00a4f4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:10.244817+00	
00000000-0000-0000-0000-000000000000	ab067090-e683-4492-be9a-ce8482d078c4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:10.261079+00	
00000000-0000-0000-0000-000000000000	c7603e79-5ee5-4645-a6c8-4915d36a84fa	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:12.75982+00	
00000000-0000-0000-0000-000000000000	4e49b067-3359-4741-9a0d-b93e2fd4c0fb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:12.806781+00	
00000000-0000-0000-0000-000000000000	50af1acd-cbc7-43df-9289-60207d197213	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:14.278406+00	
00000000-0000-0000-0000-000000000000	d49923f4-60cc-4acf-8eac-4d95c42458b0	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:14.972447+00	
00000000-0000-0000-0000-000000000000	fde26d9f-abec-468e-814d-5daeedff4b0b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:15.017055+00	
00000000-0000-0000-0000-000000000000	580060f9-22a1-4212-aa2f-0dc184104f57	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:15.03852+00	
00000000-0000-0000-0000-000000000000	d57bf508-4365-482b-99fb-4cd86c25f0a7	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:15.070559+00	
00000000-0000-0000-0000-000000000000	d452e7d1-2477-47e5-b5af-eb5ba9d4b720	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:15.628324+00	
00000000-0000-0000-0000-000000000000	c9adc8aa-9dd4-40ed-937a-ca51d215c335	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:17.424171+00	
00000000-0000-0000-0000-000000000000	e9e8002f-752d-4fa8-b9fc-ba27a7e3530d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:17.453812+00	
00000000-0000-0000-0000-000000000000	26412ab1-03eb-439b-8f2e-78d6b5d05400	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:19.169583+00	
00000000-0000-0000-0000-000000000000	983c281e-9584-491d-b23b-34b3e8d71a26	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:19.825401+00	
00000000-0000-0000-0000-000000000000	dfece369-16c7-4863-b27c-c665aeadbcd3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:20.464579+00	
00000000-0000-0000-0000-000000000000	0bdf7e27-4383-45c8-985c-45c652929cfe	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 17:50:21.757741+00	
00000000-0000-0000-0000-000000000000	68a540a7-460a-4cfa-ac04-83172de0525a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:54.74456+00	
00000000-0000-0000-0000-000000000000	ca9b8a18-827e-4ab0-ade1-166f74e361e6	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:54.750274+00	
00000000-0000-0000-0000-000000000000	abf30211-b65c-4049-adc2-c6537f42bad6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:54.785754+00	
00000000-0000-0000-0000-000000000000	e0f114b0-7884-4cbd-9ff6-a257ff900f9d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:54.815025+00	
00000000-0000-0000-0000-000000000000	605c6c9c-025e-46a0-8378-a68c271fa13b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:55.711063+00	
00000000-0000-0000-0000-000000000000	6120ae11-5a7b-4b1c-af29-c32b5f19deeb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:56.959875+00	
00000000-0000-0000-0000-000000000000	0c191a26-b5df-4ae4-bd82-d53ee53d8a2a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:57.005779+00	
00000000-0000-0000-0000-000000000000	b3017629-8653-47ab-a458-f96449ae38d7	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:59.02492+00	
00000000-0000-0000-0000-000000000000	476c9963-e6c9-474f-a605-67d262fb1132	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:03:59.700131+00	
00000000-0000-0000-0000-000000000000	12d70001-18ce-4fb4-a94b-6e748b0774e6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:04:00.54593+00	
00000000-0000-0000-0000-000000000000	ae564bcd-06d8-45b0-b44d-f70f5896a484	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 19:04:01.97795+00	
00000000-0000-0000-0000-000000000000	99762a83-ca85-4282-8ec9-2bd4abf9ef4b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 20:24:45.560526+00	
00000000-0000-0000-0000-000000000000	dc5f2da8-3132-4c09-93a7-8e89b2b31629	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-26 20:24:45.56908+00	
00000000-0000-0000-0000-000000000000	4d698681-80ef-46fe-9ef8-25a708fbe998	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:06.687258+00	
00000000-0000-0000-0000-000000000000	193f4f23-0cc8-402c-a230-2ef1bbfbfba0	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:06.697064+00	
00000000-0000-0000-0000-000000000000	a3bd6ed5-ad08-4282-8b2f-3357a4ee68fe	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:06.75958+00	
00000000-0000-0000-0000-000000000000	e867e5ad-e9cd-4b8d-aadc-8012d6469f98	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:08.561653+00	
00000000-0000-0000-0000-000000000000	d2ff26a0-e7df-499d-ada1-0356316cdcbd	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:13.890593+00	
00000000-0000-0000-0000-000000000000	7343588c-8b1c-4341-8c44-5201416d707a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:13.913098+00	
00000000-0000-0000-0000-000000000000	39975bb7-c053-4a6f-bdaf-7065ff6e68bd	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:13.946579+00	
00000000-0000-0000-0000-000000000000	0ffd0244-34c3-4d47-a382-b1ffe6099c2d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:14.671316+00	
00000000-0000-0000-0000-000000000000	f841c5aa-ba9f-431d-a21c-e535f0f7b90d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:15.82235+00	
00000000-0000-0000-0000-000000000000	71098724-0b04-44d3-aeec-fceda6715d64	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:15.844738+00	
00000000-0000-0000-0000-000000000000	0d5ef85f-8710-4586-af61-6521915292c5	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:17.915234+00	
00000000-0000-0000-0000-000000000000	d77ba656-bd05-4707-8a64-222e9aca789a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:18.601602+00	
00000000-0000-0000-0000-000000000000	4fedeede-9e12-49a2-a403-7d9eb5ad4995	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:19.307404+00	
00000000-0000-0000-0000-000000000000	2d0e6983-e4df-4947-bbed-cf2715ab065a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:20.123057+00	
00000000-0000-0000-0000-000000000000	f9f91b3e-7a1c-4f0f-a928-bae60ec6ddeb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:20.1394+00	
00000000-0000-0000-0000-000000000000	2a514241-cfd5-4802-973e-bb0a019f7fc2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:20.153837+00	
00000000-0000-0000-0000-000000000000	b9dc92f7-2466-49e2-a383-ee96a5d83ebf	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:20.809411+00	
00000000-0000-0000-0000-000000000000	0d28db02-6596-4141-bbbc-ea22db0a2406	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:22.088992+00	
00000000-0000-0000-0000-000000000000	a6e23735-2649-4639-8379-dcb906204f43	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:22.118245+00	
00000000-0000-0000-0000-000000000000	b4d4127a-4f5f-466a-90cb-e434c75b0dfa	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:24.088112+00	
00000000-0000-0000-0000-000000000000	6602ea39-4427-42bd-8d0d-8c6e8a4ff942	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:24.822464+00	
00000000-0000-0000-0000-000000000000	1a4ea0fd-3bcf-4806-a998-58b99f2bdfc8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:25.586969+00	
00000000-0000-0000-0000-000000000000	eff5b162-9283-4736-a722-b22d3c99eb2d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 12:45:27.009153+00	
00000000-0000-0000-0000-000000000000	9408ed4a-01a7-43fb-912d-2e57f2ee9a20	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:04.040559+00	
00000000-0000-0000-0000-000000000000	5915e7b5-08f4-4d5a-88b6-c1c8b9fffdf2	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:04.0423+00	
00000000-0000-0000-0000-000000000000	bb332946-533f-47f0-ace5-273bb1ebfc05	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:04.073788+00	
00000000-0000-0000-0000-000000000000	c3806912-4938-4d26-a1f2-664de7a37f17	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:04.112065+00	
00000000-0000-0000-0000-000000000000	4a3bd723-918d-472e-b04c-888b6e36961d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:05.858182+00	
00000000-0000-0000-0000-000000000000	17bbdf1f-590b-4cf2-85a8-4b75416f8ae4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:05.882016+00	
00000000-0000-0000-0000-000000000000	fd007859-aea7-4399-a0be-2e7b72729ee4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:09.873598+00	
00000000-0000-0000-0000-000000000000	78caa054-4c5b-4d2f-8daa-9be831600cbf	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:12.405365+00	
00000000-0000-0000-0000-000000000000	a1424ef9-2cc8-4ef9-85fa-566b5fb2959d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:13.554083+00	
00000000-0000-0000-0000-000000000000	88b1bc60-2152-428f-b81c-f551d14ab7d2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:14.58879+00	
00000000-0000-0000-0000-000000000000	9cb43fb5-960b-4cba-9b9a-1ed49d2ae967	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 13:58:16.267316+00	
00000000-0000-0000-0000-000000000000	8217a470-17fc-4776-b41c-983f889d30fb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 15:00:04.988608+00	
00000000-0000-0000-0000-000000000000	f12d77f4-38e7-4990-a6a8-3b358f6f2440	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 15:00:04.990405+00	
00000000-0000-0000-0000-000000000000	ecae9c36-359d-4dbc-be2d-9e3c6512fe3e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:56.508278+00	
00000000-0000-0000-0000-000000000000	ebcc7514-b7a2-40e0-8a1b-87dc5927f7db	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:56.512562+00	
00000000-0000-0000-0000-000000000000	5781248e-9e8f-49d2-b04e-183670909a44	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:56.543431+00	
00000000-0000-0000-0000-000000000000	b8aea78d-eb45-41a2-a2db-254f2d260d58	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:56.564467+00	
00000000-0000-0000-0000-000000000000	b3c9e906-36d5-44fc-a58e-75de65863316	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:58.737551+00	
00000000-0000-0000-0000-000000000000	163598e5-4869-4d40-8921-16e7653cda5d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:58.761605+00	
00000000-0000-0000-0000-000000000000	79ba1672-dcdb-4837-9a22-1069a3293d11	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:31:58.784644+00	
00000000-0000-0000-0000-000000000000	e4fc7e6a-7eb6-47d4-84ae-0a9b3a33c7b2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:32:00.747636+00	
00000000-0000-0000-0000-000000000000	4df21430-5e8a-462b-a59f-6d0215431d28	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:32:01.39912+00	
00000000-0000-0000-0000-000000000000	652e80fc-508c-42ad-81d0-2895dbb755fc	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:32:02.111607+00	
00000000-0000-0000-0000-000000000000	cd7f4514-e1b7-4695-a20c-24ea29095ead	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-27 19:32:03.387945+00	
00000000-0000-0000-0000-000000000000	3f0af259-6f67-4e17-b32c-d968b35dc9dc	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:29:59.638276+00	
00000000-0000-0000-0000-000000000000	b8a52f8e-b02a-47fc-b7eb-b15ef9375749	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:29:59.649597+00	
00000000-0000-0000-0000-000000000000	7a20c5ec-311d-4266-b9b9-8894cde3b1de	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:29:59.698322+00	
00000000-0000-0000-0000-000000000000	a1380f3c-24d2-41ff-8b50-8ce7f399d6f7	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:29:59.718918+00	
00000000-0000-0000-0000-000000000000	30f563b7-361b-43d4-8dfa-07d820f94056	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:02.355758+00	
00000000-0000-0000-0000-000000000000	1967b08c-fcf6-46b1-83fe-d504db21f261	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:02.394284+00	
00000000-0000-0000-0000-000000000000	c9f95d85-7e49-44fe-8aff-a089a9bac944	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:04.042182+00	
00000000-0000-0000-0000-000000000000	0569e714-1f2f-4526-b51d-56cf337cf786	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:04.120607+00	
00000000-0000-0000-0000-000000000000	8fc239a8-b820-4813-93eb-4296e1223785	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:04.993832+00	
00000000-0000-0000-0000-000000000000	cf52e1ed-833e-429d-9359-25279b21fedb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:06.584044+00	
00000000-0000-0000-0000-000000000000	5f1e89a3-e3b1-4658-8efe-ef460a48bb88	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 13:30:08.145084+00	
00000000-0000-0000-0000-000000000000	8e64f3c8-444c-4756-b281-48b5754548a1	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-28 14:05:17.226274+00	
00000000-0000-0000-0000-000000000000	51f2e902-508f-40d9-9479-d4a3e082250a	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-28 14:05:48.123413+00	
00000000-0000-0000-0000-000000000000	02f51973-8248-4eaf-8521-405bc501d2f4	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-28 14:07:09.512225+00	
00000000-0000-0000-0000-000000000000	45c16490-d341-485a-8fca-d5b0fb3a1090	{"action":"user_confirmation_requested","actor_id":"4a3504ea-ee60-4a3a-8155-c3954e28a170","actor_username":"demo@test.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}	2025-05-28 14:07:27.284381+00	
00000000-0000-0000-0000-000000000000	c7005545-8107-4c50-8a76-effeab7d989c	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-28 14:07:37.674978+00	
00000000-0000-0000-0000-000000000000	6892873e-675a-466b-80db-138db04afb1e	{"action":"login","actor_id":"4a3504ea-ee60-4a3a-8155-c3954e28a170","actor_username":"demo@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-28 14:36:14.956752+00	
00000000-0000-0000-0000-000000000000	2f4e6d8a-d164-4273-b976-fae4c246c191	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 15:19:19.484751+00	
00000000-0000-0000-0000-000000000000	7b7179dc-8a89-49c5-ab5f-7a0c72420ff7	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 15:19:19.488545+00	
00000000-0000-0000-0000-000000000000	6da2e0a1-0e9a-401d-ad69-8bcd0d2a935e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:45.033951+00	
00000000-0000-0000-0000-000000000000	c483dd00-f1f0-44f2-a7f2-c7910dc9ceca	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:45.037666+00	
00000000-0000-0000-0000-000000000000	7bb5fa3c-7d1c-4899-bb5b-aa40249adf04	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:45.062935+00	
00000000-0000-0000-0000-000000000000	1adae4e9-b742-416e-a9ac-0f787e86fd76	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:45.072501+00	
00000000-0000-0000-0000-000000000000	91dd6830-7655-4dc9-936f-23042b4e7159	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:47.099259+00	
00000000-0000-0000-0000-000000000000	dea68578-5dbe-4949-8243-07550aa917a8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:47.116954+00	
00000000-0000-0000-0000-000000000000	3a9fd39d-11d4-4f5e-b72c-8589bce571c5	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:47.12806+00	
00000000-0000-0000-0000-000000000000	815a697c-fc94-4877-b4cc-65e944db7a7f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:49.08507+00	
00000000-0000-0000-0000-000000000000	394f19dc-35cb-483f-a3a6-89251ee0c0ef	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:49.759558+00	
00000000-0000-0000-0000-000000000000	1bfc68c4-64a0-47f2-a34b-97647a91b22e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:50.457406+00	
00000000-0000-0000-0000-000000000000	0f7f49f7-aa21-443a-bc46-0513659c6917	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 16:18:51.732888+00	
00000000-0000-0000-0000-000000000000	24863202-34c3-41bb-bd6e-699d76a0183f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 17:17:30.021363+00	
00000000-0000-0000-0000-000000000000	787d2b86-cd6f-44f9-ae42-f1176891a6dd	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 17:17:30.026109+00	
00000000-0000-0000-0000-000000000000	9147ed19-ba07-4dee-b138-cf468fbb137a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 18:25:28.434877+00	
00000000-0000-0000-0000-000000000000	cf7f878f-f404-424b-a94b-3f014b126ce8	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 18:25:28.439526+00	
00000000-0000-0000-0000-000000000000	d17053db-c61d-44b9-b9a6-bde4f1448861	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:32.992566+00	
00000000-0000-0000-0000-000000000000	b63c244f-fa2f-4aa7-821c-80880ced4874	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:32.99617+00	
00000000-0000-0000-0000-000000000000	10e34a14-1724-43af-a056-5cbcbb087f15	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:33.023222+00	
00000000-0000-0000-0000-000000000000	2282a3e4-b5aa-4e1c-8a44-d08103733bb3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:33.054096+00	
00000000-0000-0000-0000-000000000000	b7612d4d-4e87-46ad-9d0a-dc35b22a1571	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:35.985823+00	
00000000-0000-0000-0000-000000000000	b2758975-d222-41f7-8e41-c61c77c3ac2d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:36.036557+00	
00000000-0000-0000-0000-000000000000	8ce86b50-b2fa-4d54-8b48-f9ba594c6971	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:36.047601+00	
00000000-0000-0000-0000-000000000000	3991ca6a-3656-4d6a-afb4-47c499855067	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:40.119587+00	
00000000-0000-0000-0000-000000000000	d005516f-1bd0-4d54-81cc-4621022fb83b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:41.390291+00	
00000000-0000-0000-0000-000000000000	798a8d7e-1513-463f-b88f-1754028319c6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:42.537032+00	
00000000-0000-0000-0000-000000000000	cccc7191-5972-426f-a491-d8fdacd981eb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-28 19:24:44.413408+00	
00000000-0000-0000-0000-000000000000	75ea619c-17b6-4981-a9c5-d97a3ca06bbf	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-05-28 20:00:49.441627+00	
00000000-0000-0000-0000-000000000000	516d369c-0c29-47f4-8960-e9fae05bd7c7	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-28 20:01:02.32146+00	
00000000-0000-0000-0000-000000000000	e4dcc36d-e7c4-48eb-9b14-1a568161f7c8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 12:20:05.31623+00	
00000000-0000-0000-0000-000000000000	40ee4bfc-4ddb-42fc-bdf0-9b24c6c5e9cd	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 12:20:05.3266+00	
00000000-0000-0000-0000-000000000000	f71cbc3e-76de-41b7-bc1a-ed121ad07fd0	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-05-29 12:24:37.908454+00	
00000000-0000-0000-0000-000000000000	62ba7a84-a91e-4c49-b597-19b12715a969	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 13:28:17.840136+00	
00000000-0000-0000-0000-000000000000	20eb5c41-f5ef-4175-8c93-7ae8b3c5005c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 13:28:17.843297+00	
00000000-0000-0000-0000-000000000000	2de3a8a8-3f41-47a0-8fdc-a306956cde7a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 14:27:25.345085+00	
00000000-0000-0000-0000-000000000000	ef768704-3616-4823-8425-268e52635738	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 14:27:25.346791+00	
00000000-0000-0000-0000-000000000000	5f2658f8-117c-4b13-b9fe-57993a456692	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 15:26:35.996881+00	
00000000-0000-0000-0000-000000000000	affecc11-23de-4f14-8159-4f10dfcd17d7	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-05-29 15:26:36.007248+00	
00000000-0000-0000-0000-000000000000	63289a7a-646c-4c0b-83d5-16dd16546cdd	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 11:12:20.397804+00	
00000000-0000-0000-0000-000000000000	4ec75461-cf81-4b16-afc8-65761b6e01d2	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 11:12:20.416356+00	
00000000-0000-0000-0000-000000000000	b3c2fe54-16f3-4419-b9df-dc9674928b72	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:25.861527+00	
00000000-0000-0000-0000-000000000000	c780097c-3365-4464-9b42-3d2ad43c9dad	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:25.867459+00	
00000000-0000-0000-0000-000000000000	e9c239db-3186-4130-ac79-a30541006e4f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:25.901244+00	
00000000-0000-0000-0000-000000000000	8a6a655f-4d9f-404a-8f0d-97f530824340	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:25.923197+00	
00000000-0000-0000-0000-000000000000	f96afeb1-0230-4a7e-b1c2-55f2b82493a3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:28.086648+00	
00000000-0000-0000-0000-000000000000	35e69af2-8765-4802-8d0e-e8b9e213ad7d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:28.130907+00	
00000000-0000-0000-0000-000000000000	70125e5a-12ac-4047-b8a8-6c0c52947b52	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:29.04303+00	
00000000-0000-0000-0000-000000000000	d7aae036-d74e-4d4c-a1d1-3d0fc4b2221b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:29.697032+00	
00000000-0000-0000-0000-000000000000	8570545d-9fca-4e33-b119-dd27c833543c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:31.030708+00	
00000000-0000-0000-0000-000000000000	561670ed-8569-49ff-b6e8-b4003238e1f4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:31.748687+00	
00000000-0000-0000-0000-000000000000	8508865e-52bf-46f0-bae2-e1a6da9127ec	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 12:29:33.211906+00	
00000000-0000-0000-0000-000000000000	43c94943-fd39-4767-80ac-8008ecc11108	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 13:33:22.373647+00	
00000000-0000-0000-0000-000000000000	20faf3d0-1b3d-453b-b0b4-10cd7a15774d	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 13:33:22.3753+00	
00000000-0000-0000-0000-000000000000	4d829acc-550d-4197-bd37-66778b854fd5	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:19.110206+00	
00000000-0000-0000-0000-000000000000	b908a0c7-d7cc-4d5d-969c-b4652f00c9ca	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:19.111762+00	
00000000-0000-0000-0000-000000000000	21a5b540-16dd-43d1-8b75-1fb9b5b7fa7f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:19.167205+00	
00000000-0000-0000-0000-000000000000	dbb538e9-fef5-45dd-b5d2-6b0c0e171ef1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:19.187256+00	
00000000-0000-0000-0000-000000000000	6e9d44e4-f6e0-4603-b9f2-75e1dd017950	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:21.238696+00	
00000000-0000-0000-0000-000000000000	acfbf475-31cd-4fe0-9585-06386e8d201d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:21.264348+00	
00000000-0000-0000-0000-000000000000	df96ad02-64b2-42b6-9627-de1f380116c3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:21.483803+00	
00000000-0000-0000-0000-000000000000	ae60e33c-d7c5-4dfd-ae60-b5fd4d2863a9	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:22.681678+00	
00000000-0000-0000-0000-000000000000	28b07b36-6cfa-4a2e-a3ee-bb062de4e677	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:23.947749+00	
00000000-0000-0000-0000-000000000000	a9834c7f-6205-4087-82e8-bd65378dadc2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:24.655462+00	
00000000-0000-0000-0000-000000000000	34d9da28-63cf-428e-8279-34b8982a8327	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 14:43:27.018314+00	
00000000-0000-0000-0000-000000000000	b35c3fdf-749b-4c4f-8b2a-e457b16e36c4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 16:09:46.453496+00	
00000000-0000-0000-0000-000000000000	4f8ca488-74dc-42aa-a28e-20f89a4d33fd	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 16:09:46.458391+00	
00000000-0000-0000-0000-000000000000	10a3ba3e-1431-4727-8274-130b2f5dc057	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 16:09:46.476951+00	
00000000-0000-0000-0000-000000000000	32b3af33-4654-45c8-b106-a1a141ede966	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 16:09:46.493994+00	
00000000-0000-0000-0000-000000000000	385e8301-411e-4bc3-aa6d-06a9fae74fe2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 16:09:46.514316+00	
00000000-0000-0000-0000-000000000000	dfb229ec-ccb2-49fd-a4ed-8c8284094478	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 16:10:54.213592+00	
00000000-0000-0000-0000-000000000000	edfbef47-1112-4eba-ac10-6eee3277041b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 18:11:28.409753+00	
00000000-0000-0000-0000-000000000000	3e02dcf4-23cc-4a44-9cc7-aa54726cca23	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-02 18:11:28.413926+00	
00000000-0000-0000-0000-000000000000	29d05149-c779-47b5-b1de-2bdb171517d8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 13:14:07.144617+00	
00000000-0000-0000-0000-000000000000	9b880313-dfe6-4d01-bf4e-fa5b6b8d10e5	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 13:14:07.160856+00	
00000000-0000-0000-0000-000000000000	89d442c3-b699-4326-aee9-4fcc6b1476ef	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 13:14:34.836994+00	
00000000-0000-0000-0000-000000000000	237fec27-37a5-4c1a-a88e-14679eb70575	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 14:16:33.708241+00	
00000000-0000-0000-0000-000000000000	9eca8995-3243-48a2-b19a-e7d32a9c3d1a	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 14:16:33.714186+00	
00000000-0000-0000-0000-000000000000	a8fcb125-8e7b-4462-9a53-0f33131d4c9b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 16:49:31.326274+00	
00000000-0000-0000-0000-000000000000	a0c36ef5-d5e4-44ae-bfe2-5bd85312b80e	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-03 16:49:31.330908+00	
00000000-0000-0000-0000-000000000000	49c23857-5041-4292-aaf8-1439d2817ec2	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-04 15:18:12.033586+00	
00000000-0000-0000-0000-000000000000	34549c68-acf2-4a84-9725-895ffa42370c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-04 15:18:12.05215+00	
00000000-0000-0000-0000-000000000000	f16a7e6d-665f-4afd-a47a-c3c8314a57fb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-04 17:38:37.691106+00	
00000000-0000-0000-0000-000000000000	64cdd348-154e-41ca-9008-2abf6016d041	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-04 17:38:37.694832+00	
00000000-0000-0000-0000-000000000000	25c1528c-c846-4406-bde2-b175d4c24539	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-04 17:51:17.249331+00	
00000000-0000-0000-0000-000000000000	5e77693d-285e-44e0-a13e-eb2da99b2241	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-04 17:51:19.815196+00	
00000000-0000-0000-0000-000000000000	6394ff25-a4e1-4b4d-88a0-23b657283d02	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-04 19:22:57.692238+00	
00000000-0000-0000-0000-000000000000	6e76f75d-7036-4e01-aa36-c1b6b1c96085	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-04 19:22:57.694746+00	
00000000-0000-0000-0000-000000000000	db53749e-4278-4955-9a27-e57febbaf51f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 12:18:59.871473+00	
00000000-0000-0000-0000-000000000000	be6cfa86-ff6a-4d80-b066-ea66031b383a	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 12:18:59.882355+00	
00000000-0000-0000-0000-000000000000	37fbd95e-6759-4dd7-963b-6a6a8795e157	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 13:58:46.106919+00	
00000000-0000-0000-0000-000000000000	effc5f9e-7ea9-4127-88ef-c6d2b727b287	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 13:58:46.11645+00	
00000000-0000-0000-0000-000000000000	05dac3b7-2d3b-40ee-8eb8-c83950838f63	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 16:29:16.198449+00	
00000000-0000-0000-0000-000000000000	2470ff0d-dad3-4330-9683-245d434bc032	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 16:29:16.200583+00	
00000000-0000-0000-0000-000000000000	136e35c5-ea43-45d5-b87e-8e7155477142	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 17:28:52.19959+00	
00000000-0000-0000-0000-000000000000	1e92e180-ef4a-4db1-8b4c-e3d25c08d4b4	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 17:28:52.201195+00	
00000000-0000-0000-0000-000000000000	8519f248-701f-4e90-a688-d7720222b751	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 18:50:33.377595+00	
00000000-0000-0000-0000-000000000000	49f4002c-5b5c-4c1a-9b5c-f71259888cad	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 18:50:33.381293+00	
00000000-0000-0000-0000-000000000000	1dff7e50-80e9-4018-9032-7fa561856aaa	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 19:50:15.075485+00	
00000000-0000-0000-0000-000000000000	015fa019-0a82-4021-ae65-f3c1a5ab2ee3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-05 19:50:15.080301+00	
00000000-0000-0000-0000-000000000000	60ee9f57-cce8-43fd-b68b-90eaf5b9eab8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 12:32:20.417903+00	
00000000-0000-0000-0000-000000000000	7af266db-1850-446f-98b1-962bd12892bb	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 12:32:20.428654+00	
00000000-0000-0000-0000-000000000000	77fcb8c4-47d7-4c77-a598-0e755eb39af6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 12:32:20.470082+00	
00000000-0000-0000-0000-000000000000	3005d861-cc2b-4b1e-bf69-d89d0cf795e1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 12:32:20.499702+00	
00000000-0000-0000-0000-000000000000	8bf9d709-2070-46d8-8819-3b9cb1ec1278	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 17:15:14.228866+00	
00000000-0000-0000-0000-000000000000	1cb18203-2192-4134-88cf-95c6754151e6	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 17:15:14.239924+00	
00000000-0000-0000-0000-000000000000	d4b5ae32-e239-4362-befd-69bd9477ed87	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 18:29:38.424116+00	
00000000-0000-0000-0000-000000000000	0cf57e16-a55f-4c05-8f83-ab4454439149	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-06 18:29:38.43265+00	
00000000-0000-0000-0000-000000000000	10cf05c0-afb2-437e-bc68-6a0a1b4892d5	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 12:59:10.495741+00	
00000000-0000-0000-0000-000000000000	dbe14eed-315f-4e0c-80f5-d3cbf253a5ff	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 12:59:10.506634+00	
00000000-0000-0000-0000-000000000000	a048e2b5-d7f3-4acf-be41-df1cbe4c4f06	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 16:56:34.764324+00	
00000000-0000-0000-0000-000000000000	e3f33f7a-a72b-4562-a0d9-b14424fd04ef	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 16:56:34.768831+00	
00000000-0000-0000-0000-000000000000	cd41d688-c8ba-4c89-82ab-a6a469afc65b	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 17:56:16.128793+00	
00000000-0000-0000-0000-000000000000	8aa1359a-1cfe-4251-ace0-b7180f2e410f	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 17:56:16.132946+00	
00000000-0000-0000-0000-000000000000	88d1dc13-0780-4865-9681-e19c53075dab	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 18:59:56.240686+00	
00000000-0000-0000-0000-000000000000	3ca45fb6-5d2d-4d77-96b9-213c47c99ca4	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-09 18:59:56.244209+00	
00000000-0000-0000-0000-000000000000	a5790847-f9fe-4807-9103-734abcba0b67	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-10 15:54:38.215911+00	
00000000-0000-0000-0000-000000000000	0c39e756-83e2-4a45-ad6e-b5032f6de6cb	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-10 15:54:38.232802+00	
00000000-0000-0000-0000-000000000000	d05cf66a-f0d6-4445-8d21-3f0b4069c083	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 16:17:40.29217+00	
00000000-0000-0000-0000-000000000000	40111f4d-bdbf-4230-8d14-af766b9f44ee	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:17:47.264972+00	
00000000-0000-0000-0000-000000000000	8e7ce34f-f44e-411d-be9c-609f6c89528b	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 16:28:10.437198+00	
00000000-0000-0000-0000-000000000000	b335a052-f7b2-4236-ba12-22c39de991ad	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:28:14.789944+00	
00000000-0000-0000-0000-000000000000	9da6788f-2d51-4030-9833-c59b3e7490ce	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:28:26.121971+00	
00000000-0000-0000-0000-000000000000	0163d96c-7b70-4526-b089-05f2fc498112	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 16:32:46.319936+00	
00000000-0000-0000-0000-000000000000	deb652cb-7d30-4798-a44c-238f28895690	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:45:46.353673+00	
00000000-0000-0000-0000-000000000000	299364b3-a278-4e83-b1f5-de55c708e886	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 16:46:51.83243+00	
00000000-0000-0000-0000-000000000000	30267f26-ff45-48d2-b65b-59b382bf7f60	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:55:45.360626+00	
00000000-0000-0000-0000-000000000000	1d90d316-aa2a-4f37-95d3-a451e5c9484d	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:55:56.261551+00	
00000000-0000-0000-0000-000000000000	1cf728c2-9c7d-4989-bbb1-422bf061dd66	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 16:56:25.35214+00	
00000000-0000-0000-0000-000000000000	f41a7633-f80c-4faa-b81e-cc2477b0320d	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:57:11.646689+00	
00000000-0000-0000-0000-000000000000	1e8721e9-c94f-4f78-b34e-6b66c2e79951	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 16:57:24.904445+00	
00000000-0000-0000-0000-000000000000	a826c521-aa4c-4dd3-8734-8e4fcc537cad	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 17:21:26.786127+00	
00000000-0000-0000-0000-000000000000	4a908614-da18-4171-8539-98e8fd08e0da	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:21:29.472017+00	
00000000-0000-0000-0000-000000000000	9a70b831-1c64-42d9-97d0-0b6bf1f6faa5	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 17:22:34.390863+00	
00000000-0000-0000-0000-000000000000	8678c618-d0ef-48ed-94da-d276f4f5182d	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:22:36.902203+00	
00000000-0000-0000-0000-000000000000	f86b4747-4b2d-49ed-8e73-f5c0fa276e7c	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 17:22:43.119955+00	
00000000-0000-0000-0000-000000000000	c0736d2b-5228-4bc1-9b74-984984f5578c	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:22:45.89938+00	
00000000-0000-0000-0000-000000000000	28664a79-0f44-434b-8ce8-e17fb51158f9	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 17:22:50.659475+00	
00000000-0000-0000-0000-000000000000	99e31f39-88ef-4320-be32-e310c1e966e0	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:22:57.445242+00	
00000000-0000-0000-0000-000000000000	45d1a9aa-27ca-4344-a4e5-0a77e4768ea9	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 17:23:05.970486+00	
00000000-0000-0000-0000-000000000000	ebec2f69-0362-4a16-9b3e-a306c6b02f20	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:23:12.594392+00	
00000000-0000-0000-0000-000000000000	421a6f5c-b949-43dc-a005-0f4e068a1ec6	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:26:02.683334+00	
00000000-0000-0000-0000-000000000000	87f9ded9-36aa-4c4f-a27b-712b21da8441	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:28:19.841557+00	
00000000-0000-0000-0000-000000000000	27882f0b-1f37-4e98-ba5b-cd267723b54e	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 17:43:21.980242+00	
00000000-0000-0000-0000-000000000000	3e7635bd-09f7-4e46-af81-269958b268ab	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 17:43:27.408661+00	
00000000-0000-0000-0000-000000000000	56feb953-179f-45fb-b1d5-16db41c399e9	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 18:29:08.488118+00	
00000000-0000-0000-0000-000000000000	7f2895cd-63a9-455b-9b2f-7209db1fd124	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 18:29:14.259907+00	
00000000-0000-0000-0000-000000000000	068188ec-6baf-4fdb-b264-0aa3a5659466	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 18:34:08.599556+00	
00000000-0000-0000-0000-000000000000	97308ccb-60b6-4d18-8140-4dc430afb7bd	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 18:34:13.496622+00	
00000000-0000-0000-0000-000000000000	ce44a204-e864-41c2-87ac-f8c2019adc70	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 19:09:37.161931+00	
00000000-0000-0000-0000-000000000000	8a95f4c1-fe32-4ecd-9920-3778637d7cc6	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 19:40:16.723538+00	
00000000-0000-0000-0000-000000000000	033c89cd-afa4-4e2f-966d-e54536b29f63	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 19:09:39.879053+00	
00000000-0000-0000-0000-000000000000	4e95bb83-5c95-4dbe-8acc-7d9352b826e6	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 19:24:32.616731+00	
00000000-0000-0000-0000-000000000000	645a9fc1-fe1d-45fd-a6a3-85d497babf04	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 19:24:36.839527+00	
00000000-0000-0000-0000-000000000000	c008d6f2-1e2f-40df-8af6-833877e243f7	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-10 19:37:04.16908+00	
00000000-0000-0000-0000-000000000000	58822b22-4a22-4bda-92f7-d9ca85add3f6	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 19:37:06.979063+00	
00000000-0000-0000-0000-000000000000	61cea5b7-4949-41de-9f8a-131f848ffd52	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 19:54:14.353459+00	
00000000-0000-0000-0000-000000000000	5e54af50-df2b-4a27-9a64-e2553071cab9	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 20:20:59.111369+00	
00000000-0000-0000-0000-000000000000	790897f9-0ca0-4482-8073-549ade76347c	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-10 20:23:43.194186+00	
00000000-0000-0000-0000-000000000000	4995c404-e638-4a7d-a7d6-f62ed303a9ae	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-11 12:38:59.144346+00	
00000000-0000-0000-0000-000000000000	5865032b-1ae4-4866-92df-986f9b351a8c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-11 12:38:59.155774+00	
00000000-0000-0000-0000-000000000000	6cbdc860-d913-46e7-b914-95229039c6c2	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 12:46:57.6661+00	
00000000-0000-0000-0000-000000000000	967ae989-48c9-4c2a-8e31-a6b27dd24634	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 12:46:59.930245+00	
00000000-0000-0000-0000-000000000000	a07e7c29-1248-4001-85d0-ef45162b81e5	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 12:59:38.229732+00	
00000000-0000-0000-0000-000000000000	26d5ed38-88bf-4b58-91fb-11b63682d764	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 12:59:55.729229+00	
00000000-0000-0000-0000-000000000000	68d5a81a-908c-4094-ab48-f6fc7b624672	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 12:59:59.39958+00	
00000000-0000-0000-0000-000000000000	686a4bdf-73c6-4bde-a537-0fe3727284ff	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 13:03:10.640341+00	
00000000-0000-0000-0000-000000000000	d1bf66e4-62e5-4ecb-88fb-4a15f3b394c9	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 13:03:14.753835+00	
00000000-0000-0000-0000-000000000000	4b4dbdfc-33c1-4232-b153-5bf254634e5a	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 13:03:34.065104+00	
00000000-0000-0000-0000-000000000000	7655706b-05e0-4345-b1be-fcfa1b6f690e	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 13:18:02.211674+00	
00000000-0000-0000-0000-000000000000	621a13d9-ddcb-4323-a710-47d2232990f6	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 13:18:04.56865+00	
00000000-0000-0000-0000-000000000000	0d211c5d-3657-4bf7-8f2b-ca0ebc54ebd8	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 13:40:32.083187+00	
00000000-0000-0000-0000-000000000000	a2d1c180-76b7-4586-8a58-789771db4648	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 13:40:35.186589+00	
00000000-0000-0000-0000-000000000000	7bebf7ad-b6c7-445b-96a2-8d868469a5f9	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-11 15:18:06.807735+00	
00000000-0000-0000-0000-000000000000	d5c27ab0-61f2-487f-94ba-309dfacc1008	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-11 15:18:06.811441+00	
00000000-0000-0000-0000-000000000000	e72bbe96-3308-4d80-a19a-1efd6f1445d5	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 15:28:27.979897+00	
00000000-0000-0000-0000-000000000000	7b492c79-eeb6-4617-9ded-a22a04faacf4	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 15:28:30.306717+00	
00000000-0000-0000-0000-000000000000	c598e2ba-74a0-4697-9f60-5585294d475c	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:12:01.324924+00	
00000000-0000-0000-0000-000000000000	c9969d0e-7894-470b-9c11-b9f702bb5ca1	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:17:55.437436+00	
00000000-0000-0000-0000-000000000000	9c019719-6ddb-418c-91fa-e72948a2b4e6	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:18:06.131596+00	
00000000-0000-0000-0000-000000000000	c0063d7d-6da7-4e9e-935d-2273a021cbe7	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:20:24.017656+00	
00000000-0000-0000-0000-000000000000	e735f87a-1863-40bc-b137-477265545095	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:20:52.495095+00	
00000000-0000-0000-0000-000000000000	e3663622-d388-49c2-a920-cac0729f2a6f	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:20:57.919755+00	
00000000-0000-0000-0000-000000000000	9f9cafb8-faeb-4e5a-a241-a49482c53d52	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:21:02.632838+00	
00000000-0000-0000-0000-000000000000	4c61e461-8673-4417-9d58-61b3ddc42a28	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:21:14.508681+00	
00000000-0000-0000-0000-000000000000	beac6e1b-280d-47a5-aaf1-e53c81d3bab3	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:21:23.847376+00	
00000000-0000-0000-0000-000000000000	59b0d50c-a6bc-47fa-97c9-837f3d1ab353	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:29:49.205435+00	
00000000-0000-0000-0000-000000000000	ec944e7b-1e2d-497c-8587-45c696906e00	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:30:03.720202+00	
00000000-0000-0000-0000-000000000000	131f537e-9396-45dd-8a5e-132e7995a1f6	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:32:30.616315+00	
00000000-0000-0000-0000-000000000000	16a3aead-cb0a-4ac1-8a92-6d82b466a6fc	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:32:34.123579+00	
00000000-0000-0000-0000-000000000000	248f5d08-0d9f-4359-b924-ddc499c19139	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:41:27.14533+00	
00000000-0000-0000-0000-000000000000	9a4adf61-b339-4228-a00f-96a31e21c123	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:41:48.644678+00	
00000000-0000-0000-0000-000000000000	5e80ba49-a390-4b82-8911-945d563047d6	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 16:42:00.766858+00	
00000000-0000-0000-0000-000000000000	d81623bb-6aa9-484a-8a9d-959686a35d27	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 16:42:03.786301+00	
00000000-0000-0000-0000-000000000000	d6a2475a-32d7-4efd-8dd1-636b2f72f250	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 17:36:49.338104+00	
00000000-0000-0000-0000-000000000000	5b57083a-e8df-412d-9faa-fb1f15360acc	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 17:37:44.32248+00	
00000000-0000-0000-0000-000000000000	71c3a735-6a4b-4250-b2c5-917913232369	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 17:37:46.63574+00	
00000000-0000-0000-0000-000000000000	18163ba6-9c9d-4a55-a1a3-27e85c8b3c70	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-11 19:03:16.622713+00	
00000000-0000-0000-0000-000000000000	a9a03e0d-1986-4987-87c2-458855f15b7e	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-11 19:03:16.62787+00	
00000000-0000-0000-0000-000000000000	072743a6-b1cc-418a-9f02-49de57226aee	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 19:03:29.487089+00	
00000000-0000-0000-0000-000000000000	f83fcbcc-d2aa-462e-82a3-2072287699d2	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 19:08:56.410009+00	
00000000-0000-0000-0000-000000000000	71604326-5856-4440-a88a-fa48dca39d64	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 19:08:58.633074+00	
00000000-0000-0000-0000-000000000000	15b7d4dd-b306-4e15-b230-c3e4933b4cb2	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 19:18:56.663634+00	
00000000-0000-0000-0000-000000000000	e3534731-5960-4f1b-a566-80c520542ade	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 19:46:50.952791+00	
00000000-0000-0000-0000-000000000000	2b16caf2-3727-4345-bed4-44d656d95452	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 19:46:53.807674+00	
00000000-0000-0000-0000-000000000000	ed32ac25-5688-4fcf-bbfb-b2b001d4d7fe	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 20:06:27.794607+00	
00000000-0000-0000-0000-000000000000	88d397ff-937d-4070-acdd-3e55a400eed2	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:06:30.784829+00	
00000000-0000-0000-0000-000000000000	7c5ca376-7bd7-4d9e-9f75-d08ae29b012f	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:20:22.282865+00	
00000000-0000-0000-0000-000000000000	48b7f55c-2e15-4bb0-8884-d89d47eb813c	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 20:21:09.989067+00	
00000000-0000-0000-0000-000000000000	19ac81fc-cb0d-472d-9c11-eff8392352ba	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:21:16.755758+00	
00000000-0000-0000-0000-000000000000	a9920036-84df-4f04-8f42-fb982a4176f7	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:24:18.682899+00	
00000000-0000-0000-0000-000000000000	9fe94b0c-d1e5-4df2-8280-f9b0f23d4a88	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-11 20:24:45.686615+00	
00000000-0000-0000-0000-000000000000	b94b9ee9-5414-4183-9e27-1f419c32f22b	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:24:48.138013+00	
00000000-0000-0000-0000-000000000000	ab891ea4-0550-4c0d-a870-44b07705352d	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:27:26.417075+00	
00000000-0000-0000-0000-000000000000	265da971-f488-4f81-9e24-1414566d1489	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 13:37:55.332937+00	
00000000-0000-0000-0000-000000000000	08bd3ed8-bc6c-42c0-b69c-9bf06c674bc0	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-11 20:29:26.780561+00	
00000000-0000-0000-0000-000000000000	a3f01a21-8de5-49a4-b9c0-d5edef3141c1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 12:07:30.198117+00	
00000000-0000-0000-0000-000000000000	c5b67d32-617b-458e-ab95-6374b14d5326	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 12:07:30.208511+00	
00000000-0000-0000-0000-000000000000	5ed19847-7755-4b18-bf56-b4603545e4ef	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-12 12:15:16.694072+00	
00000000-0000-0000-0000-000000000000	0682d2d9-d2aa-4ae9-ab91-200602c28bcc	{"action":"login","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-12 12:19:25.041386+00	
00000000-0000-0000-0000-000000000000	46c6bb8c-47b1-4df6-92e5-f19a386d475c	{"action":"logout","actor_id":"3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0","actor_username":"desjardinsn@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-12 12:19:29.574371+00	
00000000-0000-0000-0000-000000000000	74281907-3ea7-48b6-b2c3-c76f21ebc6cd	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-12 12:19:33.38072+00	
00000000-0000-0000-0000-000000000000	65cf37b0-2b06-441a-8fa8-8edb1a59c0db	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 13:19:56.463208+00	
00000000-0000-0000-0000-000000000000	5dab73a2-ee83-4565-9db9-a6a1fea1f7a7	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 13:19:56.465448+00	
00000000-0000-0000-0000-000000000000	7cc90c5d-ba19-42b3-be76-b186ab498895	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 15:13:07.755566+00	
00000000-0000-0000-0000-000000000000	945d82ab-33a9-4fa6-b737-133a02773b4b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 15:13:07.761009+00	
00000000-0000-0000-0000-000000000000	a9186bdb-576e-428b-820c-8822f37ddfe6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 15:13:18.230682+00	
00000000-0000-0000-0000-000000000000	72e31a45-9ae9-4f4a-bd25-47e232051167	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 16:11:30.638829+00	
00000000-0000-0000-0000-000000000000	e0060f4f-16fb-4fa8-869c-7044d321d313	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-12 16:11:30.643209+00	
00000000-0000-0000-0000-000000000000	2f28ecab-564a-460b-8e37-f4237ba19b6a	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-13 12:54:06.899656+00	
00000000-0000-0000-0000-000000000000	2cc2fe34-1892-4b81-9b4c-38b721d0e0d4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-13 17:41:19.27705+00	
00000000-0000-0000-0000-000000000000	676bbe0e-37ba-4a07-8a85-7d05912aedaf	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-13 17:41:19.279835+00	
00000000-0000-0000-0000-000000000000	f8c751b5-4d3e-4bd8-bc67-549d27981f14	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-13 19:18:42.380694+00	
00000000-0000-0000-0000-000000000000	fdd7c402-38b4-489d-87ed-3e199a4caa0b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-13 19:18:42.386604+00	
00000000-0000-0000-0000-000000000000	bf9e3a89-d4b0-4f79-a477-f9d83540ab92	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 13:07:00.913334+00	
00000000-0000-0000-0000-000000000000	10b3aca4-3d75-4d0e-98d3-2960d0e5ec67	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 13:07:00.925127+00	
00000000-0000-0000-0000-000000000000	6779672e-e3cd-49b0-88d4-4a77868b606f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 14:08:27.531396+00	
00000000-0000-0000-0000-000000000000	f9904e72-cb79-42ff-bcaf-a08a0e4f6124	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 14:08:27.538356+00	
00000000-0000-0000-0000-000000000000	75d8270f-a2b5-44cb-8334-2414c292fccb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 15:10:31.217+00	
00000000-0000-0000-0000-000000000000	6a324a6e-9680-4983-98f0-dfb3e936c3eb	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 15:10:31.222301+00	
00000000-0000-0000-0000-000000000000	34d50cc3-5e77-4aee-86e6-68e46b9ac6d3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 16:21:42.32899+00	
00000000-0000-0000-0000-000000000000	2e150c0d-11b9-4b60-b31e-b16fc8597fce	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 16:21:42.335522+00	
00000000-0000-0000-0000-000000000000	c488629b-4754-49b1-a796-120659522f3e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 17:20:11.273387+00	
00000000-0000-0000-0000-000000000000	3c4843eb-1a9b-48d6-b687-d8fe2f8b9d16	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 17:20:11.287407+00	
00000000-0000-0000-0000-000000000000	180212b7-10a2-4b0f-9191-d4bc4fa553f1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 18:33:12.819008+00	
00000000-0000-0000-0000-000000000000	1a49c83e-b0ce-4b44-b323-51f13da34f28	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 18:33:12.823189+00	
00000000-0000-0000-0000-000000000000	89ef1658-8efe-4548-baea-0fa8aaa8dded	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-16 19:40:16.716638+00	
00000000-0000-0000-0000-000000000000	249341a9-6cbd-4ee2-9308-a51acbd19ee3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 13:37:55.353319+00	
00000000-0000-0000-0000-000000000000	72f5c552-fb4b-4e13-ac6d-42ce0030e7e6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 14:40:51.613474+00	
00000000-0000-0000-0000-000000000000	2c771ff7-e507-486f-8166-6ff9b90aed70	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 14:40:51.616295+00	
00000000-0000-0000-0000-000000000000	e01b08c9-b41f-4203-b9f5-8d295b16a43e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 14:40:55.20039+00	
00000000-0000-0000-0000-000000000000	1baa4394-b4dc-4465-8626-0b62495800e7	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 15:41:44.30356+00	
00000000-0000-0000-0000-000000000000	63f7c52f-47e9-4796-9eb6-5d7b225b137b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 15:41:44.30531+00	
00000000-0000-0000-0000-000000000000	cc598a8a-0ca0-4082-81eb-404a7f10d459	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 16:54:09.477825+00	
00000000-0000-0000-0000-000000000000	ed50cc4a-9b27-4a40-a1b0-edb36a81b2e3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 16:54:09.479414+00	
00000000-0000-0000-0000-000000000000	adf1617d-6613-4979-9b44-4550cf78e9a8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 17:54:20.200036+00	
00000000-0000-0000-0000-000000000000	2ca3c48a-d648-468e-82e4-a8954590b8e3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 17:54:20.205093+00	
00000000-0000-0000-0000-000000000000	812c5bf2-484e-4d08-945f-f12d13d170e3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 18:52:48.4111+00	
00000000-0000-0000-0000-000000000000	c086b844-7f2f-4a32-aa5b-63b8d6fc401d	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 18:52:48.415945+00	
00000000-0000-0000-0000-000000000000	3253ab26-8066-43a4-b4a1-5ea130c3c9e3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 19:51:18.954124+00	
00000000-0000-0000-0000-000000000000	0a54c0d3-2e8c-4140-9a77-8155f340167d	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-17 19:51:18.957541+00	
00000000-0000-0000-0000-000000000000	2a077ad5-01b0-467e-86de-11d8ff118f99	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 12:20:26.649674+00	
00000000-0000-0000-0000-000000000000	c8308a68-8319-4193-b69b-12df55ce86f5	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 12:20:26.661215+00	
00000000-0000-0000-0000-000000000000	796c7bd9-98b2-4781-ab09-4d0fc4fe4e7e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 13:19:27.544776+00	
00000000-0000-0000-0000-000000000000	22e1b24a-c2cc-41f7-8dd2-8c07a710445b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 13:19:27.546728+00	
00000000-0000-0000-0000-000000000000	4439f0f0-8c0a-4c53-8f5a-803d8a73b274	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 14:51:02.696755+00	
00000000-0000-0000-0000-000000000000	16a0a1f9-e7fd-4333-adf4-08e2ff202c8a	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 14:51:02.699222+00	
00000000-0000-0000-0000-000000000000	a82552d8-e5f2-4764-9851-341a5b068a69	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 14:51:10.307772+00	
00000000-0000-0000-0000-000000000000	97acca71-0ded-46d9-89db-12ca80fd1a23	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 14:51:10.873569+00	
00000000-0000-0000-0000-000000000000	74588756-db7e-4d54-ac45-5629fabda225	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 15:53:40.949919+00	
00000000-0000-0000-0000-000000000000	825211a2-8d2c-4799-9060-73ceb96b1df0	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 15:53:40.952474+00	
00000000-0000-0000-0000-000000000000	1ce35e63-3045-4eb2-86f2-33410c4100aa	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 16:53:50.930256+00	
00000000-0000-0000-0000-000000000000	2b34bfae-4cde-4b61-a66e-2eab5e79d83b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 16:53:50.933427+00	
00000000-0000-0000-0000-000000000000	45475c11-69ff-4063-bb30-fc87428605dd	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 17:54:17.043743+00	
00000000-0000-0000-0000-000000000000	ceffc249-585d-4903-af9b-74348923ec1d	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 17:54:17.046305+00	
00000000-0000-0000-0000-000000000000	4ee4c097-f8aa-41bd-94e5-9c793bbb3eec	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 18:52:40.155837+00	
00000000-0000-0000-0000-000000000000	e4b95fa4-8cce-4dfe-9db8-2d3e90f7c69a	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-18 18:52:40.164769+00	
00000000-0000-0000-0000-000000000000	3d83dfcb-32b2-4aee-bf68-8e867291ecbf	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-19 12:36:21.147954+00	
00000000-0000-0000-0000-000000000000	5ccbc32c-cb7a-4123-887f-936ddd034954	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 13:58:37.818496+00	
00000000-0000-0000-0000-000000000000	8c8079bd-8f0f-4d56-b557-1df6ce985b8b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 13:58:37.823634+00	
00000000-0000-0000-0000-000000000000	db9600c4-a17f-4ef5-9b19-39d141d8e6e7	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 14:57:17.393329+00	
00000000-0000-0000-0000-000000000000	fe1fd715-8c38-4270-985d-5b485607d208	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 14:57:17.398087+00	
00000000-0000-0000-0000-000000000000	17b3beb0-6482-4d43-bd68-5364f412b538	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 16:41:25.770166+00	
00000000-0000-0000-0000-000000000000	0ab2ca30-c30c-4a09-ab8f-5f72bdd074d0	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 16:41:25.776634+00	
00000000-0000-0000-0000-000000000000	cc09cc4b-964d-4f31-89b2-50c0ad8961cf	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 16:41:25.819439+00	
00000000-0000-0000-0000-000000000000	be87dd7b-7f5d-4707-a209-86d9e3b6f817	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 18:58:20.356018+00	
00000000-0000-0000-0000-000000000000	406827ee-3a3a-4d21-b97d-b8fe7cd5888b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 18:58:20.362915+00	
00000000-0000-0000-0000-000000000000	a01ae70a-05f3-4d13-b990-8f16b851a600	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 18:58:20.402154+00	
00000000-0000-0000-0000-000000000000	2f17d81b-7919-4fd3-a9a8-140fea4b20e8	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 18:58:20.439386+00	
00000000-0000-0000-0000-000000000000	c8e19ef9-4355-400b-9cf1-5f56581e622a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 19:58:27.275957+00	
00000000-0000-0000-0000-000000000000	1bae309b-e680-4868-bb40-f178736f4687	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-19 19:58:27.279684+00	
00000000-0000-0000-0000-000000000000	8835dae8-4f57-43ad-ba55-a852282edb06	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-19 20:16:44.353595+00	
00000000-0000-0000-0000-000000000000	4eb5869a-9a55-45ef-9364-28ac83fe7008	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-20 12:39:12.026031+00	
00000000-0000-0000-0000-000000000000	10315fa9-c756-4af5-8efe-a2f9797b1ab3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-20 12:39:12.036894+00	
00000000-0000-0000-0000-000000000000	55d65588-2228-4cac-ba38-b8c817f76caf	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-20 13:51:45.993358+00	
00000000-0000-0000-0000-000000000000	a1f09e12-40cb-4f6b-af90-870ef1978d83	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-06-20 13:51:46.000942+00	
00000000-0000-0000-0000-000000000000	b958361c-c36c-4f14-a6d2-33bd600cdcf8	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-20 16:51:42.212823+00	
00000000-0000-0000-0000-000000000000	af06b484-5287-47b1-8bf3-7cc708ed9941	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-06-20 16:51:47.751577+00	
00000000-0000-0000-0000-000000000000	51856cd5-3003-4e74-9c20-c490c60d5a52	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-06-20 16:58:30.967046+00	
00000000-0000-0000-0000-000000000000	756a3a14-2188-4e6b-aff5-82f7a6469e0e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-02 19:59:41.205821+00	
00000000-0000-0000-0000-000000000000	2f8858c9-c601-4f8b-a6dc-a396ac078598	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-02 19:59:41.209982+00	
00000000-0000-0000-0000-000000000000	59a29cc1-4dd8-4207-abe8-bb72bb5f49f6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 12:52:58.904588+00	
00000000-0000-0000-0000-000000000000	175efce2-2f00-4545-a952-1b6b30faa765	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 12:52:58.911052+00	
00000000-0000-0000-0000-000000000000	524439f7-e7e1-4952-835b-067dd53c38bc	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 13:52:05.419326+00	
00000000-0000-0000-0000-000000000000	15fbf036-b72d-408f-9dcb-60b093a0af22	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 13:52:05.427915+00	
00000000-0000-0000-0000-000000000000	e84a7a20-6451-4eb4-b552-d7dd37a83bfa	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 14:50:38.363208+00	
00000000-0000-0000-0000-000000000000	f321a431-3fa9-4a37-a3dd-8e63a21afd7e	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 14:50:38.365998+00	
00000000-0000-0000-0000-000000000000	d84f29a7-1e78-47ef-a5af-cf19c84e8835	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 16:15:04.16796+00	
00000000-0000-0000-0000-000000000000	c8812c45-df30-4ce2-a3d2-e6ca02a3c654	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 16:15:04.171074+00	
00000000-0000-0000-0000-000000000000	2b9adad5-2e6a-4c53-84bf-0bd973f1b235	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 17:13:53.465456+00	
00000000-0000-0000-0000-000000000000	2236c188-f85a-45e2-adc5-855b8b885b68	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 17:13:53.467779+00	
00000000-0000-0000-0000-000000000000	9784eec4-42be-4360-bd64-079aec1c2bb1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 18:25:43.606639+00	
00000000-0000-0000-0000-000000000000	ca3d4a00-5454-4a4b-8389-6d1d12d9714b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 18:25:43.609015+00	
00000000-0000-0000-0000-000000000000	b7704717-a209-4f6a-97d8-edc642216944	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-03 18:25:45.1823+00	
00000000-0000-0000-0000-000000000000	b0e53449-2af6-42da-bbc4-ecabbf235363	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 13:54:33.79757+00	
00000000-0000-0000-0000-000000000000	cea74949-95c1-4bab-ae42-86795f6c9d2c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 13:54:33.804097+00	
00000000-0000-0000-0000-000000000000	bea5ec06-5ee3-4065-a497-e119f27a8ab0	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 14:56:03.833453+00	
00000000-0000-0000-0000-000000000000	558585e8-4feb-4322-b17e-4fb99b876e7d	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 14:56:03.834955+00	
00000000-0000-0000-0000-000000000000	bfb5d537-36e2-49c5-aa45-31b2dc876037	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 17:45:16.717407+00	
00000000-0000-0000-0000-000000000000	5eba9ea6-8ff3-4c18-bccc-bbf06e6fac03	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 17:45:16.718388+00	
00000000-0000-0000-0000-000000000000	23ced92a-5e98-49df-930a-9b89f321d0cb	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 18:44:28.187693+00	
00000000-0000-0000-0000-000000000000	7eb20142-6033-4553-aa4c-ecd7aec391fe	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-04 18:44:28.189409+00	
00000000-0000-0000-0000-000000000000	5d021b68-6a8e-4a1e-bff0-c60342c50e12	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 12:26:18.483468+00	
00000000-0000-0000-0000-000000000000	6cffadda-89af-4ea5-b292-d9a30fb45fd6	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 12:26:18.491418+00	
00000000-0000-0000-0000-000000000000	346529ba-5d80-4801-ba98-60f4caae6729	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 13:26:30.105722+00	
00000000-0000-0000-0000-000000000000	6aae99d4-7b09-4196-87db-9118186b9001	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 13:26:30.108006+00	
00000000-0000-0000-0000-000000000000	7059dfa5-2241-466d-bb78-6fa7d18d73a0	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 13:26:41.208893+00	
00000000-0000-0000-0000-000000000000	78b529fd-46b6-48b1-b351-37d2fc01afe4	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 14:25:43.550041+00	
00000000-0000-0000-0000-000000000000	61f0deb6-2c11-49ab-bd6f-e1b199dc6036	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 14:25:43.553428+00	
00000000-0000-0000-0000-000000000000	3e0f904f-3100-4c29-b4fc-a9edadec0110	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 15:24:29.350758+00	
00000000-0000-0000-0000-000000000000	0c17c41f-33e6-4f41-aad8-ffa0d0a80c02	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 15:24:29.354646+00	
00000000-0000-0000-0000-000000000000	6fa65241-4c74-4b2d-8204-04dc4678b966	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 16:23:25.647574+00	
00000000-0000-0000-0000-000000000000	8038f714-9959-44fc-b8b7-a024ee7bafb7	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 16:23:25.650253+00	
00000000-0000-0000-0000-000000000000	415bfea4-8383-4e27-8c94-4c758708cc6f	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 17:36:36.336845+00	
00000000-0000-0000-0000-000000000000	9b02fbf1-5a62-47c9-9e32-a1d3a5b95e2a	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 17:36:36.341452+00	
00000000-0000-0000-0000-000000000000	4d147a97-b548-4a98-b80c-411f846479a3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 18:47:25.823949+00	
00000000-0000-0000-0000-000000000000	799c8168-7c8a-4329-bada-f5183b89a2cb	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 18:47:25.827936+00	
00000000-0000-0000-0000-000000000000	9437159e-2b8c-4cbb-a129-d28bba54141a	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 18:47:28.039758+00	
00000000-0000-0000-0000-000000000000	8ebd9d25-dfcc-4fae-9826-6fb3ca5a5278	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 19:46:08.448834+00	
00000000-0000-0000-0000-000000000000	a089d3a4-726a-43ee-be9c-c65aed288dcb	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-07 19:46:08.453596+00	
00000000-0000-0000-0000-000000000000	ccff9ed6-dbee-4997-a71d-23ca92c2c180	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 12:21:14.486849+00	
00000000-0000-0000-0000-000000000000	d4269b20-60e6-4191-8eae-7d7875e134f0	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 12:21:14.494291+00	
00000000-0000-0000-0000-000000000000	46caeca9-3674-4885-82d7-4a3b03095ede	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 13:23:31.385075+00	
00000000-0000-0000-0000-000000000000	cf3bdb47-ff4f-480e-a5e7-c60ae879e761	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 13:23:31.390355+00	
00000000-0000-0000-0000-000000000000	d24b084b-63df-4655-8bcf-792326a6ec11	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 14:56:06.456043+00	
00000000-0000-0000-0000-000000000000	efd1ab08-f7ab-45ca-94bd-adefbd08da99	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 14:56:06.461256+00	
00000000-0000-0000-0000-000000000000	69a7225f-a379-4e40-87c8-763464c9f98c	{"action":"logout","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-07-08 15:15:46.420195+00	
00000000-0000-0000-0000-000000000000	af0e15bb-7025-4cd7-9267-edd27b3355c5	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-07-08 15:16:17.60122+00	
00000000-0000-0000-0000-000000000000	fd250daf-ef13-4cef-b479-a1b99d64e4b3	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 16:31:02.181995+00	
00000000-0000-0000-0000-000000000000	e101705b-1b00-4d11-9eae-72b1bb10569e	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 16:31:02.184266+00	
00000000-0000-0000-0000-000000000000	f97370a8-2927-4704-a7b3-54d517846bd6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 17:33:32.035547+00	
00000000-0000-0000-0000-000000000000	717d1edd-d1ed-4f4f-8c37-f32ddda0572f	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 17:33:32.037513+00	
00000000-0000-0000-0000-000000000000	9aa6d8e8-9638-4f4c-bd46-d751d173706c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 18:36:44.357745+00	
00000000-0000-0000-0000-000000000000	5363cdec-ffce-4ce4-aa66-dfa53243ccbc	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 18:36:44.362301+00	
00000000-0000-0000-0000-000000000000	6af32686-d9ca-4f83-9d9f-a27ee6c48c46	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 19:42:49.133679+00	
00000000-0000-0000-0000-000000000000	6fec9ca3-e88b-4d03-ab22-1a797386936c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-08 19:42:49.13749+00	
00000000-0000-0000-0000-000000000000	996b78f2-802a-49cd-af47-43c741d9eca6	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 12:19:32.906453+00	
00000000-0000-0000-0000-000000000000	cbbd35dc-5838-4900-a0d8-66e215051c6c	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 12:19:32.919596+00	
00000000-0000-0000-0000-000000000000	394a1997-9cfe-406b-bdcf-1a7be89fe173	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 13:39:11.306829+00	
00000000-0000-0000-0000-000000000000	c3b10fc0-aa4c-4e79-bfe3-40fbbeb53c9f	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 13:39:11.310835+00	
00000000-0000-0000-0000-000000000000	81c1d368-44db-4526-9e87-5f1b26e2fcf1	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 14:44:09.902728+00	
00000000-0000-0000-0000-000000000000	ae27e33e-96da-4ec6-b9e6-d7a262e69bc6	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 14:44:09.905509+00	
00000000-0000-0000-0000-000000000000	ebb30da2-2a2c-4f59-9c74-89c5b93f5863	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 15:44:37.444432+00	
00000000-0000-0000-0000-000000000000	4afdf47d-213d-44bb-a2d6-256945ce468b	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 15:44:37.448285+00	
00000000-0000-0000-0000-000000000000	0c4c89f5-2222-49eb-ad87-2a6327d28306	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 18:03:40.353447+00	
00000000-0000-0000-0000-000000000000	9f194a4c-f83d-4166-a8f6-e0800f6dea74	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 18:03:40.355926+00	
00000000-0000-0000-0000-000000000000	6cd243c3-3c83-4c43-b321-d3a004d3c8f0	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 19:15:18.519498+00	
00000000-0000-0000-0000-000000000000	3ab93eab-175e-49af-a7da-ff2d7d12da34	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 19:15:18.523889+00	
00000000-0000-0000-0000-000000000000	23a74f5f-c835-4dcb-af2d-573197b185f9	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 20:18:53.194637+00	
00000000-0000-0000-0000-000000000000	f65e9730-eb63-41d4-b8f1-1b08be1bfcee	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-09 20:18:53.19939+00	
00000000-0000-0000-0000-000000000000	3b042d31-7c8f-4870-b43d-f2f244dfc30e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 14:10:27.944022+00	
00000000-0000-0000-0000-000000000000	1a383f09-cf8d-424b-84da-6281b6c05314	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 14:10:27.954168+00	
00000000-0000-0000-0000-000000000000	4c8c52ce-d82e-4d38-b0e9-b17237c5c6bc	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 15:16:42.695877+00	
00000000-0000-0000-0000-000000000000	af42ec00-566f-4ccb-8943-c4c9c085c0a1	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 15:16:42.70006+00	
00000000-0000-0000-0000-000000000000	40c758ac-6d6d-492a-9af0-d90b2e61f98d	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-15 18:56:40.294204+00	
00000000-0000-0000-0000-000000000000	a6d7df43-72dc-4613-a298-eff6ab3913a8	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-15 18:56:40.307089+00	
00000000-0000-0000-0000-000000000000	7f1107cb-d8a5-4375-a81a-64596c0bbc11	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 16:41:00.605372+00	
00000000-0000-0000-0000-000000000000	c2c92082-6684-48cc-a581-03474557aabe	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 16:41:00.617451+00	
00000000-0000-0000-0000-000000000000	f86a7ac7-00fd-4424-b4db-01d5ef31c94e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 18:46:21.656781+00	
00000000-0000-0000-0000-000000000000	867b4e4e-92f8-451e-90a5-7a74445e83e3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 18:46:21.660965+00	
00000000-0000-0000-0000-000000000000	de450b32-9b1d-4947-bb48-1f369c11bf8c	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 20:23:38.240289+00	
00000000-0000-0000-0000-000000000000	a43a7bfd-baa9-48f4-9973-32d3421ae23f	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 20:23:38.243087+00	
00000000-0000-0000-0000-000000000000	582e18a6-8c5f-45be-adfd-76eac5fc9a3e	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-16 20:23:38.265499+00	
00000000-0000-0000-0000-000000000000	ff101f0a-f177-460a-bc54-776b322be926	{"action":"token_refreshed","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-17 16:28:12.655389+00	
00000000-0000-0000-0000-000000000000	0c98f072-103c-43d1-83f4-8e8490e4b3f3	{"action":"token_revoked","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-17 16:28:12.6616+00	
00000000-0000-0000-0000-000000000000	e5465afe-5398-4806-a763-71a2c7d0fb87	{"action":"user_recovery_requested","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"user"}	2025-07-17 16:42:16.153419+00	
00000000-0000-0000-0000-000000000000	25205565-ab82-4c2b-a738-343cb1a6ec98	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-07-17 16:42:33.329819+00	
00000000-0000-0000-0000-000000000000	40d27b24-0ef8-4e9c-907e-7fa15334cbad	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"recovery"}}	2025-07-17 16:42:34.434168+00	
00000000-0000-0000-0000-000000000000	26dcb140-f0e2-48bb-87ce-9487dc3bb16c	{"action":"user_recovery_requested","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"user"}	2025-07-17 16:44:07.924375+00	
00000000-0000-0000-0000-000000000000	b2400889-fe64-487c-bc00-c2df0c701c3d	{"action":"login","actor_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account"}	2025-07-17 16:44:17.001385+00	
00000000-0000-0000-0000-000000000000	75c4f7e7-f2b6-4dd6-b620-ba02a57fa3ea	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"hosts@newrootsherbal.com","user_id":"bff3a82c-8c54-4566-ae5b-ff052e5d6367","user_phone":""}}	2025-07-17 16:55:21.642997+00	
00000000-0000-0000-0000-000000000000	4b825516-ba46-411e-a609-402bc0e5111b	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"hosts@newrootsherbal.com","user_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","user_phone":""}}	2025-07-17 16:56:41.819847+00	
00000000-0000-0000-0000-000000000000	237722c4-2266-435b-9c02-c7a98d6785f1	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-07-17 16:58:09.230704+00	
00000000-0000-0000-0000-000000000000	4c6728fd-9c06-4704-8012-7e5c30b8e533	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-17 19:22:49.158346+00	
00000000-0000-0000-0000-000000000000	93e29877-0e00-425f-b530-389c1299598d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-17 19:22:49.16346+00	
00000000-0000-0000-0000-000000000000	e634e3c7-48cf-41cb-8703-aa558ccdcd88	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-17 20:21:07.952088+00	
00000000-0000-0000-0000-000000000000	74a26d61-9bba-4917-81ee-19b9405e87a2	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-17 20:21:07.953057+00	
00000000-0000-0000-0000-000000000000	e3c0f17e-1f28-460a-8f85-71dec0242125	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-18 12:25:54.335381+00	
00000000-0000-0000-0000-000000000000	f8511962-71d9-48fd-8fe4-30c848157d12	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-18 12:25:54.34089+00	
00000000-0000-0000-0000-000000000000	6eab2974-4e0f-48c3-a42c-c44fac0495fd	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-21 17:13:54.414153+00	
00000000-0000-0000-0000-000000000000	31a0e024-5805-40f9-beae-f45a21d75b71	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-21 17:13:54.423995+00	
00000000-0000-0000-0000-000000000000	10cd9385-5601-4708-8502-b78d4268a6d6	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-21 18:32:16.191761+00	
00000000-0000-0000-0000-000000000000	fb8d9ae9-4e0f-4390-b60d-62cf7cad6088	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-21 18:32:16.193768+00	
00000000-0000-0000-0000-000000000000	78e1d20c-8181-4c38-b131-bdbe2c607541	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 13:13:20.393262+00	
00000000-0000-0000-0000-000000000000	61a9dd6f-fec4-4c65-b2c1-f58652f5eada	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 13:13:20.400566+00	
00000000-0000-0000-0000-000000000000	40fb4a75-4674-4c01-ae6f-4cb930d48310	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 14:15:41.916566+00	
00000000-0000-0000-0000-000000000000	bb34caa8-06a8-4bc4-86b7-534c1eb31a0f	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 14:15:41.918895+00	
00000000-0000-0000-0000-000000000000	6422a989-4844-4db0-b5cf-7a6fb8e4ad9d	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 15:34:42.251589+00	
00000000-0000-0000-0000-000000000000	392db225-4806-4165-b25f-414faf7ea432	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 15:34:42.255317+00	
00000000-0000-0000-0000-000000000000	728b63b6-9221-4ab7-8833-e84500a92b47	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 16:33:59.250067+00	
00000000-0000-0000-0000-000000000000	4db3abe0-56c5-4e69-88ca-7507dc4273b6	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 16:33:59.253118+00	
00000000-0000-0000-0000-000000000000	5b1db1f3-d149-472d-be58-0964362f4473	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 17:34:32.217395+00	
00000000-0000-0000-0000-000000000000	8a8b43c3-83ab-4db1-b9c7-3ff9990fccc8	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-22 17:34:32.221797+00	
00000000-0000-0000-0000-000000000000	4176291b-f20c-4f7a-9019-fc8fe85a86af	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-23 20:07:49.171863+00	
00000000-0000-0000-0000-000000000000	7843d211-1058-4075-be12-e59ee0907521	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-23 20:07:49.178606+00	
00000000-0000-0000-0000-000000000000	6ce6972a-17d4-44ca-a78c-3a63a947f6ab	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 13:54:36.356451+00	
00000000-0000-0000-0000-000000000000	ade3ea0a-ad94-4655-ab95-3c88d1be9e2e	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 13:54:36.364854+00	
00000000-0000-0000-0000-000000000000	29dbfe79-cfbc-47b4-9005-2b0da158156a	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 14:56:13.980369+00	
00000000-0000-0000-0000-000000000000	dcc8231f-7892-4383-bf16-e5f9c76977e0	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 14:56:13.983574+00	
00000000-0000-0000-0000-000000000000	1883a838-f07f-4b10-b5e5-ba63ae69719b	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 15:55:34.757937+00	
00000000-0000-0000-0000-000000000000	07475534-fe18-4dba-aa76-dd4a842002fd	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 15:55:34.760996+00	
00000000-0000-0000-0000-000000000000	3a4b6687-9de9-4014-a73b-db011836d77e	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 15:55:34.804748+00	
00000000-0000-0000-0000-000000000000	8bf2e1b9-3293-47be-a748-07bed672df92	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 17:46:12.230835+00	
00000000-0000-0000-0000-000000000000	357a560d-949a-4f8b-982f-a97478610c9e	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 17:46:12.23588+00	
00000000-0000-0000-0000-000000000000	7cd5da58-41ce-48df-8c6a-960138e54c86	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 19:38:55.377597+00	
00000000-0000-0000-0000-000000000000	7e873370-1ac0-456d-9731-c2c13567737a	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-24 19:38:55.380826+00	
00000000-0000-0000-0000-000000000000	b582954b-d262-4d8f-acf2-e34beea3ab60	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 12:34:25.00509+00	
00000000-0000-0000-0000-000000000000	af52f9c6-5949-46b5-a669-808bd6507b3f	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 12:34:25.020265+00	
00000000-0000-0000-0000-000000000000	a39b3b76-9589-4ac6-b395-ce3cfb26fb0b	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 13:33:45.45967+00	
00000000-0000-0000-0000-000000000000	b5817174-fd03-4d1f-b945-4653c9913bb0	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 13:33:45.463925+00	
00000000-0000-0000-0000-000000000000	6890cc71-6b8d-457e-9546-177828e9c9a8	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 14:33:17.92682+00	
00000000-0000-0000-0000-000000000000	577abbbe-8af0-4b23-888c-d98ebc0a458b	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 14:33:17.931949+00	
00000000-0000-0000-0000-000000000000	19fa84b3-6cfc-4c6b-94f2-b4042f5d9902	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-25 14:33:20.122556+00	
00000000-0000-0000-0000-000000000000	15ecb2ed-859f-497f-b4a2-547278a03f13	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-28 17:48:24.906957+00	
00000000-0000-0000-0000-000000000000	4d17ba07-bae2-499e-b01b-71d7229818c2	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-28 17:48:24.916277+00	
00000000-0000-0000-0000-000000000000	64f44912-6c70-4e31-843c-155f590c911a	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-28 18:56:25.989369+00	
00000000-0000-0000-0000-000000000000	9bff3ba9-41a6-43ae-8fae-8ef3f3bbfbc2	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-28 18:56:25.991423+00	
00000000-0000-0000-0000-000000000000	b27d324d-94a9-42af-b825-623888428351	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-28 20:07:31.313971+00	
00000000-0000-0000-0000-000000000000	2187f043-4fec-4e52-bcfc-011cfab7fe69	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-28 20:07:31.316964+00	
00000000-0000-0000-0000-000000000000	46820e24-4005-4b2c-afd6-e5671be8310c	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-29 13:07:21.811987+00	
00000000-0000-0000-0000-000000000000	3944e0a0-390b-4fab-b272-3bb193bd4bf8	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-29 13:07:21.825283+00	
00000000-0000-0000-0000-000000000000	57ad6017-6321-43c2-ac48-cc63b5504990	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-29 13:07:23.522001+00	
00000000-0000-0000-0000-000000000000	db54bd2c-7b0f-45c2-ae3f-3fd8959a62e4	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-29 18:44:17.219347+00	
00000000-0000-0000-0000-000000000000	c2843e1f-855f-4a0a-be57-b020b9d93721	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-29 18:44:17.225083+00	
00000000-0000-0000-0000-000000000000	04df4d06-e06c-4be0-8f00-1bd057b5e975	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-30 16:51:02.392545+00	
00000000-0000-0000-0000-000000000000	e9af33a6-09be-42a6-8255-be1c36c56439	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-30 16:51:02.400811+00	
00000000-0000-0000-0000-000000000000	d05bed8f-4093-4ed9-aba4-6790b772b83f	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-30 18:14:06.248801+00	
00000000-0000-0000-0000-000000000000	24474e57-eb75-42ed-8af3-ba72564c9027	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-30 18:14:06.253872+00	
00000000-0000-0000-0000-000000000000	f6bcc76a-0eac-4f6e-86fc-9659827f8dbe	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-31 13:01:22.64133+00	
00000000-0000-0000-0000-000000000000	2737cc37-740a-4b33-bc90-9c9e2a0ba8d5	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-31 13:01:22.647468+00	
00000000-0000-0000-0000-000000000000	db8f7360-3b12-4bd9-85b9-239dda938744	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-31 14:13:10.652794+00	
00000000-0000-0000-0000-000000000000	ffb6d281-a347-4fe2-902b-0a24dd146fa7	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-31 14:13:10.65541+00	
00000000-0000-0000-0000-000000000000	29e819ef-03c6-420e-8ac9-ba83078dcf74	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-31 15:23:23.652484+00	
00000000-0000-0000-0000-000000000000	4335010a-1e78-49f3-8365-a09301d269cd	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-07-31 15:23:23.65487+00	
00000000-0000-0000-0000-000000000000	67e121e4-64b4-4aeb-92ba-914921d12121	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 14:40:03.844377+00	
00000000-0000-0000-0000-000000000000	a6265fcf-6728-4546-8267-7c22091e3008	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 14:40:03.853743+00	
00000000-0000-0000-0000-000000000000	c7c98f25-0e09-4130-803f-6fb6b82301c2	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 15:39:16.086585+00	
00000000-0000-0000-0000-000000000000	1620920d-5ce9-4e22-9e63-373139f9cfa9	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 15:39:16.089995+00	
00000000-0000-0000-0000-000000000000	9b9cc738-c3a1-4683-b1b9-cefde3ddb56a	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 16:39:05.30872+00	
00000000-0000-0000-0000-000000000000	9aa0239d-6773-48f0-8acc-d76b0a98aa60	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 16:39:05.312365+00	
00000000-0000-0000-0000-000000000000	7a261713-2ac0-4530-95e3-9354f9aa0ef4	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 19:25:10.822059+00	
00000000-0000-0000-0000-000000000000	d12f38cc-4269-4617-9ade-f439b9e2f6c0	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-04 19:25:10.824273+00	
00000000-0000-0000-0000-000000000000	d7c0cf2e-ce42-454a-99c9-aae83cb98a5d	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-05 12:51:54.942434+00	
00000000-0000-0000-0000-000000000000	9accf205-ef94-4ecd-8124-28b333aa8170	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-05 12:51:54.95288+00	
00000000-0000-0000-0000-000000000000	193c8327-38b3-431a-9464-3fc873d15096	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-05 18:55:19.447056+00	
00000000-0000-0000-0000-000000000000	36beaa8c-be0b-455b-9c50-ce5fe14ccdd8	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-07 15:08:54.249396+00	
00000000-0000-0000-0000-000000000000	c29efce9-fbe2-4280-9de2-30ef3782c722	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-07 15:08:54.256742+00	
00000000-0000-0000-0000-000000000000	c7451316-5008-456f-984d-a72a6c23a61c	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-08 13:11:23.190129+00	
00000000-0000-0000-0000-000000000000	f635da8d-93a0-4570-9aea-251f438f47d0	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-08 13:11:23.203786+00	
00000000-0000-0000-0000-000000000000	80d76a12-e149-4f3f-9505-66da2c2e22a9	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-11 19:56:10.198798+00	
00000000-0000-0000-0000-000000000000	1a92c640-0ac5-4219-b01d-7f8be9009b82	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-12 13:25:05.905332+00	
00000000-0000-0000-0000-000000000000	335f6b24-3db6-4377-9912-2ff39ad77b27	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-12 13:25:05.920437+00	
00000000-0000-0000-0000-000000000000	2b8d755a-8592-42b0-b73e-d8efb66d1425	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-12 19:15:29.970903+00	
00000000-0000-0000-0000-000000000000	45935f79-5d00-44a3-a295-ed282e160ca7	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-12 19:15:29.980253+00	
00000000-0000-0000-0000-000000000000	a0c63dd6-ed6d-48f3-9c86-e93ad5bb690a	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-12 20:29:13.869618+00	
00000000-0000-0000-0000-000000000000	585e514b-62d7-4866-88dc-6a73b777f196	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-12 20:29:13.874722+00	
00000000-0000-0000-0000-000000000000	821ba175-aa35-456d-bb31-2ccfa7c8d03e	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 12:54:17.768617+00	
00000000-0000-0000-0000-000000000000	a4092539-087a-4843-bdfe-da7b7d272355	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 12:54:17.780634+00	
00000000-0000-0000-0000-000000000000	5fd89e9f-3b02-4847-8c51-ed0c7395c330	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 13:54:21.563587+00	
00000000-0000-0000-0000-000000000000	3bc0778a-0c4a-47bd-8c30-3bae704e5e58	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 13:54:21.570471+00	
00000000-0000-0000-0000-000000000000	f47bc755-5d55-4a6b-8624-c121fe0a8825	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:00.828731+00	
00000000-0000-0000-0000-000000000000	fb538860-db4d-490a-adff-976cb294baba	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:00.833989+00	
00000000-0000-0000-0000-000000000000	1b5f2f0f-6f5b-422c-9b58-9bab515e2272	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:00.863137+00	
00000000-0000-0000-0000-000000000000	aaf52c8d-269b-4209-995a-da175f911507	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:00.894186+00	
00000000-0000-0000-0000-000000000000	7cc8d8e7-939b-4217-a43e-407286690b0e	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:00.915867+00	
00000000-0000-0000-0000-000000000000	603572dc-1082-437f-a3bb-08d8cabc5e36	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:04.48353+00	
00000000-0000-0000-0000-000000000000	1946fa20-f805-4df5-8403-abf080fbd1d5	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:05.374161+00	
00000000-0000-0000-0000-000000000000	f3088577-6bbf-4868-98ad-556b2149e1ed	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:05.407575+00	
00000000-0000-0000-0000-000000000000	acbc98ff-9857-45a6-81b2-1c68f4e5709e	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:07.615889+00	
00000000-0000-0000-0000-000000000000	dd377bb8-30d4-469f-811a-7c7016caf8fa	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:08.576427+00	
00000000-0000-0000-0000-000000000000	4bb75f6f-dfc6-4fe4-931d-a9d4a0110574	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:09.670064+00	
00000000-0000-0000-0000-000000000000	0c38737b-dff9-4d10-b54c-348829105518	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-13 14:56:09.99579+00	
00000000-0000-0000-0000-000000000000	919a4e64-3181-486d-bf01-25fb2d275dca	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-14 15:51:56.109346+00	
00000000-0000-0000-0000-000000000000	a209fb25-fd2b-4ad3-b027-2ac125040580	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-14 15:51:56.119813+00	
00000000-0000-0000-0000-000000000000	c566ff6a-2a94-4fc3-97e7-1168ccc7e989	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-14 16:50:49.945835+00	
00000000-0000-0000-0000-000000000000	7fcc9054-818b-4361-bff2-0a127749a10d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-14 16:50:49.950792+00	
00000000-0000-0000-0000-000000000000	3f2037f1-191f-4faf-af92-8fda4cf67072	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-14 19:50:44.767474+00	
00000000-0000-0000-0000-000000000000	ed8648d3-88c3-4a1b-9770-2d2cf35f7102	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-14 19:50:44.77108+00	
00000000-0000-0000-0000-000000000000	139e3851-59cf-4385-bb41-5b8f582e81e8	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 12:15:39.251211+00	
00000000-0000-0000-0000-000000000000	c2b027b3-fa15-4609-abb8-3904dfc4e61d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 12:15:39.257818+00	
00000000-0000-0000-0000-000000000000	1a68758b-aa40-4e15-9f81-194c1699db56	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 13:38:30.523021+00	
00000000-0000-0000-0000-000000000000	4a66b204-12c1-4aa8-a36e-425cd8b6d18a	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 13:38:30.52628+00	
00000000-0000-0000-0000-000000000000	294f9232-aa3f-40b0-a9e6-38c44354be76	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 14:48:57.137203+00	
00000000-0000-0000-0000-000000000000	82f8695f-0363-4b27-9bc1-cf38f972a54d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 14:48:57.140712+00	
00000000-0000-0000-0000-000000000000	8cb37b33-33ec-41b8-a9af-ed7463420882	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 15:48:21.459683+00	
00000000-0000-0000-0000-000000000000	8e3a8ed2-3dff-4b9f-a143-bd8a177ca449	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 15:48:21.462931+00	
00000000-0000-0000-0000-000000000000	425d2761-c140-459f-acc0-66520dc16f7b	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 16:59:56.853204+00	
00000000-0000-0000-0000-000000000000	c7c773be-8eb4-4977-9712-16829e86fd03	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 16:59:56.856356+00	
00000000-0000-0000-0000-000000000000	99447319-3652-403c-9dbe-aa00cbb3b953	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 18:00:42.178544+00	
00000000-0000-0000-0000-000000000000	d3b5e7b4-06df-45a5-8a73-0119e7871704	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-15 18:00:42.188889+00	
00000000-0000-0000-0000-000000000000	bfad97c5-c420-4a02-b4d6-2137bf8ce9dc	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-19 19:53:04.675281+00	
00000000-0000-0000-0000-000000000000	a781facb-ffe5-4126-a63e-5792d6f6bc7d	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-20 12:17:08.297996+00	
00000000-0000-0000-0000-000000000000	72dd5d73-59e2-456c-86b7-df98237bcbf1	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-20 12:17:08.306258+00	
00000000-0000-0000-0000-000000000000	1bfa593d-dda8-4ad3-9166-e25c17b71e0d	{"action":"user_repeated_signup","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}	2025-08-28 19:49:36.278328+00	
00000000-0000-0000-0000-000000000000	fdf6d5b2-76e7-4518-bb1d-5ea0c3c0bdbe	{"action":"user_repeated_signup","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}	2025-08-28 19:49:54.453647+00	
00000000-0000-0000-0000-000000000000	ed3715d4-d726-4d63-807a-c7537d333409	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-28 19:50:00.435658+00	
00000000-0000-0000-0000-000000000000	fd991797-f738-460b-b6d7-ea7cd91cf629	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 12:19:49.431121+00	
00000000-0000-0000-0000-000000000000	a32ef064-415b-492a-89fa-fa19d9a57fc7	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 12:19:49.437031+00	
00000000-0000-0000-0000-000000000000	aeabaa3f-de1a-41da-bbb7-e6d9713a6269	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 14:16:58.365432+00	
00000000-0000-0000-0000-000000000000	c2eae33d-4422-48d8-a9f0-a2352ab3e4a6	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 14:16:58.367079+00	
00000000-0000-0000-0000-000000000000	b8b66106-ca96-4233-82e0-d9e28dbcc545	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 15:26:18.235042+00	
00000000-0000-0000-0000-000000000000	4f221772-2d14-4eb8-8ad9-30b13c5a49e9	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 15:26:18.237663+00	
00000000-0000-0000-0000-000000000000	2997988e-ce9a-481d-b7d6-d3a0cddee11c	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 17:12:13.604302+00	
00000000-0000-0000-0000-000000000000	744efd87-a193-40e8-8927-4ece7c92ca7f	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 17:12:13.608444+00	
00000000-0000-0000-0000-000000000000	bd1b57bb-f9dd-4243-8637-d6fb8e5d5102	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 18:28:16.092153+00	
00000000-0000-0000-0000-000000000000	16c195a8-7d8b-46f7-b898-11d37c25e2ec	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-08-29 18:28:16.094802+00	
00000000-0000-0000-0000-000000000000	06c9c171-59ca-4dd7-9255-496279c01805	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 13:29:06.180864+00	
00000000-0000-0000-0000-000000000000	b04f69d4-f293-49c6-acf6-6ec1331d157a	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 13:29:06.192919+00	
00000000-0000-0000-0000-000000000000	23bb50a2-d5b4-4994-ab4e-94891181e0b4	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 14:35:25.84277+00	
00000000-0000-0000-0000-000000000000	3e5b9014-55f6-41c8-be3d-d4ebf02e6077	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 14:35:25.845634+00	
00000000-0000-0000-0000-000000000000	dd190d0d-cf4d-417b-aa18-39e515d14324	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 15:34:32.979214+00	
00000000-0000-0000-0000-000000000000	e7e15389-30f5-4428-92fe-e4aa71d9e5b4	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 15:34:32.983132+00	
00000000-0000-0000-0000-000000000000	c900cfab-fdff-432d-805e-b71b0875f3a6	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 16:33:06.868266+00	
00000000-0000-0000-0000-000000000000	b9b55fc0-5041-4438-8414-5dad77947489	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 16:33:06.87039+00	
00000000-0000-0000-0000-000000000000	55682e94-e578-4448-986a-0332ab3bb2c3	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 17:33:59.655904+00	
00000000-0000-0000-0000-000000000000	b97aea0b-ca78-4a6e-b923-cba064446734	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 17:33:59.660686+00	
00000000-0000-0000-0000-000000000000	57951d00-f295-4e3b-8655-4f3979307a23	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 13:37:28.85688+00	
00000000-0000-0000-0000-000000000000	9559ba90-0dd2-48aa-8de6-24494703522c	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 13:37:28.864854+00	
00000000-0000-0000-0000-000000000000	cc06faef-79b8-40f0-a09e-0fec1a8503a7	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 14:46:18.034018+00	
00000000-0000-0000-0000-000000000000	0ac3202b-0885-4399-a6fc-cc20147ff42f	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 14:46:18.04082+00	
00000000-0000-0000-0000-000000000000	efc2d5bc-a227-4c47-b58f-f1c78e6481f4	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 15:45:25.335904+00	
00000000-0000-0000-0000-000000000000	4e9e8a26-7e5e-426d-acbe-b255f17bd73d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 15:45:25.33932+00	
00000000-0000-0000-0000-000000000000	f23228c9-531e-44df-9c3c-f9a8dd8dc49f	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 16:56:27.824377+00	
00000000-0000-0000-0000-000000000000	8ffd9270-ab9a-401c-aed3-a7697474ea45	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 16:56:27.825791+00	
00000000-0000-0000-0000-000000000000	928c2e8c-aa9f-4c4b-96ac-dfe1c060aa27	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:07.00079+00	
00000000-0000-0000-0000-000000000000	9d04dc32-58a3-4868-8ba5-573d9a8a0e77	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:07.006865+00	
00000000-0000-0000-0000-000000000000	8d442b04-54ad-466c-8d5b-1326210cddae	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:07.028735+00	
00000000-0000-0000-0000-000000000000	c0a78aed-6ff6-401f-8d34-48fb5eb6a230	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:07.038057+00	
00000000-0000-0000-0000-000000000000	3f4c68b1-b906-4b55-a450-6933e06cf109	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:07.078449+00	
00000000-0000-0000-0000-000000000000	530a71d7-b278-4195-a311-514713e5afcb	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:07.108319+00	
00000000-0000-0000-0000-000000000000	1137b91b-27ac-41d6-bba4-f7fd6a6582df	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 18:46:16.448444+00	
00000000-0000-0000-0000-000000000000	2c2ef3e8-72a1-4d81-bd5e-5f8ace94c755	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 19:45:04.050242+00	
00000000-0000-0000-0000-000000000000	23be2ac2-ffea-4301-b150-08f6db32b3ca	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 19:45:04.053099+00	
00000000-0000-0000-0000-000000000000	b6c2f33d-7d54-407a-bbcf-9fbbc26c5c87	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-05 11:48:07.783394+00	
00000000-0000-0000-0000-000000000000	12f8a353-9399-4aa1-b283-cb3bc56b9760	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-05 11:48:07.796235+00	
00000000-0000-0000-0000-000000000000	232c562d-1aa7-46f0-a8f5-f339f766ac23	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-22 17:21:14.591834+00	
00000000-0000-0000-0000-000000000000	d083e8e7-82ba-486a-b4f8-4b02f6239f9c	{"action":"login","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-22 17:21:38.058739+00	
00000000-0000-0000-0000-000000000000	1601e10d-880a-4b55-bfa7-e07448c6e142	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-22 18:51:17.469613+00	
00000000-0000-0000-0000-000000000000	cd52d7b5-8d0c-44de-a08d-97b46fa534f5	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-22 18:51:17.471964+00	
00000000-0000-0000-0000-000000000000	d7c0702f-0215-4a75-93a1-6162f6002453	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-22 19:53:20.392092+00	
00000000-0000-0000-0000-000000000000	784bfdec-096e-4a57-ab45-dad44ed824bb	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-22 19:53:20.394066+00	
00000000-0000-0000-0000-000000000000	649f76e9-29ea-420b-9e17-c46fc689da40	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 16:26:41.090222+00	
00000000-0000-0000-0000-000000000000	31758628-2e67-491d-9e1b-846fe6cd7ddd	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 16:26:41.109213+00	
00000000-0000-0000-0000-000000000000	e9eddd45-59af-41f1-86be-cf34a7d8d403	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 17:38:01.647164+00	
00000000-0000-0000-0000-000000000000	6f298c7c-1176-4bd9-863c-ef58ee66d77c	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 17:38:01.653189+00	
00000000-0000-0000-0000-000000000000	998bcc20-0978-49b3-895a-2bb35ddf8b1b	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 18:37:34.712342+00	
00000000-0000-0000-0000-000000000000	7cb5cc1b-f9c6-459b-990c-8241f627c890	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 18:37:34.715028+00	
00000000-0000-0000-0000-000000000000	c1671137-38ed-4512-aa0f-d94403ff747a	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 19:38:12.469972+00	
00000000-0000-0000-0000-000000000000	3c64827f-fa17-400f-93c5-00db0b6d5d2e	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-23 19:38:12.471712+00	
00000000-0000-0000-0000-000000000000	bb4c0b8e-d7b7-4878-ab14-18255cc250de	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 12:22:55.558371+00	
00000000-0000-0000-0000-000000000000	4c139af9-21ae-42a8-b53c-1048dbbfef99	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 12:22:55.575257+00	
00000000-0000-0000-0000-000000000000	3bb3a697-3d3a-4761-afed-3c0cc1718f18	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 13:23:03.559411+00	
00000000-0000-0000-0000-000000000000	a28ebd79-e20e-4868-9452-793fe9101b55	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 13:23:03.56038+00	
00000000-0000-0000-0000-000000000000	ca01c050-ac03-4c87-9781-270ecd054a54	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 15:16:55.842347+00	
00000000-0000-0000-0000-000000000000	5b0c4ba9-e6b9-4846-aede-57088967d35b	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 15:16:55.843217+00	
00000000-0000-0000-0000-000000000000	1a999f2a-4532-45c0-9397-9d6f1814f7bc	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 16:37:03.312748+00	
00000000-0000-0000-0000-000000000000	ff84547d-0600-4fba-95ce-9e4f03e8d8c4	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 16:37:03.315424+00	
00000000-0000-0000-0000-000000000000	11f0eb8f-62e0-4660-bc30-1b827dd14331	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 19:02:23.296615+00	
00000000-0000-0000-0000-000000000000	900e02f9-f300-4acf-9025-d600ccd8e0ec	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 19:02:23.298717+00	
00000000-0000-0000-0000-000000000000	616fa223-ad6c-47da-bb5a-1bd3962961ae	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 20:03:46.357001+00	
00000000-0000-0000-0000-000000000000	0394ffc9-8ee6-4a0a-835d-9a5eea6076cf	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-24 20:03:46.360449+00	
00000000-0000-0000-0000-000000000000	8776a3e7-f323-41c0-abef-1b4682f201c1	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 12:21:07.768976+00	
00000000-0000-0000-0000-000000000000	bdf0e4b6-24ae-4961-ac55-2cb89c9c1299	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 12:21:07.778544+00	
00000000-0000-0000-0000-000000000000	d53a3616-5e09-4d2c-8307-93c8e98f05ef	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 13:19:19.769729+00	
00000000-0000-0000-0000-000000000000	293530bc-bb92-4888-b080-2a534c2d4451	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 13:19:19.773137+00	
00000000-0000-0000-0000-000000000000	58270636-20e4-447a-adf8-fcb389132db5	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 14:44:56.498161+00	
00000000-0000-0000-0000-000000000000	8f98c171-11b4-4e7f-b6ba-48bd396a9d59	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 14:44:56.500747+00	
00000000-0000-0000-0000-000000000000	b9d2830e-51cc-4554-9ce7-1e9a6e1ffe74	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 15:46:40.685072+00	
00000000-0000-0000-0000-000000000000	adf7c9ad-9a39-48ca-8e0a-a3487a2d7f39	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 15:46:40.69208+00	
00000000-0000-0000-0000-000000000000	f5bd63a4-3407-4d01-bff9-77572c8aea8e	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 17:19:18.662987+00	
00000000-0000-0000-0000-000000000000	aa27a5c1-fd38-4171-816a-7a1696975e71	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-25 17:19:18.67165+00	
00000000-0000-0000-0000-000000000000	62230433-3a52-425a-aa8b-27a02567ccf4	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 12:26:19.593716+00	
00000000-0000-0000-0000-000000000000	1f78f7d3-fb26-4dde-9764-da846efb397d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 12:26:19.60598+00	
00000000-0000-0000-0000-000000000000	1d83e006-e360-4c6e-bc34-3112396d7997	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 13:26:19.922841+00	
00000000-0000-0000-0000-000000000000	aae2ac28-3230-4b87-9609-f71b5c12965d	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 13:26:19.926358+00	
00000000-0000-0000-0000-000000000000	7c15211a-44ec-4afe-8e26-9c01e267de78	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 14:29:31.610622+00	
00000000-0000-0000-0000-000000000000	dced6a77-2126-4541-a3d2-6125bc35d667	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 14:29:31.616957+00	
00000000-0000-0000-0000-000000000000	abe2199f-ea42-439d-a1bd-b638faf5d6c6	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 15:40:36.334142+00	
00000000-0000-0000-0000-000000000000	0757ba06-c10c-43d5-bfdd-88a45c024248	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 15:40:36.339142+00	
00000000-0000-0000-0000-000000000000	2345706e-4549-4d37-b101-fe139c7f3498	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 17:06:17.096643+00	
00000000-0000-0000-0000-000000000000	4543b647-76bf-4432-8858-fa9ec8d17568	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 17:06:17.104273+00	
00000000-0000-0000-0000-000000000000	53a4f124-19f3-4924-be23-730009182ca3	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 18:18:19.759943+00	
00000000-0000-0000-0000-000000000000	16a8a813-0590-42e0-a275-67fc85d2d5f8	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 18:18:19.763585+00	
00000000-0000-0000-0000-000000000000	f31d5517-41a1-446d-bf1b-bd9967252806	{"action":"token_refreshed","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 19:16:48.595574+00	
00000000-0000-0000-0000-000000000000	74de633d-29e9-4438-8bf1-df40db96f83c	{"action":"token_revoked","actor_id":"3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1","actor_username":"hosts@newrootsherbal.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 19:16:48.601875+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
820c59df-197f-4f99-8c09-58e6a814e2fb	4a3504ea-ee60-4a3a-8155-c3954e28a170	732e216d-a8ce-44c8-9a78-88f4c9539712	s256	6P--xZyoKCPFbdvoIH0vHzlPqxtK4GW9uyEaC57papA	email			2025-05-28 14:07:27.285008+00	2025-05-28 14:07:27.285008+00	email/signup	\N
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0	3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0	{"sub": "3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0", "email": "desjardinsn@newrootsherbal.com", "email_verified": true, "phone_verified": false}	email	2025-05-16 14:34:05.765287+00	2025-05-16 14:34:05.765338+00	2025-05-16 14:34:05.765338+00	b6f01575-73f4-4405-aaec-9d8658691173
4a3504ea-ee60-4a3a-8155-c3954e28a170	4a3504ea-ee60-4a3a-8155-c3954e28a170	{"sub": "4a3504ea-ee60-4a3a-8155-c3954e28a170", "email": "demo@test.com", "email_verified": false, "phone_verified": false}	email	2025-05-28 14:07:27.281893+00	2025-05-28 14:07:27.281945+00	2025-05-28 14:07:27.281945+00	64953b41-bccc-4fd3-ac78-657becd43bfd
3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	{"sub": "3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1", "email": "hosts@newrootsherbal.com", "email_verified": false, "phone_verified": false}	email	2025-07-17 16:56:41.819166+00	2025-07-17 16:56:41.819214+00	2025-07-17 16:56:41.819214+00	370fa215-a774-413d-a347-0de31c89668b
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
382e4a26-9a7f-4da2-83d5-7aaccc4465c4	2025-05-28 14:36:14.968282+00	2025-05-28 14:36:14.968282+00	password	815e337b-51d9-4bb3-89fa-d9af7aa82d34
8d7745c6-b23b-4526-8cde-fba43ce4a6d5	2025-07-17 16:58:09.23665+00	2025-07-17 16:58:09.23665+00	password	6bd6f3c5-5662-477b-b706-1fe460447f43
ba295a5f-5249-4f04-a922-c951017d32c5	2025-08-05 18:55:19.475671+00	2025-08-05 18:55:19.475671+00	password	6fadf463-49b5-42a9-a255-e2c249b3bc00
6b23e664-1765-4d59-8de1-2abca6842c09	2025-08-11 19:56:10.267688+00	2025-08-11 19:56:10.267688+00	password	ace13a47-6c08-479c-92ba-9d392470f411
e03e91eb-222b-4186-a696-38ff09e86c00	2025-08-19 19:53:04.710752+00	2025-08-19 19:53:04.710752+00	password	02d3bf70-37b4-4866-9e46-e9e720379f3f
ed06d3a2-62f6-479f-8ba8-c06e97209ed8	2025-08-28 19:50:00.494145+00	2025-08-28 19:50:00.494145+00	password	3666d5b2-7741-4a50-a3a1-fdbf0e5f2010
2d0b04c0-d547-40c8-906e-c185d2ed3b9d	2025-09-22 17:21:14.63816+00	2025-09-22 17:21:14.63816+00	password	c987f3a4-ea4f-4039-9f03-01d111224877
5e0cddf7-4611-43f5-99b6-3e9ea551d9f7	2025-09-22 17:21:38.063564+00	2025-09-22 17:21:38.063564+00	password	c633d338-daab-43bc-8316-44dc6d046c5e
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
f39acdb5-5f28-409d-8b5e-c4fd4b1631b9	4a3504ea-ee60-4a3a-8155-c3954e28a170	confirmation_token	pkce_ec72ce5125649adefd20c48b80ad73e1444fb3a67086fe19968ef7fd	demo@test.com	2025-05-28 14:07:29.609698	2025-05-28 14:07:29.609698
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	273	lbpvnyr2mptl	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-25 13:33:45.467759+00	2025-07-25 14:33:17.932656+00	zwk4go7hjg7r	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	74	irtatqei56fp	4a3504ea-ee60-4a3a-8155-c3954e28a170	f	2025-05-28 14:36:14.9643+00	2025-05-28 14:36:14.9643+00	\N	382e4a26-9a7f-4da2-83d5-7aaccc4465c4
00000000-0000-0000-0000-000000000000	274	p5jgvicg6cp2	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-25 14:33:17.934009+00	2025-07-28 17:48:24.918649+00	lbpvnyr2mptl	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	275	7q635b655eil	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-28 17:48:24.93001+00	2025-07-28 18:56:25.993212+00	p5jgvicg6cp2	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	276	6oxohlg5bhhz	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-28 18:56:25.99505+00	2025-07-28 20:07:31.318213+00	7q635b655eil	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	277	mhpbvghy6ipy	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-28 20:07:31.31957+00	2025-07-29 13:07:21.828445+00	6oxohlg5bhhz	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	278	hczuudmopqrc	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-29 13:07:21.83722+00	2025-07-29 18:44:17.226788+00	mhpbvghy6ipy	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	279	yzqksmmohthg	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-29 18:44:17.228699+00	2025-07-30 16:51:02.402989+00	hczuudmopqrc	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	280	zxbmfngqsm5s	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-30 16:51:02.411931+00	2025-07-30 18:14:06.255211+00	yzqksmmohthg	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	281	mpxuc7yp77cf	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-30 18:14:06.25723+00	2025-07-31 13:01:22.648744+00	zxbmfngqsm5s	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	282	nrc5kbm3tfkc	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-31 13:01:22.657891+00	2025-07-31 14:13:10.65601+00	mpxuc7yp77cf	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	283	rqc54j6p3abe	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-31 14:13:10.657796+00	2025-07-31 15:23:23.657343+00	nrc5kbm3tfkc	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	284	tgb4bjaqbeu6	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-31 15:23:23.659479+00	2025-08-04 14:40:03.857742+00	rqc54j6p3abe	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	285	ee5mjsy57jch	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-04 14:40:03.864981+00	2025-08-04 15:39:16.09194+00	tgb4bjaqbeu6	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	286	re5kldgbfzec	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-04 15:39:16.095899+00	2025-08-04 16:39:05.313034+00	ee5mjsy57jch	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	255	j3yejwrwkbzu	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-17 16:58:09.233282+00	2025-07-17 19:22:49.165031+00	\N	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	256	xw5vg4dotovi	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-17 19:22:49.166941+00	2025-07-17 20:21:07.954264+00	j3yejwrwkbzu	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	287	jmwljjgkvxwx	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-04 16:39:05.315554+00	2025-08-04 19:25:10.825426+00	re5kldgbfzec	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	257	ef3brhfwqmqb	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-17 20:21:07.955567+00	2025-07-18 12:25:54.341486+00	xw5vg4dotovi	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	258	jpjk4brpjd66	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-18 12:25:54.346129+00	2025-07-21 17:13:54.427102+00	ef3brhfwqmqb	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	288	jsng6p533vku	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-04 19:25:10.826127+00	2025-08-05 12:51:54.956179+00	jmwljjgkvxwx	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	259	3ayl64xgxlco	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-21 17:13:54.43581+00	2025-07-21 18:32:16.194847+00	jpjk4brpjd66	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	289	j7pyvenf642b	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-08-05 12:51:54.96432+00	2025-08-05 12:51:54.96432+00	jsng6p533vku	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	260	yq3alrltopwl	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-21 18:32:16.197282+00	2025-07-22 13:13:20.401339+00	3ayl64xgxlco	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	261	ojqwqctgdncq	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-22 13:13:20.409257+00	2025-07-22 14:15:41.921409+00	yq3alrltopwl	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	290	3kxk7xiwc4zi	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-05 18:55:19.464868+00	2025-08-07 15:08:54.260375+00	\N	ba295a5f-5249-4f04-a922-c951017d32c5
00000000-0000-0000-0000-000000000000	262	kzdcobqgmrzq	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-22 14:15:41.923869+00	2025-07-22 15:34:42.256634+00	ojqwqctgdncq	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	263	qavtqfmryzb7	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-22 15:34:42.25796+00	2025-07-22 16:33:59.256192+00	kzdcobqgmrzq	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	291	nmiqgt2soxct	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-07 15:08:54.278695+00	2025-08-08 13:11:23.207764+00	3kxk7xiwc4zi	ba295a5f-5249-4f04-a922-c951017d32c5
00000000-0000-0000-0000-000000000000	264	74mhbgyo2ttt	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-22 16:33:59.258595+00	2025-07-22 17:34:32.223991+00	qavtqfmryzb7	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	292	tzxwrnhmypv7	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-08-08 13:11:23.216644+00	2025-08-08 13:11:23.216644+00	nmiqgt2soxct	ba295a5f-5249-4f04-a922-c951017d32c5
00000000-0000-0000-0000-000000000000	293	2prnmb57neu5	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-11 19:56:10.234272+00	2025-08-12 13:25:05.923139+00	\N	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	265	b452khskyc66	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-22 17:34:32.227559+00	2025-07-23 20:07:49.180497+00	74mhbgyo2ttt	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	294	a6qpu4z3jrch	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-12 13:25:05.936412+00	2025-08-12 19:15:29.982704+00	2prnmb57neu5	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	266	7kyh3ysjd24l	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-23 20:07:49.193272+00	2025-07-24 13:54:36.369006+00	b452khskyc66	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	295	tkvccdek6yqu	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-12 19:15:29.987006+00	2025-08-12 20:29:13.875986+00	a6qpu4z3jrch	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	296	q5ugdkaihc3v	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-12 20:29:13.879854+00	2025-08-13 12:54:17.781284+00	tkvccdek6yqu	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	267	exhcgk4leuuf	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-24 13:54:36.380161+00	2025-07-24 14:56:13.985281+00	7kyh3ysjd24l	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	297	lvvnzl65ho2b	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-13 12:54:17.790244+00	2025-08-13 13:54:21.572402+00	q5ugdkaihc3v	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	268	ypo747mrmowd	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-24 14:56:13.98781+00	2025-07-24 15:55:34.761613+00	exhcgk4leuuf	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	269	aatr4xjjrrfo	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-24 15:55:34.764836+00	2025-07-24 17:46:12.237118+00	ypo747mrmowd	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	298	5u6pdbuv65od	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-13 13:54:21.575482+00	2025-08-13 14:56:00.834728+00	lvvnzl65ho2b	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	270	k5jxahg4uakh	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-24 17:46:12.241987+00	2025-07-24 19:38:55.382009+00	aatr4xjjrrfo	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	271	56whr2gw7vru	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-24 19:38:55.384528+00	2025-07-25 12:34:25.021122+00	k5jxahg4uakh	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	299	y4qvugsz7dks	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-13 14:56:00.83716+00	2025-08-14 15:51:56.12106+00	5u6pdbuv65od	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	272	zwk4go7hjg7r	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-07-25 12:34:25.032185+00	2025-07-25 13:33:45.464525+00	56whr2gw7vru	8d7745c6-b23b-4526-8cde-fba43ce4a6d5
00000000-0000-0000-0000-000000000000	300	zzzrxwtww7eq	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-14 15:51:56.135537+00	2025-08-14 16:50:49.952003+00	y4qvugsz7dks	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	301	pxedniq7hwhq	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-14 16:50:49.954921+00	2025-08-14 19:50:44.772811+00	zzzrxwtww7eq	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	302	q6tyal6q3zbl	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-14 19:50:44.775335+00	2025-08-15 12:15:39.25957+00	pxedniq7hwhq	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	303	lb2d7yfqjypg	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-15 12:15:39.26813+00	2025-08-15 13:38:30.52932+00	q6tyal6q3zbl	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	304	vw5zsq2mbacv	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-15 13:38:30.532068+00	2025-08-15 14:48:57.142038+00	lb2d7yfqjypg	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	305	juxyp52r63rm	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-15 14:48:57.145674+00	2025-08-15 15:48:21.464064+00	vw5zsq2mbacv	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	306	jrgg7zvql2ps	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-15 15:48:21.466537+00	2025-08-15 16:59:56.8575+00	juxyp52r63rm	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	307	vhdb7wkhcm3z	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-15 16:59:56.860651+00	2025-08-15 18:00:42.192847+00	jrgg7zvql2ps	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	308	qgy6ovzo6rlq	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-08-15 18:00:42.199534+00	2025-08-15 18:00:42.199534+00	vhdb7wkhcm3z	6b23e664-1765-4d59-8de1-2abca6842c09
00000000-0000-0000-0000-000000000000	309	mp2nlmwbfkjh	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-19 19:53:04.695614+00	2025-08-20 12:17:08.30903+00	\N	e03e91eb-222b-4186-a696-38ff09e86c00
00000000-0000-0000-0000-000000000000	310	xc4zb65j5fow	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-08-20 12:17:08.317746+00	2025-08-20 12:17:08.317746+00	mp2nlmwbfkjh	e03e91eb-222b-4186-a696-38ff09e86c00
00000000-0000-0000-0000-000000000000	311	sdtj73zb5kse	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-28 19:50:00.457886+00	2025-08-29 12:19:49.438647+00	\N	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	312	6rwkzfumon74	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-29 12:19:49.446937+00	2025-08-29 14:16:58.369555+00	sdtj73zb5kse	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	313	hxvtyydfq2bn	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-29 14:16:58.373838+00	2025-08-29 15:26:18.238986+00	6rwkzfumon74	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	314	qcxwqvrrkqux	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-29 15:26:18.242122+00	2025-08-29 17:12:13.609846+00	hxvtyydfq2bn	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	315	mfgha3tryqiz	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-29 17:12:13.612333+00	2025-08-29 18:28:16.095998+00	qcxwqvrrkqux	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	316	dxdnmvvxgf2k	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-08-29 18:28:16.098654+00	2025-09-02 13:29:06.19581+00	mfgha3tryqiz	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	317	n2dgsjeqnijv	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-02 13:29:06.203418+00	2025-09-02 14:35:25.846195+00	dxdnmvvxgf2k	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	318	4g7enrpals2f	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-02 14:35:25.848545+00	2025-09-02 15:34:32.984919+00	n2dgsjeqnijv	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	319	2xcj25ahvogi	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-02 15:34:32.98812+00	2025-09-02 16:33:06.871086+00	4g7enrpals2f	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	320	w35isew66d3w	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-02 16:33:06.873989+00	2025-09-02 17:33:59.66141+00	2xcj25ahvogi	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	321	iombbjetq4mi	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-02 17:33:59.666007+00	2025-09-04 13:37:28.866992+00	w35isew66d3w	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	322	gri7c2sbdhll	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-04 13:37:28.876222+00	2025-09-04 14:46:18.042314+00	iombbjetq4mi	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	323	kq7q7deg4mrd	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-04 14:46:18.046418+00	2025-09-04 15:45:25.343591+00	gri7c2sbdhll	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	324	7b6dnh3qes7c	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-04 15:45:25.347906+00	2025-09-04 16:56:27.826973+00	kq7q7deg4mrd	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	325	kbbdl2oklzwb	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-04 16:56:27.830943+00	2025-09-04 18:46:07.010598+00	7b6dnh3qes7c	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	326	b7cz5ls442pg	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-04 18:46:07.014015+00	2025-09-04 19:45:04.053656+00	kbbdl2oklzwb	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	327	jhwwgvrejrr2	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-04 19:45:04.059396+00	2025-09-05 11:48:07.798046+00	b7cz5ls442pg	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	328	3r35dtlsrutc	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-09-05 11:48:07.803226+00	2025-09-05 11:48:07.803226+00	jhwwgvrejrr2	ed06d3a2-62f6-479f-8ba8-c06e97209ed8
00000000-0000-0000-0000-000000000000	329	wtzjskt3xgu6	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-09-22 17:21:14.624736+00	2025-09-22 17:21:14.624736+00	\N	2d0b04c0-d547-40c8-906e-c185d2ed3b9d
00000000-0000-0000-0000-000000000000	330	sgm5tg3oeukz	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-22 17:21:38.062248+00	2025-09-22 18:51:17.472537+00	\N	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	331	biwzmel4y3um	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-22 18:51:17.479855+00	2025-09-22 19:53:20.395331+00	sgm5tg3oeukz	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	332	uqepfzxmdnmu	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-22 19:53:20.396044+00	2025-09-23 16:26:41.112245+00	biwzmel4y3um	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	333	nnbrtx5hoth7	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-23 16:26:41.125657+00	2025-09-23 17:38:01.653863+00	uqepfzxmdnmu	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	334	76sdebeqczrz	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-23 17:38:01.656081+00	2025-09-23 18:37:34.715633+00	nnbrtx5hoth7	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	335	sselu56cqrmf	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-23 18:37:34.716292+00	2025-09-23 19:38:12.47234+00	76sdebeqczrz	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	336	hmhjig2pr5qb	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-23 19:38:12.473083+00	2025-09-24 12:22:55.580441+00	sselu56cqrmf	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	337	vxpbxyidelki	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-24 12:22:55.589457+00	2025-09-24 13:23:03.56244+00	hmhjig2pr5qb	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	338	a4ixifmgpaha	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-24 13:23:03.565339+00	2025-09-24 15:16:55.847754+00	vxpbxyidelki	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	339	z76unfvmwkgl	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-24 15:16:55.848585+00	2025-09-24 16:37:03.317746+00	a4ixifmgpaha	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	340	wpt3gakoul7u	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-24 16:37:03.318458+00	2025-09-24 19:02:23.299945+00	z76unfvmwkgl	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	341	ru35l7huzzti	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-24 19:02:23.302088+00	2025-09-24 20:03:46.361618+00	wpt3gakoul7u	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	342	qwzs2tykdlpn	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-24 20:03:46.365609+00	2025-09-25 12:21:07.7829+00	ru35l7huzzti	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	343	wytqsbstz4tm	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-25 12:21:07.791365+00	2025-09-25 13:19:19.774344+00	qwzs2tykdlpn	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	344	rwgsetzf24dt	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-25 13:19:19.776311+00	2025-09-25 14:44:56.501472+00	wytqsbstz4tm	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	345	3hdqpjvl675q	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-25 14:44:56.502178+00	2025-09-25 15:46:40.693545+00	rwgsetzf24dt	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	346	vqfpzbjpi6ae	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-25 15:46:40.701016+00	2025-09-25 17:19:18.672295+00	3hdqpjvl675q	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	347	rbgwbyxpcxcn	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-25 17:19:18.674884+00	2025-09-30 12:26:19.608506+00	vqfpzbjpi6ae	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	348	ww2s2i7zhnte	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-30 12:26:19.617974+00	2025-09-30 13:26:19.933094+00	rbgwbyxpcxcn	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	349	jitlzakkoecf	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-30 13:26:19.934808+00	2025-09-30 14:29:31.618232+00	ww2s2i7zhnte	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	350	ds6egpquyb3p	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-30 14:29:31.621775+00	2025-09-30 15:40:36.340436+00	jitlzakkoecf	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	351	uovyazdxtb7f	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-30 15:40:36.345165+00	2025-09-30 17:06:17.105491+00	ds6egpquyb3p	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	352	mhhrtx765nnx	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-30 17:06:17.107281+00	2025-09-30 18:18:19.76416+00	uovyazdxtb7f	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	353	udofsk5rwtia	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	t	2025-09-30 18:18:19.76617+00	2025-09-30 19:16:48.602601+00	mhhrtx765nnx	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
00000000-0000-0000-0000-000000000000	354	tnjz65fzzf74	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	f	2025-09-30 19:16:48.604484+00	2025-09-30 19:16:48.604484+00	udofsk5rwtia	5e0cddf7-4611-43f5-99b6-3e9ea551d9f7
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag) FROM stdin;
382e4a26-9a7f-4da2-83d5-7aaccc4465c4	4a3504ea-ee60-4a3a-8155-c3954e28a170	2025-05-28 14:36:14.960143+00	2025-05-28 14:36:14.960143+00	\N	aal1	\N	\N	node	70.28.92.208	\N
6b23e664-1765-4d59-8de1-2abca6842c09	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-08-11 19:56:10.221465+00	2025-08-15 18:00:42.205712+00	\N	aal1	\N	2025-08-15 18:00:42.205577	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	70.28.92.208	\N
e03e91eb-222b-4186-a696-38ff09e86c00	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-08-19 19:53:04.689117+00	2025-08-20 12:17:08.325843+00	\N	aal1	\N	2025-08-20 12:17:08.325762	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	70.28.92.208	\N
5e0cddf7-4611-43f5-99b6-3e9ea551d9f7	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-09-22 17:21:38.061383+00	2025-09-30 19:16:48.614005+00	\N	aal1	\N	2025-09-30 19:16:48.613924	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	70.28.92.208	\N
8d7745c6-b23b-4526-8cde-fba43ce4a6d5	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-07-17 16:58:09.231858+00	2025-08-05 12:51:54.972946+00	\N	aal1	\N	2025-08-05 12:51:54.972159	Next.js Middleware	70.28.92.208	\N
ba295a5f-5249-4f04-a922-c951017d32c5	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-08-05 18:55:19.459296+00	2025-08-08 13:11:23.231398+00	\N	aal1	\N	2025-08-08 13:11:23.231309	Next.js Middleware	70.28.92.208	\N
ed06d3a2-62f6-479f-8ba8-c06e97209ed8	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-08-28 19:50:00.450583+00	2025-09-05 11:48:07.826324+00	\N	aal1	\N	2025-09-05 11:48:07.826237	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	70.28.92.208	\N
2d0b04c0-d547-40c8-906e-c185d2ed3b9d	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-09-22 17:21:14.617755+00	2025-09-22 17:21:14.617755+00	\N	aal1	\N	\N	node	70.28.92.208	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0	authenticated	authenticated	desjardinsn@newrootsherbal.com	$2a$10$INO4EhjfdNTtE7FSZ9DmduC7xAfOWlGmfFnJSFOpBjL/ktWCnVVca	2025-05-16 14:34:19.439568+00	\N		2025-05-16 14:34:05.776657+00		\N			\N	2025-06-12 12:19:25.043622+00	{"provider": "email", "providers": ["email"]}	{"sub": "3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0", "email": "desjardinsn@newrootsherbal.com", "email_verified": true, "phone_verified": false}	\N	2025-05-16 14:34:05.752903+00	2025-06-12 12:19:25.048025+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	4a3504ea-ee60-4a3a-8155-c3954e28a170	authenticated	authenticated	demo@test.com	$2a$10$EZCRd75QEdK9t6gJJV2iQuJML4B5kl6X9fkoL5TlLy0YCdmKvrL2q	2025-05-28 14:14:23.181434+00	\N	pkce_ec72ce5125649adefd20c48b80ad73e1444fb3a67086fe19968ef7fd	2025-05-28 14:14:23.181434+00		\N			\N	2025-05-28 14:36:14.960065+00	{"provider": "email", "providers": ["email"]}	{"sub": "4a3504ea-ee60-4a3a-8155-c3954e28a170", "email": "demo@test.com", "email_verified": false, "phone_verified": false}	\N	2025-05-28 14:07:27.277946+00	2025-05-28 14:36:14.966809+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	authenticated	authenticated	hosts@newrootsherbal.com	$2a$10$MOIymom9xDnkwcP/4t5xIefUPh1kxnfFrUla.Oe45Csi40.kVmtHO	2025-07-17 16:56:41.820781+00	\N		\N		\N			\N	2025-09-22 17:21:38.061297+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-07-17 16:56:41.817904+00	2025-09-30 19:16:48.611782+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blocks (id, page_id, post_id, language_id, block_type, content, "order", created_at, updated_at) FROM stdin;
12	5	\N	1	heading	{"level": 1, "text_content": "This is the blog"}	0	2025-05-23 17:42:11.867138+00	2025-05-28 16:20:35.579812+00
13	5	\N	1	posts_grid	{"title": "Recent Posts", "columns": 3, "postsPerPage": 12, "showPagination": true}	1	2025-05-23 17:42:29.791114+00	2025-05-23 17:42:42.340717+00
15	6	\N	2	heading	{"level": 1, "text_content": "Bienvenue au blogue"}	0	2025-05-26 14:08:14.652965+00	2025-05-26 19:10:27.766161+00
22	6	\N	2	text	{"html_content": "<p>New text block...</p>"}	1	2025-05-26 19:10:24.552638+00	2025-05-26 19:10:27.778118+00
16	6	\N	2	posts_grid	{"title": "Recent Posts", "columns": 3, "postsPerPage": 12, "showPagination": true}	2	2025-05-26 14:08:30.811684+00	2025-05-26 19:10:27.791022+00
25	\N	3	1	heading	{"level": 2, "text_content": "New Heading"}	0	2025-05-27 15:10:45.390675+00	2025-05-27 15:10:45.390675+00
37	4	\N	2	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"title": "Recent Posts", "columns": 4, "postsPerPage": 4, "showPagination": true}, "temp_id": "temp-1748449329438-0.04038678073462709", "block_type": "posts_grid"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 1}}	5	2025-05-29 15:04:15.716902+00	2025-05-29 15:04:15.716902+00
38	4	\N	2	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "theme", "theme": "accent"}, "column_gap": "md", "column_blocks": [[{"content": {"level": 1, "textAlign": "center", "textColor": "secondary", "text_content": "Something Interesting"}, "temp_id": "temp-1748526644607-0.7296411873874854", "block_type": "heading"}, {"content": {"html_content": "<p>Something interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting.</p>"}, "block_type": "text"}], [{"content": {"width": 1024, "height": 1024, "caption": "", "alt_text": "e0f51f6d-5ab5-4603-ba42-4b8dbcf2c6d2.webp", "media_id": "b214e748-1139-4608-a97e-62ce44edd6e4", "object_key": "uploads/e0f51f6d-5ab5-4603-ba42-4b8dbcf2c6d2_20250529093721.webp"}, "temp_id": "temp-1748525825468-0.5679865408890822", "block_type": "image"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 2}}	6	2025-05-29 15:04:15.716902+00	2025-05-29 15:04:15.716902+00
35	4	\N	2	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"level": 1, "textAlign": "center", "textColor": "secondary", "text_content": "Ceci est un titre"}, "temp_id": "temp-1748449263328-0.43594849790087153", "block_type": "heading"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 1}}	0	2025-05-29 15:04:15.716902+00	2025-05-29 15:04:44.44524+00
34	\N	5	1	heading	{"level": 1, "textAlign": "left", "text_content": "This is it!"}	1	2025-05-29 14:19:06.952568+00	2025-07-07 14:33:09.034112+00
32	3	\N	1	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"title": "Recent Posts", "columns": 4, "postsPerPage": 4, "showPagination": true}, "temp_id": "temp-1748449329438-0.04038678073462709", "block_type": "posts_grid"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 1}}	1	2025-05-28 16:22:32.685062+00	2025-09-23 19:41:56.533881+00
36	4	\N	2	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "gradient", "gradient": {"type": "linear", "stops": [{"color": "#4da35e", "position": 0}, {"color": "#107e12", "position": 100}], "direction": "to right"}}, "column_gap": "md", "column_blocks": [[{"content": {"width": 1024, "height": 1024, "caption": "", "alt_text": "DALL·E 2024-07-03 11.00.24 - A representation of New Roots Herbal as a champion. The image features a large trophy with the New Roots Herbal logo on it, surrounded by vibrant and .webp", "media_id": "ff4767e9-3544-4579-b7d4-bc26cf985dad", "object_key": "uploads/dalle-2024-07-03-11.00.24---a-representation-of-new-roots-herbal-as-a-champion.-the-image-features-a-large-trophy-with-the-new-roots-herbal-logo-on-it-surrounded-by-vibrant-and-_20250528103654.webp"}, "temp_id": "temp-1748446310608-0.9809145486622247", "block_type": "image"}], [{"content": {"level": 1, "textAlign": "center", "textColor": "background", "text_content": "This is awesomesss"}, "temp_id": "temp-1748446320489-0.03579022249796415", "block_type": "heading"}, {"content": {"html_content": "Test"}, "temp_id": "temp-1748461886858-0.7301177113712687", "block_type": "text"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 2}}	4	2025-05-29 15:04:15.716902+00	2025-07-08 16:00:16.487271+00
42	\N	6	2	heading	{"level": 1, "textAlign": "left", "text_content": "New Heading"}	0	2025-06-17 17:11:32.074548+00	2025-06-17 17:11:32.074548+00
43	\N	6	2	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"html_content": "<p>Column 1</p>"}, "block_type": "text"}, {"content": {"level": 1, "textAlign": "left", "text_content": "New Heading"}, "temp_id": "temp-1750180300618-0.3136990522600016", "block_type": "heading"}], [{"content": {"html_content": "<p>Column 2</p>"}, "block_type": "text"}], [{"content": {"html_content": "<p>Column 3</p>"}, "block_type": "text"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 3}}	1	2025-06-17 17:11:43.451256+00	2025-06-17 17:11:55.941537+00
53	24	\N	1	form	{"fields": [{"label": "Name", "temp_id": "field-1751651203005", "field_type": "text", "is_required": true, "placeholder": "Enter your full name"}, {"label": "Email", "temp_id": "field-1751651237567", "field_type": "email", "is_required": true, "placeholder": "Enter your Email"}, {"label": "Comments", "temp_id": "field-1751651321869", "field_type": "textarea", "is_required": true, "placeholder": "Enter your inquiry here"}], "recipient_email": "hosts@newrootsherbal.com", "success_message": "Thank you for your submission!", "submit_button_text": "Submit"}	2	2025-07-04 17:46:47.875399+00	2025-07-17 19:44:25.986132+00
47	23	\N	2	heading	{"level": 1, "textAlign": "center", "textColor": "primary", "text_content": "A propos: On est cool"}	0	2025-07-03 17:29:22.050658+00	2025-07-03 17:29:41.852857+00
50	22	\N	1	heading	{"level": 1, "textAlign": "center", "textColor": "primary", "text_content": "About Us: We are cool"}	0	2025-07-03 17:38:35.692721+00	2025-07-03 17:38:51.299415+00
51	24	\N	1	heading	{"level": 1, "textAlign": "left", "textColor": "primary", "text_content": "Contact us"}	0	2025-07-04 17:45:30.020442+00	2025-07-04 18:39:26.382053+00
52	24	\N	1	text	{"html_content": "<p class=\\"container mx-auto\\">Please fill in the form below</p>"}	1	2025-07-04 17:45:52.507928+00	2025-07-04 18:47:37.289665+00
39	3	\N	1	hero	{"padding": {"top": "xl", "bottom": "xl"}, "background": {"type": "image", "image": {"size": "cover", "overlay": {"type": "gradient", "gradient": {"type": "linear", "stops": [{"color": "rgba(255, 255, 255, 1)", "position": 0}, {"color": "rgba(255, 255, 255, 0)", "position": 100}], "direction": "to right"}}, "media_id": "4bafbe01-d572-4da9-b866-352e2a36578e", "position": "center", "object_key": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_original.avif"}, "min_height": "500px"}, "column_gap": "lg", "column_blocks": [[{"content": {"level": 1, "text_content": "Big Hero Title!"}, "temp_id": "block-1749744115796-1", "block_type": "heading"}, {"content": {"html_content": "<p>Hero description goes here. Explain the value proposition.</p>"}, "temp_id": "block-1749744115796-2", "block_type": "text"}, {"content": {"url": "#", "text": "Call to Action Now!!"}, "temp_id": "block-1749744115796-3", "block_type": "button"}], []], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 1, "desktop": 2}}	0	2025-06-12 16:02:02.451919+00	2025-09-23 19:41:56.58097+00
30	3	\N	1	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "gradient", "gradient": {"type": "linear", "stops": [{"color": "#2a476f", "position": 0}, {"color": "#1f96ad", "position": 100}], "direction": "to right"}}, "column_gap": "md", "column_blocks": [[{"content": {"width": 1080, "height": 1080, "caption": "", "alt_text": "Wild omega", "media_id": "d8f3b7eb-9357-4521-90fc-acc5449d59c0", "object_key": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_original.avif", "blur_data_url": null}, "temp_id": "temp-1748446310608-0.9809145486622247", "block_type": "image"}], [{"content": {"level": 1, "textAlign": "center", "textColor": "background", "text_content": "This is awesomesss"}, "temp_id": "temp-1748446320489-0.03579022249796415", "block_type": "heading"}, {"content": {"html_content": "<style>\\n\\n.card-container {\\ndisplay: grid;\\ngrid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Responsive part */\\ngap: 20px; /* Space between cards */\\n\\n}\\n\\n\\n\\n.card {\\nbackground-color: #fff;\\nborder: 1px solid #ddd;\\nborder-radius: 8px;\\noverflow: hidden; /* Ensures image corners are rounded if image is direct child */\\nbox-shadow: 0 2px 5px rgba(0,0,0,0.1);\\ndisplay: flex;\\nflex-direction: column;\\n\\n}\\n\\n\\n\\n.card img {\\nwidth: 100%;\\nheight: 200px; /* Fixed height for consistency */\\nobject-fit: cover; /* Ensures image covers the area without distortion */\\n\\n}\\n\\n\\n\\n.card-content {\\npadding: 15px;\\nflex-grow: 1; /* Allows content to take available space */\\ndisplay: flex;\\nflex-direction: column;\\n\\n}\\n\\n\\n\\n.card-content h3 {\\nmargin-top: 0;\\ncolor: #333;\\n\\n}\\n\\n\\n\\n.card-content p {\\nfont-size: 0.9em;\\ncolor: #666;\\nflex-grow: 1; /* Pushes button to the bottom */\\nline-height: 1.6;\\n\\n}\\n\\n\\n\\n.card-button {\\ndisplay: inline-block;\\nbackground-color: #007bff;\\ncolor: white;\\npadding: 10px 15px;\\ntext-decoration: none;\\nborder-radius: 5px;\\nmargin-top: 10px; /* Space above the button */\\ntext-align: center;\\ntransition: background-color 0.3s ease;\\n\\n}\\n\\n\\n\\n.card-button:hover {\\nbackground-color: #0056b3;\\n\\n}\\n\\n\\n\\n@media (max-width: 340px) {\\n.card-container {\\ngrid-template-columns: 1fr; /* Stack to single column */\\n}\\n\\n}\\n\\n</style><div class=\\"card-container\\"><div class=\\"card\\"><div class=\\"card-content\\"><h2>Card Title 1</h2><p></p><p>Read More</p></div></div><div class=\\"card\\"><div class=\\"card-content\\"><h2>Card Title 2</h2><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><p>Read More</p></div></div><div class=\\"card\\"><div class=\\"card-content\\"><h2>Card Title 3</h2><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p><p>Read More</p></div></div></div><div></div>\\n\\n<div></div>\\n"}, "temp_id": "temp-1748461886858-0.7301177113712687", "block_type": "text"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 2}}	6	2025-05-28 15:32:09.062105+00	2025-09-25 16:16:43.204423+00
59	\N	5	1	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"html_content": "<p>Column 1</p>"}, "block_type": "text"}], [{"content": {"html_content": "<p>Column 2</p>"}, "block_type": "text"}], [{"content": {"html_content": "<p>Column 3</p>"}, "block_type": "text"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 3}}	3	2025-07-07 13:37:36.056283+00	2025-07-07 14:33:09.0051+00
62	22	\N	1	text	{"html_content": "<p>New text block...This Block Is Awesome!</p>"}	1	2025-07-07 14:35:11.023159+00	2025-07-07 14:35:29.264759+00
65	\N	7	1	heading	{"level": 1, "textAlign": "left", "textColor": "primary", "text_content": "New Heading"}	0	2025-07-22 16:27:06.137827+00	2025-07-22 16:27:14.031764+00
66	\N	8	2	heading	{"level": 1, "textAlign": "left", "text_content": "New Heading FR"}	0	2025-07-22 16:28:22.341506+00	2025-07-22 16:28:28.496887+00
33	3	\N	1	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"level": 1, "textAlign": "center", "textColor": "primary", "text_content": "Something Interesting"}, "temp_id": "temp-1748526644607-0.7296411873874854", "block_type": "heading"}, {"content": {"html_content": "<p>Something interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that <em><u>interesting </u></em>whenSomething interesting said to many times is not that interesting whenSomething interesting said to many times is not that interesting.<br></p><div data-type=\\"danger\\" data-title=\\"Info Alert on this\\" data-message=\\"This test is not getting written?\\n\\" data-align=\\"center\\" data-size=\\"full-width\\" data-text-align=\\"left\\" data-alert-widget=\\"\\"></div><div data-text=\\"Click Here!!!\\" data-url=\\"#\\" data-style=\\"primary\\" data-size=\\"fit-content\\" data-text-align=\\"center\\" data-cta-widget=\\"\\"></div><p></p>"}, "block_type": "text"}, {"content": {"html_content": "<p>New text block...</p><p></p><div data-type=\\"info\\" data-title=\\"Info\\" data-message=\\"New Alert\\" data-align=\\"left\\" data-size=\\"fit-content\\" data-text-align=\\"left\\" data-alert-widget=\\"\\"></div><div></div>"}, "temp_id": "temp-1753373335816-0.33021135552657543", "block_type": "text"}], [{"content": {"width": 1024, "height": 1024, "caption": "", "alt_text": "e0f51f6d-5ab5-4603-ba42-4b8dbcf2c6d2.webp", "media_id": "b214e748-1139-4608-a97e-62ce44edd6e4", "object_key": "uploads/e0f51f6d-5ab5-4603-ba42-4b8dbcf2c6d2_20250529093721.webp"}, "temp_id": "temp-1748525825468-0.5679865408890822", "block_type": "image"}, {"content": {"html_content": "<h1 data-draggable=\\"true\\" style=\\"text-align: center;\\"><mark class=\\"rounded-sm px-1 py-0.5\\" data-color=\\"#D1FAE5\\" style=\\"background-color: rgb(209, 250, 229); color: inherit;\\">Testing</mark></h1><h3 data-draggable=\\"true\\" style=\\"text-align: left;\\">Testing<sup>H3</sup></h3><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p><p data-draggable=\\"true\\" style=\\"text-align: right;\\">testing</p><pre class=\\"relative rounded-md bg-muted p-4 font-mono text-sm\\" data-draggable=\\"true\\"><code class=\\"language-plaintext\\">testing</code></pre><div data-text=\\"Learn more\\" data-url=\\"\\" data-style=\\"primary\\" data-size=\\"medium\\" data-text-align=\\"center\\" data-cta-widget=\\"\\"></div><p data-draggable=\\"true\\" style=\\"text-align: left;\\"><img class=\\"max-w-full h-auto rounded-md\\" data-draggable=\\"true\\" src=\\"https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_original.avif\\" alt=\\"nextblock-logo.png\\" data-lock-aspect=\\"true\\" data-align=\\"center\\" style=\\"width: 38.46%;\\"></p><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p>"}, "temp_id": "temp-1755096482986-0.4914380503781878", "block_type": "text"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 2}}	7	2025-05-29 13:37:29.308281+00	2025-09-25 16:16:43.21115+00
72	3	\N	1	image	{"width": 2560, "height": 1440, "caption": "", "alt_text": "vlcsnap-2023-11-22-10h51m57s416.png", "media_id": "73de5daa-161a-4508-a3fd-0aa049538a12", "object_key": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_original.avif", "blur_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAIAAAB1kpiRAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAxUlEQVR4nAG6AEX/AHJuMZiRPot+QExHCmplI3hwH3xyJEU+IickG2BcIgBqaUd5d1dHRjw6NSQ7NB01KiA4LSIkIwAaFgAsKAUAExUdUFJVNj0/Ul1kWV1ZbXh6SExTOz0cHRsGDAIAAGlyiXB4hHOAkXiHmVhgbJqfqqOnr2ReT2FdaG1lbgCPmKq4wtT0+//s7/m+wMuKkpqVnKvCxteZlqSjm6gAanB6hoqUyszctbjFhoF9SkEwUVJLdnyEhomWsrTBMyxK6oWSkykAAAAASUVORK5CYII="}	3	2025-09-23 19:41:34.105526+00	2025-09-23 19:41:56.582702+00
31	3	\N	1	section	{"padding": {"top": "md", "bottom": "md"}, "background": {"type": "none"}, "column_gap": "md", "column_blocks": [[{"content": {"level": 2, "textAlign": "center", "textColor": "primary", "text_content": "This is sub a title!"}, "temp_id": "temp-1748449263328-0.43594849790087153", "block_type": "heading"}], [{"content": {"html_content": "<p>New Column 2</p>"}, "temp_id": "new-1750176862087-0", "block_type": "text"}], [{"content": {"html_content": "<p>New Column 3</p>"}, "temp_id": "new-1750179380971-0", "block_type": "text"}]], "container_type": "container", "responsive_columns": {"mobile": 1, "tablet": 2, "desktop": 3}}	5	2025-05-28 16:20:56.571064+00	2025-09-25 16:16:43.179032+00
70	3	\N	1	text	{"html_content": "<style>.bold { font-weight: bold; }</style><div class=\\"bold\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\">Wow this is cool</p></div><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p><div class=\\"bold\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"><span style=\\"font-size: 2.5rem; color: hsl(var(--destructive));\\">Something </span>really <sup>cool </sup>in a bold div</p></div><div class=\\"bold\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\">Testing</p></div><h1 data-draggable=\\"true\\" style=\\"text-align: left;\\">This is a <span style=\\"color: rgb(0, 148, 24);\\">title</span></h1><h2 data-draggable=\\"true\\" style=\\"text-align: left;\\"><span style=\\"color: rgb(119, 67, 196);\\">Testing</span></h2><ul class=\\"list-disc pl-4\\" data-draggable=\\"true\\"><li><p data-draggable=\\"true\\" style=\\"text-align: left;\\">Testing</p></li><li><p data-draggable=\\"true\\" style=\\"text-align: left;\\">omg!</p></li></ul><p data-draggable=\\"true\\" style=\\"text-align: left;\\">Something</p><pre class=\\"relative rounded-md bg-muted p-4 font-mono text-sm\\" data-draggable=\\"true\\"><code class=\\"language-plaintext\\">\\n\\nTesting\\n\\n&lt;h1&gt;is is another title&lt;/h1&gt; \\n\\n</code></pre><blockquote data-draggable=\\"true\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\">This is a quote!</p></blockquote><table class=\\"w-full border-collapse border border-gray-300 dark:border-gray-700 my-4\\" style=\\"min-width: 300px;\\"><colgroup><col style=\\"min-width: 100px;\\"><col style=\\"min-width: 100px;\\"><col style=\\"min-width: 100px;\\"></colgroup><tbody><tr class=\\"border-b border-gray-300 dark:border-gray-700\\"><th class=\\"bg-gray-100 dark:bg-gray-800 font-bold p-3 text-left border border-gray-300 dark:border-gray-700\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></th><th class=\\"bg-gray-100 dark:bg-gray-800 font-bold p-3 text-left border border-gray-300 dark:border-gray-700\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></th><th class=\\"bg-gray-100 dark:bg-gray-800 font-bold p-3 text-left border border-gray-300 dark:border-gray-700\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></th></tr><tr class=\\"border-b border-gray-300 dark:border-gray-700\\"><td class=\\"p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></td><td class=\\"p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\">Nice</p></td><td class=\\"p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></td></tr><tr class=\\"border-b border-gray-300 dark:border-gray-700\\"><td class=\\"p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></td><td class=\\"p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></td><td class=\\"p-3 border border-gray-300 dark:border-gray-700 min-w-[100px]\\" colspan=\\"1\\" rowspan=\\"1\\"><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p></td></tr></tbody></table><p data-draggable=\\"true\\" style=\\"text-align: left;\\"></p>"}	2	2025-08-15 15:49:00.235932+00	2025-09-30 19:47:08.065726+00
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.languages (id, code, name, is_default, created_at, updated_at, is_active) FROM stdin;
1	en	English	t	2025-05-14 14:30:56.461662+00	2025-05-14 14:30:56.461662+00	t
2	fr	Français	f	2025-05-14 14:30:56.461662+00	2025-05-14 14:30:56.461662+00	t
\.


--
-- Data for Name: logos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logos (id, created_at, name, media_id) FROM stdin;
f658274c-eb70-4199-9c77-240a8c2a7b57	2025-06-19 16:46:23.213084+00	New Roots Herbal	ff3d2eb0-a3b0-475f-b855-2a1f6b4d6931
e21ba9fe-4095-449c-afd2-24d77efe7615	2025-06-19 15:08:36.656604+00	New Roots Herbal	\N
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media (id, uploader_id, file_name, object_key, file_type, size_bytes, description, created_at, updated_at, width, height, blur_data_url, variants, file_path) FROM stdin;
2ee9170c-9f10-494f-a33e-79f573d96a2a	\N	signature.jpg	uploads/signature_20250526111554.jpg	image/jpeg	27937	\N	2025-05-26 15:16:26.272731+00	2025-07-17 16:55:21.642852+00	384	96	\N	\N	\N
19752134-1dbe-4475-9ce3-103730029c65	\N	0KJJiCZvD1lr5OUrS359wZBCilteEuJ7.webp	uploads/0kjjiczvd1lr5ours359wzbcilteeuj7_20250526162442.webp	image/webp	133358	\N	2025-05-26 20:25:14.776241+00	2025-07-17 16:55:21.642852+00	2000	600	\N	\N	\N
cc6bc30c-0ebc-4d19-bef9-2d5a6936c180	\N	0pO7s4XqEjsIbJo7OMwDqxcOqZ78W190.webp	uploads/0po7s4xqejsibjo7omwdqxcoqz78w190_20250526162504.webp	image/webp	34248	\N	2025-05-26 20:25:36.173219+00	2025-07-17 16:55:21.642852+00	2000	600	\N	\N	\N
b350eed1-adb6-4c8c-a1be-341e866f34d7	\N	0KJJiCZvD1lr5OUrS359wZBCilteEuJ7.webp	uploads/0kjjiczvd1lr5ours359wzbcilteeuj7_20250527085100.webp	image/webp	133358	\N	2025-05-27 12:51:33.521431+00	2025-07-17 16:55:21.642852+00	2000	600	\N	\N	\N
ff4767e9-3544-4579-b7d4-bc26cf985dad	\N	DALL·E 2024-07-03 11.00.24 - A representation of New Roots Herbal as a champion. The image features a large trophy with the New Roots Herbal logo on it, surrounded by vibrant and .webp	uploads/dalle-2024-07-03-11.00.24---a-representation-of-new-roots-herbal-as-a-champion.-the-image-features-a-large-trophy-with-the-new-roots-herbal-logo-on-it-surrounded-by-vibrant-and-_20250528103654.webp	image/webp	499302	\N	2025-05-28 14:37:28.489449+00	2025-07-17 16:55:21.642852+00	1024	1024	\N	\N	\N
b214e748-1139-4608-a97e-62ce44edd6e4	\N	e0f51f6d-5ab5-4603-ba42-4b8dbcf2c6d2.webp	uploads/e0f51f6d-5ab5-4603-ba42-4b8dbcf2c6d2_20250529093721.webp	image/webp	415656	\N	2025-05-29 13:37:57.044539+00	2025-07-17 16:55:21.642852+00	1024	1024	\N	\N	\N
ef642f5b-9391-4ea7-b72e-5c357edcc1a2	\N	nextblock-logo.png	uploads/nextblock-logo_20250604160247_original.avif	image/avif	39591	\N	2025-06-04 20:03:38.819023+00	2025-07-17 16:55:21.642852+00	1162	1164	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247.png", "width": 1162, "height": 1164, "fileType": "image/png", "objectKey": "uploads/nextblock-logo_20250604160247.png", "sizeBytes": 111242, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_xlarge_avif.avif", "width": 1162, "height": 1164, "fileType": "image/avif", "objectKey": "uploads/nextblock-logo_20250604160247_xlarge_avif.avif", "sizeBytes": 36836, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_large_avif.avif", "width": 1162, "height": 1164, "fileType": "image/avif", "objectKey": "uploads/nextblock-logo_20250604160247_large_avif.avif", "sizeBytes": 36836, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_medium_avif.avif", "width": 768, "height": 769, "fileType": "image/avif", "objectKey": "uploads/nextblock-logo_20250604160247_medium_avif.avif", "sizeBytes": 63228, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_small_avif.avif", "width": 384, "height": 385, "fileType": "image/avif", "objectKey": "uploads/nextblock-logo_20250604160247_small_avif.avif", "sizeBytes": 30711, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_thumbnail_avif.avif", "width": 128, "height": 128, "fileType": "image/avif", "objectKey": "uploads/nextblock-logo_20250604160247_thumbnail_avif.avif", "sizeBytes": 8528, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nextblock-logo_20250604160247_original.avif", "width": 1162, "height": 1164, "fileType": "image/avif", "objectKey": "uploads/nextblock-logo_20250604160247_original.avif", "sizeBytes": 39591, "variantLabel": "original_avif"}]	\N
4bafbe01-d572-4da9-b866-352e2a36578e	\N	NRH-Hero-Image_7eb676be-02dd-4305-94b8-ac84c7391b28.jpg	uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_original.avif	image/avif	466614	\N	2025-06-13 19:19:33.612814+00	2025-07-17 16:55:21.642852+00	1920	1080	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919.jpg", "width": 1920, "height": 1080, "fileType": "image/jpeg", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919.jpg", "sizeBytes": 645806, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_xlarge_avif.avif", "width": 1920, "height": 1080, "fileType": "image/avif", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_xlarge_avif.avif", "sizeBytes": 415800, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_large_avif.avif", "width": 1280, "height": 720, "fileType": "image/avif", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_large_avif.avif", "sizeBytes": 203418, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_medium_avif.avif", "width": 768, "height": 432, "fileType": "image/avif", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_medium_avif.avif", "sizeBytes": 78472, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_small_avif.avif", "width": 384, "height": 216, "fileType": "image/avif", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_small_avif.avif", "sizeBytes": 22323, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_thumbnail_avif.avif", "width": 128, "height": 72, "fileType": "image/avif", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_thumbnail_avif.avif", "sizeBytes": 4147, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_original.avif", "width": 1920, "height": 1080, "fileType": "image/avif", "objectKey": "uploads/nrh-hero-image_7eb676be-02dd-4305-94b8-ac84c7391b28_20250613151919_original.avif", "sizeBytes": 466614, "variantLabel": "original_avif"}]	\N
5653f1d8-ad88-49b1-9dbf-76f071239461	\N	thumbnail.png	uploads/thumbnail_20250602111104_original.avif	image/avif	28734	\N	2025-06-02 15:11:50.560958+00	2025-07-17 16:55:21.642852+00	2560	1920	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAA7klEQVR4nGPg5eXV1NT08fHJzs6uqKgoLy9PTU318fHR1NTk5eVlkJSUdHF1TU9L62xvX758xcqVa/t6+7Kzsx0cHCQlJRk0NTVDgoNnz5178fqNt2+ePX1+9uy5M93d3RERESoqKgzaWlrZeXn6ykpuKroenrI2AQyePiazZ8+Pi4vV19dnUFVVzczKUpCQ9DazMtJXEeRg4ONg6OnpjYiI0NTUZJCTk3Nzc2tubl6+du3Va9evXLm1c/fu8vJyHx8fOTk5BgyXl4Jd7gt1OS8vr4iIiKampoODQ1BQkI+Pj4ODg6ampoiICC8vLwBhbU+CWtgjVQAAAABJRU5ErkJggg==	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104.png", "width": 2880, "height": 2160, "fileType": "image/png", "objectKey": "uploads/thumbnail_20250602111104.png", "sizeBytes": 542899, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104_xlarge_avif.avif", "width": 1920, "height": 1440, "fileType": "image/avif", "objectKey": "uploads/thumbnail_20250602111104_xlarge_avif.avif", "sizeBytes": 15215, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104_large_avif.avif", "width": 1280, "height": 960, "fileType": "image/avif", "objectKey": "uploads/thumbnail_20250602111104_large_avif.avif", "sizeBytes": 10147, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104_medium_avif.avif", "width": 768, "height": 576, "fileType": "image/avif", "objectKey": "uploads/thumbnail_20250602111104_medium_avif.avif", "sizeBytes": 6369, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104_small_avif.avif", "width": 384, "height": 288, "fileType": "image/avif", "objectKey": "uploads/thumbnail_20250602111104_small_avif.avif", "sizeBytes": 3188, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104_thumbnail_avif.avif", "width": 128, "height": 96, "fileType": "image/avif", "objectKey": "uploads/thumbnail_20250602111104_thumbnail_avif.avif", "sizeBytes": 1005, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/thumbnail_20250602111104_original.avif", "width": 2880, "height": 2160, "fileType": "image/avif", "objectKey": "uploads/thumbnail_20250602111104_original.avif", "sizeBytes": 28734, "variantLabel": "original_avif"}]	\N
7171818b-7a7d-4ce4-8dcb-496a919c6a29	\N	0890 NRH - Prostate Perform 60s EN (Bottle).webp	uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_original.avif	image/avif	365092	\N	2025-06-02 15:13:20.679857+00	2025-07-17 16:55:21.642852+00	2560	2560	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAACXBIWXMAAAPoAAAD6AG1e1JrAAABI0lEQVR4nGXQy07CQBQG4AomJr6UT8BT6FO48TGMRsVuu9GwwIULV4YA4iWkLRaRttAbbbFlaIWe2t8UuZiwmMXJfPnnP8MB2OE4jqtWlT3Xm7xFMWHCZjDNsVKpPO3ndwuzgoIgFB0neKYfgFLAMLzXg5OH3TUUBBTzods1jkZuiGmUZPkxrS+02/rhKiTXhXzwfeKzOWBrjEw1JJoBhvV9vUwsrKGqR3wYxKg1Wmmt2Ux9L4akBOUt2NMZDwCqJlKnJ+dVIb2Pr7bgh8r4LAMk8Zha4jlRAkiye/HXEZuOqs7KcRBDbtyQ/HhHnjdHpzM++w8XW9tOfDllgHJ7T436C4E5GKjT0+XTm0RNs0qDkaeb9jDp21Zq9j8NRR6WVt/zC6ztBtAorBrEAAAAAElFTkSuQmCC	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225.webp", "width": 3000, "height": 3000, "fileType": "image/webp", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225.webp", "sizeBytes": 966598, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_xlarge_avif.avif", "width": 1920, "height": 1920, "fileType": "image/avif", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_xlarge_avif.avif", "sizeBytes": 80188, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_large_avif.avif", "width": 1280, "height": 1280, "fileType": "image/avif", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_large_avif.avif", "sizeBytes": 44204, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_medium_avif.avif", "width": 768, "height": 768, "fileType": "image/avif", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_medium_avif.avif", "sizeBytes": 23049, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_small_avif.avif", "width": 384, "height": 384, "fileType": "image/avif", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_small_avif.avif", "sizeBytes": 10389, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_thumbnail_avif.avif", "width": 128, "height": 128, "fileType": "image/avif", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_thumbnail_avif.avif", "sizeBytes": 2887, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_original.avif", "width": 3000, "height": 3000, "fileType": "image/avif", "objectKey": "uploads/0890-nrh---prostate-perform-60s-en-bottle_20250602111225_original.avif", "sizeBytes": 365092, "variantLabel": "original_avif"}]	\N
73de5daa-161a-4508-a3fd-0aa049538a12	\N	vlcsnap-2023-11-22-10h51m57s416.png	uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_original.avif	image/avif	917219	\N	2025-06-12 16:34:31.343318+00	2025-07-17 16:55:21.642852+00	2560	1440	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAIAAAB1kpiRAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAxUlEQVR4nAG6AEX/AHJuMZiRPot+QExHCmplI3hwH3xyJEU+IickG2BcIgBqaUd5d1dHRjw6NSQ7NB01KiA4LSIkIwAaFgAsKAUAExUdUFJVNj0/Ul1kWV1ZbXh6SExTOz0cHRsGDAIAAGlyiXB4hHOAkXiHmVhgbJqfqqOnr2ReT2FdaG1lbgCPmKq4wtT0+//s7/m+wMuKkpqVnKvCxteZlqSjm6gAanB6hoqUyszctbjFhoF9SkEwUVJLdnyEhomWsrTBMyxK6oWSkykAAAAASUVORK5CYII=	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413.png", "width": 3840, "height": 2160, "fileType": "image/png", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413.png", "sizeBytes": 8497846, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_xlarge_avif.avif", "width": 1920, "height": 1080, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_xlarge_avif.avif", "sizeBytes": 380598, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_large_avif.avif", "width": 1280, "height": 720, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_large_avif.avif", "sizeBytes": 240743, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_medium_avif.avif", "width": 768, "height": 432, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_medium_avif.avif", "sizeBytes": 117756, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_small_avif.avif", "width": 384, "height": 216, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_small_avif.avif", "sizeBytes": 38309, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_thumbnail_avif.avif", "width": 128, "height": 72, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_thumbnail_avif.avif", "sizeBytes": 5477, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_original.avif", "width": 3840, "height": 2160, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-11-22-10h51m57s416_20250612123413_original.avif", "sizeBytes": 917219, "variantLabel": "original_avif"}]	\N
6fa3f17b-4da6-4dc3-8beb-5d27eb75a11b	\N	Trans-Logo.webp	uploads/trans-logo_20250619101336_original.avif	image/avif	37246	\N	2025-06-19 14:13:58.521986+00	2025-07-17 16:55:21.642852+00	800	735	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336.webp", "width": 800, "height": 735, "fileType": "image/webp", "objectKey": "uploads/trans-logo_20250619101336.webp", "sizeBytes": 81914, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336_xlarge_avif.avif", "width": 800, "height": 735, "fileType": "image/avif", "objectKey": "uploads/trans-logo_20250619101336_xlarge_avif.avif", "sizeBytes": 32416, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336_large_avif.avif", "width": 800, "height": 735, "fileType": "image/avif", "objectKey": "uploads/trans-logo_20250619101336_large_avif.avif", "sizeBytes": 32416, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336_medium_avif.avif", "width": 768, "height": 706, "fileType": "image/avif", "objectKey": "uploads/trans-logo_20250619101336_medium_avif.avif", "sizeBytes": 29381, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336_small_avif.avif", "width": 384, "height": 353, "fileType": "image/avif", "objectKey": "uploads/trans-logo_20250619101336_small_avif.avif", "sizeBytes": 16693, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336_thumbnail_avif.avif", "width": 128, "height": 118, "fileType": "image/avif", "objectKey": "uploads/trans-logo_20250619101336_thumbnail_avif.avif", "sizeBytes": 5707, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/trans-logo_20250619101336_original.avif", "width": 800, "height": 735, "fileType": "image/avif", "objectKey": "uploads/trans-logo_20250619101336_original.avif", "sizeBytes": 37246, "variantLabel": "original_avif"}]	\N
ff3d2eb0-a3b0-475f-b855-2a1f6b4d6931	\N	NRH40EN.webp	uploads/nrh40en_20250619113558_original.avif	image/avif	28756	\N	2025-06-19 15:36:11.394145+00	2025-07-17 16:55:21.642852+00	1000	371	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558.webp", "width": 1000, "height": 371, "fileType": "image/webp", "objectKey": "uploads/nrh40en_20250619113558.webp", "sizeBytes": 25692, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558_xlarge_avif.avif", "width": 1000, "height": 371, "fileType": "image/avif", "objectKey": "uploads/nrh40en_20250619113558_xlarge_avif.avif", "sizeBytes": 26122, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558_large_avif.avif", "width": 1000, "height": 371, "fileType": "image/avif", "objectKey": "uploads/nrh40en_20250619113558_large_avif.avif", "sizeBytes": 26122, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558_medium_avif.avif", "width": 768, "height": 285, "fileType": "image/avif", "objectKey": "uploads/nrh40en_20250619113558_medium_avif.avif", "sizeBytes": 24107, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558_small_avif.avif", "width": 384, "height": 142, "fileType": "image/avif", "objectKey": "uploads/nrh40en_20250619113558_small_avif.avif", "sizeBytes": 14036, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558_thumbnail_avif.avif", "width": 128, "height": 47, "fileType": "image/avif", "objectKey": "uploads/nrh40en_20250619113558_thumbnail_avif.avif", "sizeBytes": 4264, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrh40en_20250619113558_original.avif", "width": 1000, "height": 371, "fileType": "image/avif", "objectKey": "uploads/nrh40en_20250619113558_original.avif", "sizeBytes": 28756, "variantLabel": "original_avif"}]	uploads/nrh40en_20250619113558_original.avif
2b096745-1b95-44aa-8f23-daba1f5d0ef1	\N	nrhchamps.jpg	uploads/nrhchamps_20250619113723_original.avif	image/avif	340693	\N	2025-06-19 15:37:40.838656+00	2025-07-17 16:55:21.642852+00	1024	1024	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723.jpg", "width": 1024, "height": 1024, "fileType": "image/jpeg", "objectKey": "uploads/nrhchamps_20250619113723.jpg", "sizeBytes": 453418, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723_xlarge_avif.avif", "width": 1024, "height": 1024, "fileType": "image/avif", "objectKey": "uploads/nrhchamps_20250619113723_xlarge_avif.avif", "sizeBytes": 304735, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723_large_avif.avif", "width": 1024, "height": 1024, "fileType": "image/avif", "objectKey": "uploads/nrhchamps_20250619113723_large_avif.avif", "sizeBytes": 304735, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723_medium_avif.avif", "width": 768, "height": 768, "fileType": "image/avif", "objectKey": "uploads/nrhchamps_20250619113723_medium_avif.avif", "sizeBytes": 204342, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723_small_avif.avif", "width": 384, "height": 384, "fileType": "image/avif", "objectKey": "uploads/nrhchamps_20250619113723_small_avif.avif", "sizeBytes": 73986, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723_thumbnail_avif.avif", "width": 128, "height": 128, "fileType": "image/avif", "objectKey": "uploads/nrhchamps_20250619113723_thumbnail_avif.avif", "sizeBytes": 12381, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/nrhchamps_20250619113723_original.avif", "width": 1024, "height": 1024, "fileType": "image/avif", "objectKey": "uploads/nrhchamps_20250619113723_original.avif", "sizeBytes": 340693, "variantLabel": "original_avif"}]	uploads/nrhchamps_20250619113723_original.avif
d8f3b7eb-9357-4521-90fc-acc5449d59c0	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	vlcsnap-2023-01-11-10h44m50s203.png	uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_original.avif	image/avif	118619	\N	2025-07-22 17:20:04.111146+00	2025-07-22 17:20:04.111146+00	1080	1080	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944.png", "width": 1080, "height": 1080, "fileType": "image/png", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944.png", "sizeBytes": 1202455, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_xlarge_avif.avif", "width": 1080, "height": 1080, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_xlarge_avif.avif", "sizeBytes": 96769, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_large_avif.avif", "width": 1080, "height": 1080, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_large_avif.avif", "sizeBytes": 96769, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_medium_avif.avif", "width": 768, "height": 768, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_medium_avif.avif", "sizeBytes": 54897, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_small_avif.avif", "width": 384, "height": 384, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_small_avif.avif", "sizeBytes": 19586, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_thumbnail_avif.avif", "width": 128, "height": 128, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_thumbnail_avif.avif", "sizeBytes": 3716, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_original.avif", "width": 1080, "height": 1080, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_original.avif", "sizeBytes": 118619, "variantLabel": "original_avif"}]	uploads/vlcsnap-2023-01-11-10h44m50s203_20250722131944_original.avif
0c386292-8d02-4acc-a259-a10a722cfafd	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	vlcsnap-2023-01-20-13h28m36s926.png	uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_original.avif	image/avif	15771	GPS Probiotics	2025-07-22 16:26:45.713189+00	2025-07-28 18:59:01.714628+00	1280	720	\N	[{"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625.png", "width": 1280, "height": 720, "fileType": "image/png", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625.png", "sizeBytes": 178156, "variantLabel": "original_uploaded"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_xlarge_avif.avif", "width": 1280, "height": 720, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_xlarge_avif.avif", "sizeBytes": 13466, "variantLabel": "xlarge_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_large_avif.avif", "width": 1280, "height": 720, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_large_avif.avif", "sizeBytes": 13466, "variantLabel": "large_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_medium_avif.avif", "width": 768, "height": 432, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_medium_avif.avif", "sizeBytes": 8123, "variantLabel": "medium_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_small_avif.avif", "width": 384, "height": 216, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_small_avif.avif", "sizeBytes": 4222, "variantLabel": "small_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_thumbnail_avif.avif", "width": 128, "height": 72, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_thumbnail_avif.avif", "sizeBytes": 1261, "variantLabel": "thumbnail_avif"}, {"url": "https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_original.avif", "width": 1280, "height": 720, "fileType": "image/avif", "objectKey": "uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_original.avif", "sizeBytes": 15771, "variantLabel": "original_avif"}]	uploads/vlcsnap-2023-01-20-13h28m36s926_20250722122625_original.avif
\.


--
-- Data for Name: navigation_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.navigation_items (id, language_id, menu_key, label, url, parent_id, "order", page_id, created_at, updated_at, translation_group_id) FROM stdin;
13	2	FOOTER	New Roots Herbal	https://newrootsherbal.com/fr	\N	1	\N	2025-05-23 17:01:22.232995+00	2025-05-23 17:01:44.287589+00	de031783-a5cb-4b2e-8fb4-6e265a44155c
33	2	FOOTER	Nous Joindre	/contact-us	\N	0	25	2025-07-07 13:01:16.970873+00	2025-07-07 13:01:55.526177+00	0df1e245-f922-43f2-b787-d44741e40e2f
28	1	FOOTER	About Us	/about-us	\N	0	22	2025-07-03 17:40:40.389276+00	2025-08-08 13:15:09.965946+00	6267b498-8c60-431d-bfa6-9ed949fd8fe6
10	1	HEADER	Home	/	\N	0	3	2025-05-21 14:43:10.491924+00	2025-07-03 17:40:13.978544+00	686fd3e7-1cbb-419c-8e0b-e61152165ea7
14	1	HEADER	Blog	/blog	\N	1	5	2025-05-23 17:50:21.734786+00	2025-07-03 17:40:14.040403+00	706e089c-1d18-4467-8509-2fa23923839e
26	1	HEADER	About Us	/about-us	\N	2	22	2025-07-03 17:39:06.235356+00	2025-07-03 17:40:14.096519+00	35f6058d-cf14-4656-93ba-6bb6482dfc38
32	1	FOOTER	Contact Us	/contact-us	\N	1	24	2025-07-07 13:01:16.722448+00	2025-08-08 13:15:10.030576+00	0df1e245-f922-43f2-b787-d44741e40e2f
11	2	HEADER	Accueil	/	\N	0	4	2025-05-21 14:43:10.491924+00	2025-07-03 17:40:20.78354+00	686fd3e7-1cbb-419c-8e0b-e61152165ea7
15	2	HEADER	Blogue	/blogue	\N	1	6	2025-05-23 17:50:21.861007+00	2025-07-03 17:40:20.854204+00	706e089c-1d18-4467-8509-2fa23923839e
27	2	HEADER	A propos	/a-propos	\N	2	23	2025-07-03 17:39:06.474472+00	2025-07-03 17:40:20.906798+00	35f6058d-cf14-4656-93ba-6bb6482dfc38
29	2	FOOTER	A propos	/a-propos	\N	0	23	2025-07-03 17:40:40.628653+00	2025-07-03 17:41:06.122889+00	6267b498-8c60-431d-bfa6-9ed949fd8fe6
30	1	HEADER	Contact Us	/contact-us	26	0	24	2025-07-04 14:33:01.461093+00	2025-07-04 14:33:01.461093+00	344b60e1-9b35-4e43-a0c3-bc4d4595f947
31	2	HEADER	Nous Joindre	/nous-joindre	27	0	25	2025-07-04 14:33:01.755172+00	2025-07-04 14:33:30.129032+00	344b60e1-9b35-4e43-a0c3-bc4d4595f947
12	1	FOOTER	New Roots Herbal	https://newrootsherbal.com/	\N	2	\N	2025-05-23 17:01:22.011432+00	2025-08-08 13:15:10.101417+00	de031783-a5cb-4b2e-8fb4-6e265a44155c
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pages (id, language_id, author_id, title, slug, status, meta_title, meta_description, created_at, updated_at, translation_group_id) FROM stdin;
4	2	\N	Accueil	accueil	published	Page d'accueil	Ceci est la page d'accueil.	2025-05-21 14:43:10.491924+00	2025-07-17 16:55:21.642852+00	902b78c3-7270-4a8b-8466-3d6294f19351
3	1	\N	Home	home	published	Homepage	This is the homepage.	2025-05-21 14:43:10.491924+00	2025-07-17 16:55:21.642852+00	902b78c3-7270-4a8b-8466-3d6294f19351
5	1	\N	Blog	blog	published	Blog	Blog posts	2025-05-23 17:41:10.23302+00	2025-07-17 16:55:21.642852+00	c0b93c55-4ead-42e9-a8a0-4a51d703de97
6	2	\N	Blogue	blogue	published	Blogue	Articles de blogue	2025-05-23 17:41:10.371848+00	2025-07-17 16:55:21.642852+00	c0b93c55-4ead-42e9-a8a0-4a51d703de97
22	1	\N	About Us	about-us	published	About Us	\N	2025-07-03 17:11:40.609609+00	2025-07-17 16:55:21.642852+00	9fece45e-2ae1-43ae-b1b1-a5d5db659b10
23	2	\N	A propos	a-propos	published	\N	\N	2025-07-03 17:27:15.766436+00	2025-07-17 16:55:21.642852+00	9fece45e-2ae1-43ae-b1b1-a5d5db659b10
24	1	\N	Contact Us	contact-us	published	\N	\N	2025-07-04 14:17:34.500236+00	2025-07-17 16:55:21.642852+00	a094ff1c-4956-42f0-9616-eb28dadf10d8
25	2	\N	Nous Joindre	nous-joindre	published	\N	\N	2025-07-04 14:17:57.994834+00	2025-07-17 16:55:21.642852+00	a094ff1c-4956-42f0-9616-eb28dadf10d8
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, language_id, author_id, title, slug, excerpt, status, published_at, meta_title, meta_description, created_at, updated_at, translation_group_id, feature_image_id) FROM stdin;
2	2	\N	Nouveau Post	nouveau-post	Placeholder for FR translation. Original excerpt: oh yes its working	published	2025-05-21 12:58:00+00	Nouveau	blog fr	2025-05-21 12:58:35.794324+00	2025-07-17 16:55:21.642852+00	002bd1e8-6594-4ed8-b2e4-2a3576856f4a	\N
1	1	\N	New Post	new-post	oh yes its working	published	2025-05-21 12:57:00+00	New Post	Testin for posts	2025-05-21 12:58:35.622789+00	2025-07-17 16:55:21.642852+00	002bd1e8-6594-4ed8-b2e4-2a3576856f4a	cc6bc30c-0ebc-4d19-bef9-2d5a6936c180
3	1	\N	First Post	first-post	This is the first cool post	published	2025-05-23 19:23:00+00	First Post	Blog post #1	2025-05-23 19:34:46.238064+00	2025-07-17 16:55:21.642852+00	76e278eb-5c1c-4f78-85b1-adb8ed0a4f75	b350eed1-adb6-4c8c-a1be-341e866f34d7
4	2	\N	[FR] First Post	first-post-fr-021081	Placeholder for FR translation. Original excerpt: This is the first cool post	published	\N	\N	\N	2025-05-23 19:34:46.386438+00	2025-07-17 16:55:21.642852+00	76e278eb-5c1c-4f78-85b1-adb8ed0a4f75	\N
5	1	\N	thrid post	thrid-post	yup	published	2025-05-29 14:17:00+00	\N	\N	2025-05-29 14:18:52.768271+00	2025-07-17 16:55:21.642852+00	a1be4f83-2db5-456b-8d21-c302ca15ad28	b214e748-1139-4608-a97e-62ce44edd6e4
6	2	\N	Troisieme post	troisieme-post	Placeholder for FR translation. Original excerpt: yup	published	\N	\N	\N	2025-05-29 14:18:52.944875+00	2025-07-17 16:55:21.642852+00	a1be4f83-2db5-456b-8d21-c302ca15ad28	\N
7	1	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	Something Cool	something-cool	cool	published	2025-07-21 16:27:00+00	cool	something cool	2025-07-22 16:26:48.783737+00	2025-07-22 16:27:25.166054+00	44e22069-ee51-4c9e-b4d0-99f1c977979f	0c386292-8d02-4acc-a259-a10a722cfafd
8	2	3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	Quelque chose de cool	quelque-chose-de-cool	Placeholder for FR translation. Original excerpt: cool	published	2025-07-21 16:27:00+00	cool fr	\N	2025-07-22 16:26:48.989499+00	2025-07-22 16:28:13.695475+00	44e22069-ee51-4c9e-b4d0-99f1c977979f	0c386292-8d02-4acc-a259-a10a722cfafd
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, updated_at, username, full_name, avatar_url, website, role) FROM stdin;
4a3504ea-ee60-4a3a-8155-c3954e28a170	\N	Demo	Demo	\N	\N	WRITER
3c9e1bf2-ba6d-4a4e-90b4-f74fd8e5b5c0	\N	NickWriter	NickWriter	\N	\N	USER
3a87caa1-8bd1-40d5-9328-7e1a7c4a31d1	2025-07-17 16:57:22+00	Administrator	Nicolas Desjardins	\N	https://newrootsherbal.com	ADMIN
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_settings (key, value) FROM stdin;
footer_copyright	{"en": "© {year} My Ultra-Fast CMS. All rights reserved.", "fr": "© {year} Mon CMS ultra-rapide. Tous droits réservés."}
\.


--
-- Data for Name: translations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.translations (key, translations, created_at, updated_at) FROM stdin;
already_have_account	{"en": "Already have an account?", "fr": "Vous avez déjà un compte ?"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:11:09.580879+00
dont_have_account	{"en": "Don't have an account?", "fr": "Vous n'avez pas de compte ?"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:11:59.309766+00
email	{"en": "Email", "fr": "Courriel"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:12:00.286953+00
forgot_password	{"en": "Forgot Password?", "fr": "Mot de passe oublié ?"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:12:01.632977+00
password	{"en": "Password", "fr": "Mot de passe"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:12:46.852156+00
reset_password	{"en": "Reset Password", "fr": "Réinitialiser le mot de passe"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:13:12.80728+00
signing_in_pending	{"en": "Signing In...", "fr": "Connexion..."}	2025-07-08 13:35:26.052011+00	2025-07-08 15:13:36.827179+00
sign_out	{"en": "Sign out", "fr": "Se déconnecter"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:13:54.008241+00
sign_in	{"en": "Sign in", "fr": "Se connecter"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:14:31.259703+00
sign_up	{"en": "Sign up", "fr": "Créer un compte"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:14:39.883488+00
you_at_example_com	{"en": "you@example.com", "fr": "vous@exemple.com"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:15:08.783079+00
your_password	{"en": "Your password", "fr": "Votre mot de passe"}	2025-07-08 13:35:26.052011+00	2025-07-08 15:15:20.332285+00
cms_dashboard	{"en": "CMS Dashboard", "fr": "Tableau de bord CMS"}	2025-07-08 15:25:49.660537+00	2025-07-08 15:27:16.136758+00
edit_page	{"en": "Edit Page", "fr": "Modifier la page"}	2025-07-08 15:25:49.660537+00	2025-07-08 15:27:25.91593+00
edit_post	{"en": "Edit Post", "fr": "Modifier l'article"}	2025-07-08 15:25:49.660537+00	2025-07-08 15:27:44.386967+00
greeting	{"en": "Hey, {username}!", "fr": "Bienvenue, {username}!"}	2025-07-08 15:25:49.660537+00	2025-07-08 15:28:01.848457+00
mobile_navigation_menu	{"en": "Mobile navigation menu", "fr": "Menu de navigation mobile"}	2025-07-08 15:25:49.660537+00	2025-07-08 15:28:10.375443+00
open_main_menu	{"en": "Open main menu", "fr": "Ouvrir le menu principal"}	2025-07-08 15:25:49.660537+00	2025-07-08 15:28:17.245065+00
update_env_file_warning	{"en": "Please update .env.local file with anon key and url", "fr": "Veuillez mettre à jour le fichier .env.local avec la clé et l'url anonymes."}	2025-07-08 15:25:49.660537+00	2025-07-08 15:28:26.914807+00
signing_up_pending	{"en": "Signing up...", "fr": "Inscription..."}	2025-07-08 13:35:26.052011+00	2025-07-08 15:32:35.615869+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2025-05-13 18:57:50
20211116045059	2025-05-13 18:57:54
20211116050929	2025-05-13 18:57:56
20211116051442	2025-05-13 18:57:58
20211116212300	2025-05-13 18:58:01
20211116213355	2025-05-13 18:58:03
20211116213934	2025-05-13 18:58:06
20211116214523	2025-05-13 18:58:09
20211122062447	2025-05-13 18:58:11
20211124070109	2025-05-13 18:58:13
20211202204204	2025-05-13 18:58:16
20211202204605	2025-05-13 18:58:18
20211210212804	2025-05-13 18:58:25
20211228014915	2025-05-13 18:58:27
20220107221237	2025-05-13 18:58:30
20220228202821	2025-05-13 18:58:32
20220312004840	2025-05-13 18:58:34
20220603231003	2025-05-13 18:58:38
20220603232444	2025-05-13 18:58:40
20220615214548	2025-05-13 18:58:43
20220712093339	2025-05-13 18:58:45
20220908172859	2025-05-13 18:58:47
20220916233421	2025-05-13 18:58:49
20230119133233	2025-05-13 18:58:52
20230128025114	2025-05-13 18:58:55
20230128025212	2025-05-13 18:58:57
20230227211149	2025-05-13 18:58:59
20230228184745	2025-05-13 18:59:02
20230308225145	2025-05-13 18:59:04
20230328144023	2025-05-13 18:59:06
20231018144023	2025-05-13 18:59:09
20231204144023	2025-05-13 18:59:13
20231204144024	2025-05-13 18:59:15
20231204144025	2025-05-13 18:59:17
20240108234812	2025-05-13 18:59:19
20240109165339	2025-05-13 18:59:22
20240227174441	2025-05-13 18:59:26
20240311171622	2025-05-13 18:59:29
20240321100241	2025-05-13 18:59:34
20240401105812	2025-05-13 18:59:40
20240418121054	2025-05-13 18:59:43
20240523004032	2025-05-13 18:59:51
20240618124746	2025-05-13 18:59:54
20240801235015	2025-05-13 18:59:56
20240805133720	2025-05-13 18:59:58
20240827160934	2025-05-13 19:00:00
20240919163303	2025-05-13 19:00:04
20240919163305	2025-05-13 19:00:06
20241019105805	2025-05-13 19:00:08
20241030150047	2025-05-13 19:00:17
20241108114728	2025-05-13 19:00:20
20241121104152	2025-05-13 19:00:22
20241130184212	2025-05-13 19:00:25
20241220035512	2025-05-13 19:00:27
20241220123912	2025-05-13 19:00:29
20241224161212	2025-05-13 19:00:32
20250107150512	2025-05-13 19:00:34
20250110162412	2025-05-13 19:00:36
20250123174212	2025-05-13 19:00:38
20250128220012	2025-05-13 19:00:41
20250506224012	2025-05-22 14:27:43
20250523164012	2025-06-05 17:32:38
20250714121412	2025-08-27 13:13:31
20250905041441	2025-10-01 13:16:53
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2025-05-13 18:57:48.533803
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2025-05-13 18:57:48.537452
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2025-05-13 18:57:48.541386
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2025-05-13 18:57:48.562171
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2025-05-13 18:57:48.589032
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2025-05-13 18:57:48.594424
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2025-05-13 18:57:48.600206
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2025-05-13 18:57:48.606339
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2025-05-13 18:57:48.609434
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2025-05-13 18:57:48.613977
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2025-05-13 18:57:48.618891
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2025-05-13 18:57:48.623019
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2025-05-13 18:57:48.629306
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2025-05-13 18:57:48.632809
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2025-05-13 18:57:48.639743
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2025-05-13 18:57:48.674992
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2025-05-13 18:57:48.681855
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2025-05-13 18:57:48.694132
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2025-05-13 18:57:48.699813
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2025-05-13 18:57:48.710299
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2025-05-13 18:57:48.725123
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2025-05-13 18:57:48.737957
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2025-05-13 18:57:48.775299
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2025-05-13 18:57:48.801312
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2025-05-13 18:57:48.80736
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2025-05-13 18:57:48.812603
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY supabase_functions.hooks (id, hook_table_id, hook_name, created_at, request_id) FROM stdin;
1	19026	Next.js Revalidate Pages	2025-05-16 13:56:43.540788+00	1
2	19026	Next.js Revalidate Pages	2025-05-16 13:56:43.736241+00	2
3	19026	Next.js Revalidate Pages	2025-05-16 13:58:40.716939+00	3
4	19054	Next.js Revalidate Posts	2025-05-21 12:58:35.622789+00	4
5	19054	Next.js Revalidate Posts	2025-05-21 12:58:35.794324+00	5
6	19054	Next.js Revalidate Posts	2025-05-21 12:59:26.229718+00	6
7	19026	Next.js Revalidate Pages	2025-05-21 13:56:41.023921+00	7
8	19026	Next.js Revalidate Pages	2025-05-21 13:56:49.490159+00	8
9	19026	Next.js Revalidate Pages	2025-05-21 14:43:10.491924+00	9
10	19026	Next.js Revalidate Pages	2025-05-21 14:43:10.491924+00	10
11	19026	Next.js Revalidate Pages	2025-05-22 12:53:09.084998+00	11
12	19026	Next.js Revalidate Pages	2025-05-22 12:53:31.96851+00	12
13	19026	Next.js Revalidate Pages	2025-05-23 17:41:10.23302+00	13
14	19026	Next.js Revalidate Pages	2025-05-23 17:41:10.371848+00	14
15	19026	Next.js Revalidate Pages	2025-05-23 17:41:20.384849+00	15
16	19026	Next.js Revalidate Pages	2025-05-23 17:41:57.661249+00	16
17	19054	Next.js Revalidate Posts	2025-05-23 19:34:46.238064+00	17
18	19054	Next.js Revalidate Posts	2025-05-23 19:34:46.386438+00	18
19	19054	Next.js Revalidate Posts	2025-05-26 12:37:05.582795+00	19
20	19054	Next.js Revalidate Posts	2025-05-26 13:00:55.980106+00	20
21	19054	Next.js Revalidate Posts	2025-05-26 13:10:58.850527+00	21
22	19026	Next.js Revalidate Pages	2025-05-26 13:40:43.810972+00	22
23	19026	Next.js Revalidate Pages	2025-05-26 14:10:36.976404+00	23
24	19026	Next.js Revalidate Pages	2025-05-26 18:43:46.926814+00	24
25	19026	Next.js Revalidate Pages	2025-05-26 18:43:59.007206+00	25
26	19054	Next.js Revalidate Posts	2025-05-26 20:25:17.2458+00	26
27	19054	Next.js Revalidate Posts	2025-05-26 20:25:39.351148+00	27
28	19054	Next.js Revalidate Posts	2025-05-26 20:25:51.334475+00	28
29	19054	Next.js Revalidate Posts	2025-05-27 12:51:35.180852+00	29
30	19054	Next.js Revalidate Posts	2025-05-27 14:41:05.279891+00	30
31	19054	Next.js Revalidate Posts	2025-05-29 14:18:52.768271+00	31
32	19054	Next.js Revalidate Posts	2025-05-29 14:18:52.944875+00	32
33	19054	Next.js Revalidate Posts	2025-05-29 14:19:45.450977+00	33
34	19054	Next.js Revalidate Posts	2025-05-29 14:19:57.393359+00	34
35	17445	Next.js Revalidate Pages	2025-07-03 14:06:27.211729+00	1
36	17445	Next.js Revalidate Pages	2025-07-03 14:06:58.625172+00	2
37	17445	Next.js Revalidate Pages	2025-07-03 14:06:58.751866+00	3
38	17445	Next.js Revalidate Pages	2025-07-03 14:07:19.758401+00	4
39	17445	Next.js Revalidate Pages	2025-07-03 14:07:43.494892+00	5
40	17445	Next.js Revalidate Pages	2025-07-03 14:07:59.715664+00	6
41	17445	Next.js Revalidate Pages	2025-07-03 14:07:59.840161+00	7
42	17445	Next.js Revalidate Pages	2025-07-03 14:10:16.841734+00	8
43	17445	Next.js Revalidate Pages	2025-07-03 14:10:23.502299+00	9
44	17445	Next.js Revalidate Pages	2025-07-03 14:44:25.920921+00	10
45	17445	Next.js Revalidate Pages	2025-07-03 14:44:26.053403+00	11
46	17445	Next.js Revalidate Pages	2025-07-03 14:44:41.397636+00	12
47	17445	Next.js Revalidate Pages	2025-07-03 14:45:00.226138+00	13
48	17445	Next.js Revalidate Pages	2025-07-03 14:45:15.473959+00	14
49	17445	Next.js Revalidate Pages	2025-07-03 14:45:15.602109+00	15
50	17445	Next.js Revalidate Pages	2025-07-03 16:15:04.874455+00	16
51	17445	Next.js Revalidate Pages	2025-07-03 16:15:09.959635+00	17
52	17445	Next.js Revalidate Pages	2025-07-03 16:15:34.345968+00	18
53	17445	Next.js Revalidate Pages	2025-07-03 16:15:34.475406+00	19
54	17445	Next.js Revalidate Pages	2025-07-03 16:24:47.502489+00	20
55	17445	Next.js Revalidate Pages	2025-07-03 16:24:52.102408+00	21
56	17445	Next.js Revalidate Pages	2025-07-03 16:25:16.596004+00	22
57	17445	Next.js Revalidate Pages	2025-07-03 16:25:52.514427+00	23
58	17445	Next.js Revalidate Pages	2025-07-03 16:26:21.447904+00	24
59	17445	Next.js Revalidate Pages	2025-07-03 16:44:56.009796+00	25
60	17445	Next.js Revalidate Pages	2025-07-03 16:58:25.783083+00	26
61	17445	Next.js Revalidate Pages	2025-07-03 17:02:45.995617+00	27
62	17445	Next.js Revalidate Pages	2025-07-03 17:02:45.995617+00	28
63	17445	Next.js Revalidate Pages	2025-07-03 17:09:30.376852+00	29
64	17445	Next.js Revalidate Pages	2025-07-03 17:10:18.304908+00	30
65	17445	Next.js Revalidate Pages	2025-07-03 17:10:31.892334+00	31
66	17445	Next.js Revalidate Pages	2025-07-03 17:10:31.892334+00	32
67	17445	Next.js Revalidate Pages	2025-07-03 17:11:40.609609+00	33
68	17445	Next.js Revalidate Pages	2025-07-03 17:27:15.766436+00	34
69	17445	Next.js Revalidate Pages	2025-07-04 14:17:34.500236+00	35
70	17445	Next.js Revalidate Pages	2025-07-04 14:17:57.994834+00	36
71	17445	Next.js Revalidate Pages	2025-07-07 14:39:35.578876+00	37
72	17445	Next.js Revalidate Pages	2025-07-07 14:39:53.885625+00	38
73	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	39
74	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	40
75	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	41
76	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	42
77	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	43
78	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	44
79	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	45
80	17445	Next.js Revalidate Pages	2025-07-17 16:55:21.642852+00	46
81	17455	Next.js Revalidate Posts	2025-07-17 16:55:21.642852+00	47
82	17455	Next.js Revalidate Posts	2025-07-17 16:55:21.642852+00	48
83	17455	Next.js Revalidate Posts	2025-07-17 16:55:21.642852+00	49
84	17455	Next.js Revalidate Posts	2025-07-17 16:55:21.642852+00	50
85	17455	Next.js Revalidate Posts	2025-07-17 16:55:21.642852+00	51
86	17455	Next.js Revalidate Posts	2025-07-17 16:55:21.642852+00	52
87	17455	Next.js Revalidate Posts	2025-07-22 16:26:48.783737+00	53
88	17455	Next.js Revalidate Posts	2025-07-22 16:26:48.989499+00	54
89	17455	Next.js Revalidate Posts	2025-07-22 16:27:25.166054+00	55
90	17455	Next.js Revalidate Posts	2025-07-22 16:28:13.695475+00	56
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY supabase_functions.migrations (version, inserted_at) FROM stdin;
initial	2025-05-15 16:49:01.374899+00
20210809183423_update_grants	2025-05-15 16:49:01.374899+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

COPY supabase_migrations.schema_migrations (version, statements, name) FROM stdin;
20250513194738	{"-- lowercase sql\r\n\r\n-- 1. create the user_role enum type\r\ncreate type public.user_role as enum ('ADMIN', 'WRITER', 'USER')","-- 2. create the profiles table\r\ncreate table public.profiles (\r\n  id uuid not null primary key, -- references auth.users(id)\r\n  updated_at timestamp with time zone,\r\n  username text unique,\r\n  full_name text,\r\n  avatar_url text,\r\n  website text,\r\n  role public.user_role not null default 'USER',\r\n\r\n  constraint username_length check (char_length(username) >= 3)\r\n)","-- 3. set up foreign key from profiles.id to auth.users.id\r\nalter table public.profiles\r\n  add constraint profiles_id_fkey\r\n  foreign key (id)\r\n  references auth.users (id)\r\n  on delete cascade","-- if a user is deleted, their profile is also deleted\r\n\r\n-- 4. (optional) add some sample inserts for roles if needed directly, though roles are part of the enum.\r\n-- users will get roles assigned. an admin user might need to be set manually or via seed.\r\n-- example: update a specific user to be an admin after they sign up.\r\n-- update public.profiles set role = 'ADMIN' where id = 'user_id_of_admin';\r\n\r\n-- 5. (optional) seed an initial admin user if you know their auth.users.id\r\n-- this requires the user to exist in auth.users first.\r\n-- insert into public.profiles (id, username, full_name, role)\r\n-- values ('<some-auth-user-id>', 'admin_user', 'Admin User', 'ADMIN')\r\n-- on conflict (id) do update set role = 'ADMIN';\r\n-- note: the trigger in the next migration is preferred for new users.\r\n-- this manual insert/update is for bootstrapping your first admin.\r\n\r\ncomment on table public.profiles is 'profile information for each user, extending auth.users.'","comment on column public.profiles.id is 'references auth.users.id'","comment on column public.profiles.role is 'user role for rbac.'"}	setup_roles_and_profiles
20250513194910	{"-- lowercase sql\r\n\r\n-- 1. create a function to handle new user creation\r\ncreate or replace function public.handle_new_user()\r\nreturns trigger\r\nlanguage plpgsql\r\nsecurity definer set search_path = public -- important for security definer to access public schema\r\nas $$\r\nbegin\r\n  insert into public.profiles (id, full_name, avatar_url, role)\r\n  values (\r\n    new.id,\r\n    new.raw_user_meta_data->>'full_name', -- attempts to grab full_name from metadata if provided at signup\r\n    new.raw_user_meta_data->>'avatar_url', -- attempts to grab avatar_url from metadata\r\n    'USER' -- default role\r\n  );\r\n  return new;\r\nend;\r\n$$","-- 2. create a trigger to call the function when a new user signs up in auth.users\r\ncreate trigger on_auth_user_created\r\n  after insert on auth.users\r\n  for each row execute procedure public.handle_new_user()","-- This comment is on a function in the 'public' schema, which is fine.\r\ncomment on function public.handle_new_user is 'creates a public.profile row for a new auth.users entry.'","-- The following line was causing the permission error and has been removed:\r\n-- comment on trigger on_auth_user_created on auth.users is 'after a new user signs up, create their profile.'"}	auto_create_profile_trigger
20250513194916	{"-- lowercase sql\r\n\r\n-- 1. enable row level security on the profiles table\r\nalter table public.profiles enable row level security","-- 2. create policies for profiles table\r\n\r\n-- allow users to read their own profile\r\ncreate policy \\"users_can_select_own_profile\\"\r\non public.profiles for select\r\nusing (auth.uid() = id)","-- allow users to update their own profile\r\ncreate policy \\"users_can_update_own_profile\\"\r\non public.profiles for update\r\nusing (auth.uid() = id)\r\nwith check (auth.uid() = id)","-- allow admins to select any profile\r\ncreate policy \\"admins_can_select_any_profile\\"\r\non public.profiles for select\r\nusing (\r\n  exists (\r\n    select 1\r\n    from public.profiles\r\n    where id = auth.uid() and role = 'ADMIN'\r\n  )\r\n)","-- allow admins to update any profile\r\ncreate policy \\"admins_can_update_any_profile\\"\r\non public.profiles for update\r\nusing (\r\n  exists (\r\n    select 1\r\n    from public.profiles\r\n    where id = auth.uid() and role = 'ADMIN'\r\n  )\r\n)\r\nwith check (\r\n  exists (\r\n    select 1\r\n    from public.profiles\r\n    where id = auth.uid() and role = 'ADMIN'\r\n  )\r\n)","-- allow admins to insert profiles (e.g., for manual setup, though trigger handles new users)\r\ncreate policy \\"admins_can_insert_profiles\\"\r\non public.profiles for insert\r\nwith check (\r\n  exists (\r\n    select 1\r\n    from public.profiles\r\n    where id = auth.uid() and role = 'ADMIN'\r\n  )\r\n)","-- (optional) allow any authenticated user to read any profile if roles need to be widely available\r\n-- create policy \\"authenticated_users_can_read_profiles\\"\r\n-- on public.profiles for select\r\n-- to authenticated\r\n-- using (true);\r\n-- For now, we'll stick to more restrictive select policies above.\r\n-- The middleware will need to fetch the current user's role. The \\"users_can_select_own_profile\\"\r\n-- policy allows this. If an admin needs to see other user's roles in a list,\r\n-- \\"admins_can_select_any_profile\\" covers that.\r\n\r\ncomment on policy \\"users_can_select_own_profile\\" on public.profiles is 'users can read their own profile.'","comment on policy \\"users_can_update_own_profile\\" on public.profiles is 'users can update their own profile.'","comment on policy \\"admins_can_select_any_profile\\" on public.profiles is 'admin users can read any profile.'","comment on policy \\"admins_can_update_any_profile\\" on public.profiles is 'admin users can update any profile.'","comment on policy \\"admins_can_insert_profiles\\" on public.profiles is 'admin users can insert new profiles.'","-- Note on Deletion: Deletion is handled by `on delete cascade` from `auth.users`.\r\n-- If direct deletion from `profiles` table is needed (e.g., by an admin), a policy would be:\r\n-- create policy \\"admins_can_delete_profiles\\"\r\n-- on public.profiles for delete\r\n-- using (\r\n--   exists (\r\n--     select 1\r\n--     from public.profiles\r\n--     where id = auth.uid() and role = 'ADMIN'\r\n--   )\r\n-- )"}	rls_for_profiles
20250514125634	{"-- Migration to fix recursive RLS policies on the 'profiles' table\r\n\r\n-- 1. Create a helper function to get the current user's role securely\r\n-- This function runs with the definer's privileges, avoiding RLS recursion\r\n-- when called from within an RLS policy.\r\ncreate or replace function public.get_current_user_role()\r\nreturns public.user_role -- Your ENUM type for roles\r\nlanguage sql\r\nstable -- Indicates the function doesn't modify the database\r\nsecurity definer\r\nset search_path = public -- Ensures 'profiles' table is found in 'public' schema\r\nas $$\r\n  select role from public.profiles where id = auth.uid();\r\n$$","comment on function public.get_current_user_role() is 'Fetches the role of the currently authenticated user. SECURITY DEFINER to prevent RLS recursion issues when used in policies.'","-- 2. Drop the old, problematic RLS policies\r\n-- It's good practice to drop before creating, even if they might not exist or cause errors if they don't.\r\n-- The original error means the \\"admins_can_select_any_profile\\" policy was indeed created.\r\ndrop policy if exists \\"admins_can_select_any_profile\\" on public.profiles","drop policy if exists \\"admins_can_update_any_profile\\" on public.profiles","drop policy if exists \\"admins_can_insert_profiles\\" on public.profiles","-- Add any other admin policies that used the recursive pattern, e.g., for delete\r\n-- drop policy if exists \\"admins_can_delete_profiles\\" on public.profiles;\r\n\r\n-- 3. Recreate the admin policies using the helper function\r\n-- For SELECT: Allows admins to select any profile.\r\ncreate policy \\"admins_can_select_any_profile\\"\r\non public.profiles for select\r\nusing (public.get_current_user_role() = 'ADMIN')","-- Compares ENUM to 'ADMIN' literal\r\n\r\n-- For UPDATE: Allows admins to update any profile.\r\ncreate policy \\"admins_can_update_any_profile\\"\r\non public.profiles for update\r\nusing (public.get_current_user_role() = 'ADMIN')\r\nwith check (public.get_current_user_role() = 'ADMIN')","-- For INSERT: Allows admins to insert profiles (trigger handles new users, this is for manual admin action).\r\ncreate policy \\"admins_can_insert_profiles\\"\r\non public.profiles for insert\r\nwith check (public.get_current_user_role() = 'ADMIN')","-- (Optional) If you had an admin delete policy with the recursive pattern:\r\n-- create policy \\"admins_can_delete_profiles\\"\r\n-- on public.profiles for delete\r\n-- using (public.get_current_user_role() = 'ADMIN');\r\n\r\n-- Note: The \\"users_can_select_own_profile\\" and \\"users_can_update_own_profile\\"\r\n-- policies from your previous migration are fine and do not need to be changed\r\n-- as they don't have the recursive subquery pattern."}	fix_recursive_rls_policies
20250514143016	{"-- lowercase sql\r\n\r\n-- 1. create the languages table\r\ncreate table public.languages (\r\n  id bigint generated by default as identity primary key,\r\n  code text not null unique, -- e.g., 'en', 'fr' (BCP 47 language tags)\r\n  name text not null, -- e.g., 'English', 'Français'\r\n  is_default boolean not null default false,\r\n  created_at timestamp with time zone not null default now(),\r\n  updated_at timestamp with time zone not null default now()\r\n)","comment on table public.languages is 'Stores supported languages for the CMS.'","comment on column public.languages.code is 'BCP 47 language code (e.g., en, en-US, fr, fr-CA).'","comment on column public.languages.name is 'Human-readable name of the language.'","comment on column public.languages.is_default is 'Indicates if this is the default fallback language.'","-- 2. create a partial unique index to ensure only one language can be default\r\n-- This ensures data integrity at the database level for the is_default flag.\r\ncreate unique index ensure_single_default_language_idx\r\non public.languages (is_default)\r\nwhere (is_default = true)","-- 3. seed initial languages: english (default) and french\r\ninsert into public.languages (code, name, is_default)\r\nvalues\r\n  ('en', 'English', true),\r\n  ('fr', 'Français', false)","-- 4. enable row level security (rls) on the languages table\r\nalter table public.languages enable row level security","-- 5. create rls policies for the languages table\r\n-- policy: allow public read access to languages\r\ncreate policy \\"languages_are_publicly_readable\\"\r\non public.languages for select\r\nto anon, authenticated\r\nusing (true)","-- policy: allow admins to manage languages (insert, update, delete)\r\ncreate policy \\"admins_can_manage_languages\\"\r\non public.languages for all -- covers insert, update, delete\r\nto authenticated\r\nusing (\r\n  -- check if the user is an admin by calling the helper function created in phase 1\r\n  public.get_current_user_role() = 'ADMIN'\r\n)\r\nwith check (\r\n  public.get_current_user_role() = 'ADMIN'\r\n)","-- (Optional) Trigger to automatically update 'updated_at' timestamp\r\ncreate or replace function public.handle_languages_update()\r\nreturns trigger\r\nlanguage plpgsql\r\nas $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$","create trigger on_languages_update\r\n  before update on public.languages\r\n  for each row\r\n  execute procedure public.handle_languages_update()"}	setup_languages_table
20250523151737	{"-- Drop existing policies if they exist, then recreate them.\r\n\r\n-- Policy for public read access\r\nDROP POLICY IF EXISTS \\"media_are_publicly_readable\\" ON public.media","CREATE POLICY \\"media_are_publicly_readable\\"\r\nON public.media FOR SELECT\r\nTO anon, authenticated\r\nUSING (true)","-- Policy for admin/writer management\r\nDROP POLICY IF EXISTS \\"admins_and_writers_can_manage_media\\" ON public.media","CREATE POLICY \\"admins_and_writers_can_manage_media\\"\r\nON public.media FOR ALL\r\nTO authenticated\r\nUSING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\nWITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))"}	add_rls_to_media_table
20250526153321	{"-- supabase/migrations/YYYYMMDDHHMMSS_optimize_rls_policies_v2.sql\r\n-- Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file.\r\n\r\nBEGIN","-- == PROFILES ==\r\nDROP POLICY IF EXISTS \\"users_can_select_own_profile\\" ON public.profiles","DROP POLICY IF EXISTS \\"users_can_update_own_profile\\" ON public.profiles","DROP POLICY IF EXISTS \\"admins_can_select_any_profile\\" ON public.profiles","DROP POLICY IF EXISTS \\"admins_can_update_any_profile\\" ON public.profiles","CREATE POLICY \\"authenticated_can_read_profiles\\" ON public.profiles\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (id = (SELECT auth.uid())) OR\r\n    (public.get_current_user_role() = 'ADMIN')\r\n  )","COMMENT ON POLICY \\"authenticated_can_read_profiles\\" ON public.profiles IS 'Authenticated users can read their own profile, and admins can read any profile.'","CREATE POLICY \\"authenticated_can_update_profiles\\" ON public.profiles\r\n  FOR UPDATE\r\n  TO authenticated\r\n  USING (\r\n    (id = (SELECT auth.uid())) OR\r\n    (public.get_current_user_role() = 'ADMIN')\r\n  )\r\n  WITH CHECK (\r\n    (id = (SELECT auth.uid())) OR\r\n    (public.get_current_user_role() = 'ADMIN')\r\n  )","COMMENT ON POLICY \\"authenticated_can_update_profiles\\" ON public.profiles IS 'Authenticated users can update their own profile, and admins can update any profile.'","-- Ensure admin insert policy is present and correct (it typically uses WITH CHECK on the role, not USING for insert)\r\nDROP POLICY IF EXISTS \\"admins_can_insert_profiles\\" ON public.profiles","CREATE POLICY \\"admins_can_insert_profiles\\" ON public.profiles\r\n    FOR INSERT TO authenticated\r\n    WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"admins_can_insert_profiles\\" ON public.profiles IS 'Admin users can insert new profiles.'","-- == PAGES ==\r\nDROP POLICY IF EXISTS \\"pages_are_publicly_readable_when_published\\" ON public.pages","DROP POLICY IF EXISTS \\"authors_writers_admins_can_read_own_drafts\\" ON public.pages","DROP POLICY IF EXISTS \\"authors_writers_admins_can_read_own_or_all_drafts\\" ON public.pages","DROP POLICY IF EXISTS \\"admins_and_writers_can_manage_pages\\" ON public.pages","CREATE POLICY \\"pages_anon_can_read_published\\" ON public.pages\r\n  FOR SELECT\r\n  TO anon\r\n  USING (status = 'published')","COMMENT ON POLICY \\"pages_anon_can_read_published\\" ON public.pages IS 'Anonymous users can read published pages.'","CREATE POLICY \\"pages_authenticated_access\\" ON public.pages\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (status = 'published') OR\r\n    (author_id = (SELECT auth.uid()) AND status <> 'published') OR\r\n    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  )","COMMENT ON POLICY \\"pages_authenticated_access\\" ON public.pages IS 'Authenticated users can read published pages, their own drafts, or all pages if admin/writer.'","CREATE POLICY \\"pages_admin_writer_management\\" ON public.pages\r\n  FOR ALL -- Changed from INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"pages_admin_writer_management\\" ON public.pages IS 'Admins and Writers can manage pages.'","-- == POSTS ==\r\nDROP POLICY IF EXISTS \\"posts_are_publicly_readable_when_published\\" ON public.posts","DROP POLICY IF EXISTS \\"authors_writers_admins_can_read_own_draft_posts\\" ON public.posts","DROP POLICY IF EXISTS \\"authors_writers_admins_can_read_own_or_all_draft_posts\\" ON public.posts","DROP POLICY IF EXISTS \\"admins_and_writers_can_manage_posts\\" ON public.posts","CREATE POLICY \\"posts_anon_can_read_published\\" ON public.posts\r\n  FOR SELECT\r\n  TO anon\r\n  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()))","COMMENT ON POLICY \\"posts_anon_can_read_published\\" ON public.posts IS 'Anonymous users can read published posts.'","CREATE POLICY \\"posts_authenticated_access\\" ON public.posts\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR\r\n    (author_id = (SELECT auth.uid()) AND status <> 'published') OR\r\n    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  )","COMMENT ON POLICY \\"posts_authenticated_access\\" ON public.posts IS 'Authenticated users can read published posts, their own drafts, or all posts if admin/writer.'","CREATE POLICY \\"posts_admin_writer_management\\" ON public.posts\r\n  FOR ALL -- Changed from INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"posts_admin_writer_management\\" ON public.posts IS 'Admins and Writers can manage posts.'","-- == BLOCKS ==\r\nDROP POLICY IF EXISTS \\"blocks_are_readable_if_parent_is_published\\" ON public.blocks","DROP POLICY IF EXISTS \\"admins_and_writers_can_manage_blocks\\" ON public.blocks","CREATE POLICY \\"blocks_anon_can_read_published\\" ON public.blocks\r\n  FOR SELECT\r\n  TO anon\r\n  USING (\r\n    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n  )","COMMENT ON POLICY \\"blocks_anon_can_read_published\\" ON public.blocks IS 'Anonymous users can read blocks of published parent pages/posts.'","CREATE POLICY \\"blocks_authenticated_access\\" ON public.blocks\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() IN ('ADMIN', 'WRITER')) OR\r\n    (\r\n      (public.get_current_user_role() = 'USER') AND (\r\n        (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n        (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n      )\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_authenticated_access\\" ON public.blocks IS 'Admins/Writers can read all blocks; Users can read blocks of published parents.'","CREATE POLICY \\"blocks_admin_writer_management\\" ON public.blocks\r\n  FOR ALL -- Changed from INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_management\\" ON public.blocks IS 'Admins and Writers can manage blocks.'","-- == LANGUAGES ==\r\nDROP POLICY IF EXISTS \\"languages_are_publicly_readable\\" ON public.languages","DROP POLICY IF EXISTS \\"admins_can_manage_languages\\" ON public.languages","CREATE POLICY \\"languages_are_publicly_readable_by_all\\" ON public.languages\r\n  FOR SELECT\r\n  USING (true)","COMMENT ON POLICY \\"languages_are_publicly_readable_by_all\\" ON public.languages IS 'All users (anon and authenticated) can read languages.'","CREATE POLICY \\"languages_admin_management\\" ON public.languages\r\n  FOR ALL -- Changed from INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() = 'ADMIN')\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"languages_admin_management\\" ON public.languages IS 'Admins can manage languages.'","-- == MEDIA ==\r\nDROP POLICY IF EXISTS \\"media_is_readable_by_all\\" ON public.media","DROP POLICY IF EXISTS \\"media_are_publicly_readable\\" ON public.media","DROP POLICY IF EXISTS \\"admins_and_writers_can_manage_media\\" ON public.media","CREATE POLICY \\"media_is_publicly_readable_by_all\\" ON public.media\r\n  FOR SELECT\r\n  USING (true)","COMMENT ON POLICY \\"media_is_publicly_readable_by_all\\" ON public.media IS 'All users (anon and authenticated) can read media records.'","CREATE POLICY \\"media_admin_writer_management\\" ON public.media\r\n  FOR ALL -- Changed from INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"media_admin_writer_management\\" ON public.media IS 'Admins and Writers can manage media records.'","-- == NAVIGATION ITEMS ==\r\nDROP POLICY IF EXISTS \\"navigation_is_publicly_readable\\" ON public.navigation_items","DROP POLICY IF EXISTS \\"admins_can_manage_navigation\\" ON public.navigation_items","CREATE POLICY \\"nav_items_are_publicly_readable_by_all\\" ON public.navigation_items\r\n  FOR SELECT\r\n  USING (true)","COMMENT ON POLICY \\"nav_items_are_publicly_readable_by_all\\" ON public.navigation_items IS 'All users (anon and authenticated) can read navigation items.'","CREATE POLICY \\"nav_items_admin_management\\" ON public.navigation_items\r\n  FOR ALL -- Changed from INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() = 'ADMIN')\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"nav_items_admin_management\\" ON public.navigation_items IS 'Admins can manage navigation items.'",COMMIT}	optimize_rls_policies
20250514171549	{"-- lowercase sql\r\n\r\n-- define page_status enum (if not already defined for other tables)\r\n-- checking if type exists to prevent error if run multiple times or if defined elsewhere\r\ndo $$\r\nbegin\r\n  if not exists (select 1 from pg_type where typname = 'page_status') then\r\n    create type public.page_status as enum ('draft', 'published', 'archived');\r\n  end if;\r\nend\r\n$$","-- create pages table\r\ncreate table public.pages (\r\n  id bigint generated by default as identity primary key,\r\n  language_id bigint not null references public.languages(id) on delete cascade,\r\n  author_id uuid references public.profiles(id) on delete set null,\r\n  title text not null,\r\n  slug text not null,\r\n  status public.page_status not null default 'draft',\r\n  meta_title text,\r\n  meta_description text,\r\n  created_at timestamp with time zone not null default now(),\r\n  updated_at timestamp with time zone not null default now()\r\n)","comment on table public.pages is 'stores static pages for the website.'","comment on column public.pages.language_id is 'the language of this page version.'","comment on column public.pages.author_id is 'the user who originally created the page.'","comment on column public.pages.slug is 'url-friendly identifier for the page, unique per language.'","comment on column public.pages.status is 'publication status of the page.'","comment on column public.pages.meta_title is 'seo title for the page.'","comment on column public.pages.meta_description is 'seo description for the page.'","alter table public.pages\r\n  add constraint pages_language_id_slug_key unique (language_id, slug)","alter table public.pages enable row level security","create policy \\"pages_are_publicly_readable_when_published\\"\r\non public.pages for select\r\nto anon, authenticated\r\nusing (status = 'published')","create policy \\"authors_writers_admins_can_read_own_drafts\\"\r\non public.pages for select\r\nto authenticated\r\nusing (\r\n  (status <> 'published' and author_id = auth.uid()) or\r\n  (status <> 'published' and public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\n)","create policy \\"admins_and_writers_can_manage_pages\\"\r\non public.pages for all\r\nto authenticated\r\nusing (public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\nwith check (public.get_current_user_role() in ('ADMIN', 'WRITER'))","create or replace function public.handle_pages_update()\r\nreturns trigger\r\nlanguage plpgsql\r\nsecurity definer set search_path = public\r\nas $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$","create trigger on_pages_update\r\n  before update on public.pages\r\n  for each row\r\n  execute procedure public.handle_pages_update()"}	create_pages_table
20250514171550	{"-- lowercase sql\r\n\r\ncreate table public.posts (\r\n  id bigint generated by default as identity primary key,\r\n  language_id bigint not null references public.languages(id) on delete cascade,\r\n  author_id uuid references public.profiles(id) on delete set null,\r\n  title text not null,\r\n  slug text not null,\r\n  excerpt text,\r\n  status public.page_status not null default 'draft', -- reuse page_status\r\n  published_at timestamp with time zone,\r\n  meta_title text,\r\n  meta_description text,\r\n  created_at timestamp with time zone not null default now(),\r\n  updated_at timestamp with time zone not null default now()\r\n)","comment on table public.posts is 'stores blog posts or news articles.'","comment on column public.posts.slug is 'url-friendly identifier, unique per language.'","comment on column public.posts.excerpt is 'a short summary of the post.'","comment on column public.posts.published_at is 'date and time for publication.'","alter table public.posts\r\n  add constraint posts_language_id_slug_key unique (language_id, slug)","alter table public.posts enable row level security","create policy \\"posts_are_publicly_readable_when_published\\"\r\non public.posts for select\r\nto anon, authenticated\r\nusing (status = 'published' and (published_at is null or published_at <= now()))","create policy \\"authors_writers_admins_can_read_own_draft_posts\\"\r\non public.posts for select\r\nto authenticated\r\nusing (\r\n  (status <> 'published' and author_id = auth.uid()) or\r\n  (status <> 'published'and public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\n)","create policy \\"admins_and_writers_can_manage_posts\\"\r\non public.posts for all\r\nto authenticated\r\nusing (public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\nwith check (public.get_current_user_role() in ('ADMIN', 'WRITER'))","create or replace function public.handle_posts_update()\r\nreturns trigger\r\nlanguage plpgsql\r\nsecurity definer set search_path = public\r\nas $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$","create trigger on_posts_update\r\n  before update on public.posts\r\n  for each row\r\n  execute procedure public.handle_posts_update()"}	create_posts_table
20250514171552	{"-- lowercase sql\r\n\r\ncreate table public.media (\r\n  id uuid primary key default gen_random_uuid(),\r\n  uploader_id uuid references public.profiles(id) on delete set null,\r\n  file_name text not null,\r\n  object_key text not null unique,\r\n  file_type text,\r\n  size_bytes bigint,\r\n  description text,\r\n  created_at timestamp with time zone not null default now(),\r\n  updated_at timestamp with time zone not null default now()\r\n)","comment on table public.media is 'stores information about uploaded media assets.'","comment on column public.media.object_key is 'unique key (path) in cloudflare r2.'","alter table public.media enable row level security","create policy \\"media_is_readable_by_all\\"\r\non public.media for select\r\nto anon, authenticated\r\nusing (true)","create policy \\"admins_and_writers_can_manage_media\\"\r\non public.media for all\r\nto authenticated\r\nusing (public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\nwith check (public.get_current_user_role() in ('ADMIN', 'WRITER'))","create or replace function public.handle_media_update()\r\nreturns trigger\r\nlanguage plpgsql\r\nsecurity definer set search_path = public\r\nas $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$","create trigger on_media_update\r\n  before update on public.media\r\n  for each row\r\n  execute procedure public.handle_media_update()"}	create_media_table
20250514171553	{"-- lowercase sql\r\n\r\ncreate table public.blocks (\r\n  id bigint generated by default as identity primary key,\r\n  page_id bigint references public.pages(id) on delete cascade,\r\n  post_id bigint references public.posts(id) on delete cascade,\r\n  language_id bigint not null references public.languages(id) on delete cascade,\r\n  block_type text not null,\r\n  content jsonb,\r\n  \\"order\\" integer not null default 0,\r\n  created_at timestamp with time zone not null default now(),\r\n  updated_at timestamp with time zone not null default now(),\r\n  constraint check_exactly_one_parent check (\r\n    (page_id is not null and post_id is null) or\r\n    (post_id is not null and page_id is null)\r\n  )\r\n)","comment on table public.blocks is 'stores content blocks for pages and posts.'","comment on column public.blocks.block_type is 'type of the block, e.g., \\"text\\", \\"image\\".'","comment on column public.blocks.content is 'jsonb content specific to the block_type.'","comment on column public.blocks.order is 'sort order of the block.'","alter table public.blocks enable row level security","create policy \\"blocks_are_readable_if_parent_is_published\\"\r\non public.blocks for select\r\nto anon, authenticated\r\nusing (\r\n  (page_id is not null and exists(select 1 from public.pages p where p.id = blocks.page_id and p.status = 'published')) or\r\n  (post_id is not null and exists(select 1 from public.posts pt where pt.id = blocks.post_id and pt.status = 'published' and (pt.published_at is null or pt.published_at <= now())))\r\n)","create policy \\"admins_and_writers_can_manage_blocks\\"\r\non public.blocks for all\r\nto authenticated\r\nusing (public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\nwith check (public.get_current_user_role() in ('ADMIN', 'WRITER'))","create or replace function public.handle_blocks_update()\r\nreturns trigger\r\nlanguage plpgsql\r\nsecurity definer set search_path = public\r\nas $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$","create trigger on_blocks_update\r\n  before update on public.blocks\r\n  for each row\r\n  execute procedure public.handle_blocks_update()"}	create_blocks_table
20250526110400	{"ALTER TABLE public.media\r\nADD COLUMN width INTEGER,\r\nADD COLUMN height INTEGER","-- Optional: Add a comment to describe the new columns\r\nCOMMENT ON COLUMN public.media.width IS 'Width of the image in pixels.'","COMMENT ON COLUMN public.media.height IS 'Height of the image in pixels.'","-- Backfill existing image media with nulls, or you might want to run a script later to populate them if possible\r\n-- For now, they will be NULL by default.\r\n\r\n-- Re-apply RLS policies if necessary, though ADD COLUMN usually doesn't require it unless policies are column-specific\r\n-- and these new columns need to be included or excluded.\r\n-- For simplicity, assuming existing policies are fine."}	add_image_dimensions_to_media
20250618130000	{"-- Fix multiple permissive policies on logos table\r\nDROP POLICY IF EXISTS \\"Allow admin users to manage logos\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow read access for authenticated users on logos\\" ON public.logos","CREATE POLICY \\"Allow read access for authenticated users on logos\\"\r\nON public.logos\r\nFOR SELECT\r\nTO authenticated\r\nUSING (true)","CREATE POLICY \\"Allow admin users to insert logos\\"\r\nON public.logos\r\nFOR INSERT TO authenticated\r\nWITH CHECK ((get_my_claim('user_role'::text) = '\\"admin\\"'::jsonb))","CREATE POLICY \\"Allow admin users to update logos\\"\r\nON public.logos\r\nFOR UPDATE TO authenticated\r\nUSING ((get_my_claim('user_role'::text) = '\\"admin\\"'::jsonb))\r\nWITH CHECK ((get_my_claim('user_role'::text) = '\\"admin\\"'::jsonb))","CREATE POLICY \\"Allow admin users to delete logos\\"\r\nON public.logos\r\nFOR DELETE TO authenticated\r\nUSING ((get_my_claim('user_role'::text) = '\\"admin\\"'::jsonb))","-- Fix mutable search path for get_my_claim\r\nCREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)\r\nRETURNS JSONB AS $$\r\n  SET search_path = '';\r\n  SELECT COALESCE(current_setting('request.jwt.claims', true)::JSONB ->> claim, NULL)::JSONB\r\n$$ LANGUAGE SQL STABLE","-- Optimize RLS policies on blocks table\r\nDROP POLICY IF EXISTS \\"blocks_are_readable_if_parent_is_published\\" ON public.blocks","DROP POLICY IF EXISTS \\"admins_and_writers_can_manage_blocks\\" ON public.blocks","CREATE POLICY \\"blocks_are_readable_if_parent_is_published\\"\r\nON public.blocks FOR SELECT\r\nTO anon, authenticated\r\nUSING (\r\n  (page_id IS NOT NULL AND EXISTS (\r\n    SELECT 1\r\n    FROM public.pages p\r\n    WHERE p.id = blocks.page_id AND p.status = 'published'\r\n  )) OR\r\n  (post_id IS NOT NULL AND EXISTS (\r\n    SELECT 1\r\n    FROM public.posts pt\r\n    WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())\r\n  ))\r\n)","CREATE POLICY \\"admins_and_writers_can_manage_blocks\\"\r\nON public.blocks FOR ALL\r\nTO authenticated\r\nUSING ((SELECT get_my_claim('user_role'::text)) IN ('\\"admin\\"', '\\"writer\\"'))\r\nWITH CHECK ((SELECT get_my_claim('user_role'::text)) IN ('\\"admin\\"', '\\"writer\\"'))"}	fix_linter_warnings
20250619084800	{"-- Re-enables RLS policies for storage.objects to allow authenticated uploads.\r\n\r\n-- Adds a policy allowing authenticated users to upload files\r\nCREATE POLICY \\"allow_authenticated_uploads\\" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public' AND owner = auth.uid())","-- Allow authenticated users to SELECT files\r\nCREATE POLICY \\"allow_authenticated_select\\" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'public')","-- Allow authenticated users to UPDATE their own files\r\nCREATE POLICY \\"allow_authenticated_updates\\" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public' AND owner = auth.uid())","-- Allow authenticated users to DELETE their own files\r\nCREATE POLICY \\"allow_authenticated_deletes\\" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public' AND owner = auth.uid())"}	reinstate_storage_rls
20250514171615	{"-- lowercase sql\r\n\r\ndo $$\r\nbegin\r\n  if not exists (select 1 from pg_type where typname = 'menu_location') then\r\n    create type public.menu_location as enum ('HEADER', 'FOOTER', 'SIDEBAR');\r\n  end if;\r\nend\r\n$$","create table public.navigation_items (\r\n  id bigint generated by default as identity primary key,\r\n  language_id bigint not null references public.languages(id) on delete cascade,\r\n  menu_key public.menu_location not null,\r\n  label text not null,\r\n  url text not null,\r\n  parent_id bigint references public.navigation_items(id) on delete cascade,\r\n  \\"order\\" integer not null default 0,\r\n  page_id bigint references public.pages(id) on delete set null,\r\n  created_at timestamp with time zone not null default now(),\r\n  updated_at timestamp with time zone not null default now()\r\n)","comment on table public.navigation_items is 'stores navigation menu items.'","comment on column public.navigation_items.menu_key is 'identifies the menu this item belongs to.'","create index idx_navigation_items_menu_lang_order on public.navigation_items (menu_key, language_id, \\"order\\")","alter table public.navigation_items enable row level security","create policy \\"navigation_is_publicly_readable\\"\r\non public.navigation_items for select\r\nto anon, authenticated\r\nusing (true)","create policy \\"admins_can_manage_navigation\\"\r\non public.navigation_items for all\r\nto authenticated\r\nusing (public.get_current_user_role() = 'ADMIN')\r\nwith check (public.get_current_user_role() = 'ADMIN')","create or replace function public.handle_navigation_items_update()\r\nreturns trigger\r\nlanguage plpgsql\r\nsecurity definer set search_path = public\r\nas $$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$$","create trigger on_navigation_items_update\r\n  before update on public.navigation_items\r\n  for each row\r\n  execute procedure public.handle_navigation_items_update()"}	create_navigation_table
20250514171627	{"-- supabase/migrations/YYYYMMDDHHMMSS_rls_policies_for_content_tables.sql\r\n-- lowercase sql\r\n\r\nbegin","--\r\n-- Pages Table RLS\r\n--\r\nalter table public.pages enable row level security","-- allow anonymous and authenticated users to read published pages\r\ncreate policy \\"pages_are_publicly_readable_when_published\\"\r\non public.pages for select\r\nto anon, authenticated\r\nusing (status = 'published')","-- allow authenticated users (authors, writers, admins) to read their own or all non-published pages\r\ncreate policy \\"authors_writers_admins_can_read_own_or_all_drafts\\"\r\non public.pages for select\r\nto authenticated\r\nusing (\r\n  (status <> 'published' and author_id = auth.uid()) or -- author can read their own non-published\r\n  (status <> 'published' and public.get_current_user_role() in ('ADMIN', 'WRITER')) -- admins/writers can read all non-published\r\n)","--\r\n-- Posts Table RLS\r\n--\r\nalter table public.posts enable row level security","-- allow authenticated users (authors, writers, admins) to read their own or all non-published posts\r\ncreate policy \\"authors_writers_admins_can_read_own_or_all_draft_posts\\"\r\non public.posts for select\r\nto authenticated\r\nusing (\r\n  (status <> 'published' and author_id = auth.uid()) or\r\n  (status <> 'published'and public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\n)","--\r\n-- Media Table RLS\r\n--\r\nalter table public.media enable row level security","--\r\n-- Blocks Table RLS\r\n--\r\nalter table public.blocks enable row level security","-- allow anonymous and authenticated users to read blocks if their parent page/post is published\r\ncreate policy \\"blocks_are_readable_if_parent_is_published\\"\r\non public.blocks for select\r\nto anon, authenticated\r\nusing (\r\n  (page_id is not null and exists(select 1 from public.pages p where p.id = blocks.page_id and p.status = 'published')) or\r\n  (post_id is not null and exists(select 1 from public.posts pt where pt.id = blocks.post_id and pt.status = 'published' and (pt.published_at is null or pt.published_at <= now())))\r\n)","-- allow admins and writers to insert, update, delete blocks\r\ncreate policy \\"admins_and_writers_can_manage_blocks\\"\r\non public.blocks for all\r\nto authenticated\r\nusing (public.get_current_user_role() in ('ADMIN', 'WRITER'))\r\nwith check (public.get_current_user_role() in ('ADMIN', 'WRITER'))","--\r\n-- Navigation Items Table RLS\r\n--\r\nalter table public.navigation_items enable row level security",commit}	rls_policies_for_content_tables
20250515194800	{"-- supabase/migrations/YYYYMMDDHHMMSS_add_translation_group_id.sql\r\n\r\nALTER TABLE public.pages\r\nADD COLUMN translation_group_id UUID DEFAULT gen_random_uuid() NOT NULL","COMMENT ON COLUMN public.pages.translation_group_id IS 'Groups different language versions of the same conceptual page.'","CREATE INDEX IF NOT EXISTS idx_pages_translation_group_id ON public.pages(translation_group_id)","-- For existing pages, you'll need to manually group them.\r\n-- Example: If page ID 1 (EN) and page ID 10 (FR) are the same conceptual page:\r\n-- UPDATE public.pages SET translation_group_id = (SELECT translation_group_id FROM public.pages WHERE id = 1) WHERE id = 10;\r\n-- Or, for all pages that share a slug currently (from the previous model):\r\n-- WITH slug_groups AS (\r\n--   SELECT slug, MIN(id) as first_id, gen_random_uuid() as new_group_id\r\n--   FROM public.pages\r\n--   GROUP BY slug\r\n--   HAVING COUNT(*) > 1 -- Only for slugs that were shared\r\n-- )\r\n-- UPDATE public.pages p\r\n-- SET translation_group_id = sg.new_group_id\r\n-- FROM slug_groups sg\r\n-- WHERE p.slug = sg.slug;\r\n--\r\n-- UPDATE public.pages p\r\n-- SET translation_group_id = gen_random_uuid()\r\n-- WHERE p.translation_group_id IS NULL AND EXISTS (\r\n--   SELECT 1 FROM (\r\n--     SELECT slug, COUNT(*) as c FROM public.pages GROUP BY slug\r\n--   ) counts WHERE counts.slug = p.slug AND counts.c = 1\r\n-- );\r\n\r\n\r\nALTER TABLE public.posts\r\nADD COLUMN translation_group_id UUID DEFAULT gen_random_uuid() NOT NULL","COMMENT ON COLUMN public.posts.translation_group_id IS 'Groups different language versions of the same conceptual post.'","CREATE INDEX IF NOT EXISTS idx_posts_translation_group_id ON public.posts(translation_group_id)"}	add_translation_group_id
20250520171900	{"-- supabase/migrations/YYYYMMDDHHMMSS_add_translation_group_to_nav_items.sql\r\n-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250520171700\r\n\r\nALTER TABLE public.navigation_items\r\nADD COLUMN translation_group_id UUID DEFAULT gen_random_uuid() NOT NULL","COMMENT ON COLUMN public.navigation_items.translation_group_id IS 'Groups different language versions of the same conceptual navigation item.'","CREATE INDEX IF NOT EXISTS idx_navigation_items_translation_group_id ON public.navigation_items(translation_group_id)","-- Note: For existing navigation items, you will need to manually group them if they are translations of each other.\r\n-- For example, if item ID 5 (EN) and item ID 25 (FR) are the same conceptual link:\r\n-- UPDATE public.navigation_items SET translation_group_id = (SELECT translation_group_id FROM public.navigation_items WHERE id = 5 LIMIT 1) WHERE id = 25;\r\n-- Or, assign a new group ID to both if they weren't grouped yet:\r\n-- WITH new_group AS (SELECT gen_random_uuid() as new_id)\r\n-- UPDATE public.navigation_items\r\n-- SET translation_group_id = (SELECT new_id FROM new_group)\r\n-- WHERE id IN (5, 25);\r\n--\r\n-- It's recommended to do this grouping manually based on your existing data logic.\r\n-- New items created through the updated CMS logic will automatically get grouped."}	add_translation_group_to_nav_items
20250521143933	{"-- supabase/migrations/YYYYMMDDHHMMSS_seed_homepage_and_nav.sql\r\n-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250521100000\r\n\r\nDO $$\r\nDECLARE\r\n  en_lang_id BIGINT;\r\n  fr_lang_id BIGINT;\r\n  admin_user_id UUID;\r\n  home_page_translation_group UUID;\r\n  home_nav_translation_group UUID;\r\n  en_home_page_id BIGINT;\r\n  fr_home_page_id BIGINT;\r\nBEGIN\r\n  -- Get language IDs\r\n  SELECT id INTO en_lang_id FROM public.languages WHERE code = 'en' LIMIT 1;\r\n  SELECT id INTO fr_lang_id FROM public.languages WHERE code = 'fr' LIMIT 1;\r\n\r\n  -- Get an admin user ID to set as author (optional, fallback to NULL)\r\n  SELECT id INTO admin_user_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;\r\n\r\n  -- Check if languages were found\r\n  IF en_lang_id IS NULL THEN\r\n    RAISE EXCEPTION 'English language (en) not found. Please seed languages first.';\r\n  END IF;\r\n  IF fr_lang_id IS NULL THEN\r\n    RAISE EXCEPTION 'French language (fr) not found. Please seed languages first.';\r\n  END IF;\r\n\r\n  -- Generate translation group UUIDs\r\n  home_page_translation_group := gen_random_uuid();\r\n  home_nav_translation_group := gen_random_uuid();\r\n\r\n  -- Seed English Homepage\r\n  INSERT INTO public.pages (language_id, author_id, title, slug, status, meta_title, meta_description, translation_group_id)\r\n  VALUES (en_lang_id, admin_user_id, 'Home', 'home', 'published', 'Homepage', 'This is the homepage.', home_page_translation_group)\r\n  RETURNING id INTO en_home_page_id;\r\n\r\n  -- Seed French Homepage (Accueil)\r\n  INSERT INTO public.pages (language_id, author_id, title, slug, status, meta_title, meta_description, translation_group_id)\r\n  VALUES (fr_lang_id, admin_user_id, 'Accueil', 'accueil', 'published', 'Page d''accueil', 'Ceci est la page d''accueil.', home_page_translation_group)\r\n  RETURNING id INTO fr_home_page_id;\r\n\r\n  -- Seed initial content block for English Homepage (optional)\r\n  IF en_home_page_id IS NOT NULL THEN\r\n    INSERT INTO public.blocks (page_id, language_id, block_type, content, \\"order\\")\r\n    VALUES (en_home_page_id, en_lang_id, 'text', '{\\"html_content\\": \\"<p>Welcome to the English homepage!</p><p>This content is dynamically managed by the CMS.</p>\\"}', 0);\r\n  END IF;\r\n\r\n  -- Seed initial content block for French Homepage (optional)\r\n  IF fr_home_page_id IS NOT NULL THEN\r\n    INSERT INTO public.blocks (page_id, language_id, block_type, content, \\"order\\")\r\n    VALUES (fr_home_page_id, fr_lang_id, 'text', '{\\"html_content\\": \\"<p>Bienvenue sur la page d''accueil en français !</p><p>Ce contenu est géré dynamiquement par le CMS.</p>\\"}', 0);\r\n  END IF;\r\n\r\n  -- Seed English Navigation Item for Homepage (linked to the English page, but URL is root)\r\n  INSERT INTO public.navigation_items (language_id, menu_key, label, url, \\"order\\", page_id, translation_group_id)\r\n  VALUES (en_lang_id, 'HEADER', 'Home', '/', 0, en_home_page_id, home_nav_translation_group);\r\n\r\n  -- Seed French Navigation Item for Homepage (linked to the French page, but URL is root)\r\n  INSERT INTO public.navigation_items (language_id, menu_key, label, url, \\"order\\", page_id, translation_group_id)\r\n  VALUES (fr_lang_id, 'HEADER', 'Accueil', '/', 0, fr_home_page_id, home_nav_translation_group);\r\n\r\n  RAISE NOTICE 'Homepage and navigation links seeded for EN and FR.';\r\nEND $$"}	seed_homepage_and_nav
20250523145833	{"ALTER TABLE public.posts\r\nADD COLUMN feature_image_id UUID,\r\nADD CONSTRAINT fk_feature_image\r\n    FOREIGN KEY (feature_image_id)\r\n    REFERENCES public.media(id)\r\n    ON DELETE SET NULL","COMMENT ON COLUMN public.posts.feature_image_id IS 'ID of the media item to be used as the post''s feature image.'"}	add_feature_image_to_posts
20250526172513	{"-- supabase/migrations/YYYYMMDDHHMMSS_resolve_select_policy_overlaps.sql\r\n-- (Ensure YYYYMMDDHHMMSS is the current timestamp)\r\n\r\nBEGIN","-- == BLOCKS ==\r\n-- Assuming \\"blocks_admin_writer_management\\" is FOR ALL and covers SELECT for ADMIN/WRITER.\r\n-- Make \\"blocks_authenticated_access\\" specific to non-ADMIN/WRITER authenticated users.\r\nDROP POLICY IF EXISTS \\"blocks_authenticated_access\\" ON public.blocks","CREATE POLICY \\"blocks_authenticated_user_access\\" ON public.blocks -- Renamed for clarity\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER')) AND -- This is the key change\r\n    (\r\n      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_authenticated_user_access\\" ON public.blocks IS 'Authenticated USERS (non-admin/writer) can read blocks of published parents. Admin/Writer SELECT via their management policy.'","-- Note: \\"blocks_anon_can_read_published\\" (FOR SELECT TO anon) should remain unchanged.\r\n-- Note: \\"blocks_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.\r\n\r\n-- == LANGUAGES ==\r\n-- Assuming \\"languages_admin_management\\" is FOR ALL and covers SELECT for ADMIN.\r\n-- Make \\"languages_are_publicly_readable_by_all\\" not apply to authenticated ADMINs.\r\nDROP POLICY IF EXISTS \\"languages_are_publicly_readable_by_all\\" ON public.languages","CREATE POLICY \\"languages_readable_by_anon_and_non_admins\\" ON public.languages -- Renamed\r\n  FOR SELECT\r\n  USING (\r\n    NOT (auth.role() = 'authenticated' AND public.get_current_user_role() = 'ADMIN')\r\n  )","COMMENT ON POLICY \\"languages_readable_by_anon_and_non_admins\\" ON public.languages IS 'Anonymous users and authenticated non-admins can read languages. Admin SELECT via management policy.'","-- Note: \\"languages_admin_management\\" (FOR ALL TO authenticated USING role = ADMIN) should remain unchanged.\r\n\r\n-- == MEDIA ==\r\n-- Assuming \\"media_admin_writer_management\\" is FOR ALL and covers SELECT for ADMIN/WRITER.\r\n-- Make \\"media_is_publicly_readable_by_all\\" not apply to authenticated ADMIN/WRITERs.\r\nDROP POLICY IF EXISTS \\"media_is_publicly_readable_by_all\\" ON public.media","CREATE POLICY \\"media_readable_by_anon_and_non_privileged_users\\" ON public.media -- Renamed\r\n  FOR SELECT\r\n  USING (\r\n    NOT (auth.role() = 'authenticated' AND public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  )","COMMENT ON POLICY \\"media_readable_by_anon_and_non_privileged_users\\" ON public.media IS 'Anonymous users and authenticated non-admin/writer users can read media. Admin/Writer SELECT via management policy.'","-- Note: \\"media_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.\r\n\r\n-- == NAVIGATION ITEMS ==\r\n-- Assuming \\"nav_items_admin_management\\" is FOR ALL and covers SELECT for ADMIN.\r\n-- Make \\"nav_items_are_publicly_readable_by_all\\" not apply to authenticated ADMINs.\r\nDROP POLICY IF EXISTS \\"nav_items_are_publicly_readable_by_all\\" ON public.navigation_items","CREATE POLICY \\"nav_items_readable_by_anon_and_non_admins\\" ON public.navigation_items -- Renamed\r\n  FOR SELECT\r\n  USING (\r\n    NOT (auth.role() = 'authenticated' AND public.get_current_user_role() = 'ADMIN')\r\n  )","COMMENT ON POLICY \\"nav_items_readable_by_anon_and_non_admins\\" ON public.navigation_items IS 'Anonymous users and authenticated non-admins can read nav items. Admin SELECT via management policy.'","-- Note: \\"nav_items_admin_management\\" (FOR ALL TO authenticated USING role = ADMIN) should remain unchanged.\r\n\r\n-- == PAGES ==\r\n-- Assuming \\"pages_admin_writer_management\\" is FOR ALL and covers SELECT for ADMIN/WRITER.\r\n-- Make \\"pages_authenticated_access\\" specific to non-ADMIN/WRITER authenticated users.\r\nDROP POLICY IF EXISTS \\"pages_authenticated_access\\" ON public.pages","CREATE POLICY \\"pages_user_authenticated_access\\" ON public.pages -- Renamed\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER')) AND -- This is the key change\r\n    (\r\n      (status = 'published') OR\r\n      (author_id = (SELECT auth.uid()) AND status <> 'published')\r\n    )\r\n  )","COMMENT ON POLICY \\"pages_user_authenticated_access\\" ON public.pages IS 'Authenticated USERS (non-admin/writer) can read published pages or their own drafts. Admin/Writer SELECT via their management policy.'","-- Note: \\"pages_anon_can_read_published\\" (FOR SELECT TO anon) should remain unchanged.\r\n-- Note: \\"pages_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.\r\n\r\n-- == POSTS ==\r\n-- Assuming \\"posts_admin_writer_management\\" is FOR ALL and covers SELECT for ADMIN/WRITER.\r\n-- Make \\"posts_authenticated_access\\" specific to non-ADMIN/WRITER authenticated users.\r\nDROP POLICY IF EXISTS \\"posts_authenticated_access\\" ON public.posts","CREATE POLICY \\"posts_user_authenticated_access\\" ON public.posts -- Renamed\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER')) AND -- This is the key change\r\n    (\r\n      (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR\r\n      (author_id = (SELECT auth.uid()) AND status <> 'published')\r\n    )\r\n  )","COMMENT ON POLICY \\"posts_user_authenticated_access\\" ON public.posts IS 'Authenticated USERS (non-admin/writer) can read published posts or their own drafts. Admin/Writer SELECT via their management policy.'","-- Note: \\"posts_anon_can_read_published\\" (FOR SELECT TO anon) should remain unchanged.\r\n-- Note: \\"posts_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) should remain unchanged.\r\n\r\nCOMMIT"}	resolve_select_policy_overlaps
20250526172853	{"-- supabase/migrations/YYYYMMDDHHMMSS_resolve_remaining_rls_v5.sql\r\n-- (Ensure YYYYMMDDHHMMSS is the current timestamp)\r\n\r\nBEGIN","-- == LANGUAGES ==\r\n-- Drop the policy from v4 that needs auth.role() fix and better role targeting.\r\nDROP POLICY IF EXISTS \\"languages_readable_by_anon_and_non_admins\\" ON public.languages","-- Policy for anon\r\nCREATE POLICY \\"languages_anon_can_read\\" ON public.languages\r\n  FOR SELECT TO anon USING (true)","COMMENT ON POLICY \\"languages_anon_can_read\\" ON public.languages IS 'Anonymous users can read languages.'","-- Policy for authenticated USERS (non-admins)\r\nCREATE POLICY \\"languages_user_can_read\\" ON public.languages\r\n  FOR SELECT TO authenticated\r\n  USING (public.get_current_user_role() <> 'ADMIN')","-- Allows USER and WRITER (if writer isn't admin)\r\nCOMMENT ON POLICY \\"languages_user_can_read\\" ON public.languages IS 'Authenticated non-admin users can read languages.'","-- \\"languages_admin_management\\" (FOR ALL TO authenticated USING role = ADMIN) is assumed to be current and handles admin SELECT.\r\n\r\n\r\n-- == MEDIA ==\r\n-- Drop the policy from v4\r\nDROP POLICY IF EXISTS \\"media_readable_by_anon_and_non_privileged_users\\" ON public.media","-- Policy for anon\r\nCREATE POLICY \\"media_anon_can_read\\" ON public.media\r\n  FOR SELECT TO anon USING (true)","COMMENT ON POLICY \\"media_anon_can_read\\" ON public.media IS 'Anonymous users can read media records.'","-- Policy for authenticated USERS (non-admin/writer)\r\nCREATE POLICY \\"media_user_can_read\\" ON public.media\r\n  FOR SELECT TO authenticated\r\n  USING (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"media_user_can_read\\" ON public.media IS 'Authenticated USERS (non-admin/writer) can read media records.'","-- \\"media_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.\r\n\r\n\r\n-- == NAVIGATION ITEMS ==\r\n-- Drop the policy from v4\r\nDROP POLICY IF EXISTS \\"nav_items_readable_by_anon_and_non_admins\\" ON public.navigation_items","-- Policy for anon\r\nCREATE POLICY \\"nav_items_anon_can_read\\" ON public.navigation_items\r\n  FOR SELECT TO anon USING (true)","COMMENT ON POLICY \\"nav_items_anon_can_read\\" ON public.navigation_items IS 'Anonymous users can read navigation items.'","-- Policy for authenticated USERS (non-admins)\r\nCREATE POLICY \\"nav_items_user_can_read\\" ON public.navigation_items\r\n  FOR SELECT TO authenticated\r\n  USING (public.get_current_user_role() <> 'ADMIN')","-- Allows USER and WRITER\r\nCOMMENT ON POLICY \\"nav_items_user_can_read\\" ON public.navigation_items IS 'Authenticated non-admin users can read navigation items.'","-- \\"nav_items_admin_management\\" (FOR ALL TO authenticated USING role = ADMIN) is assumed current.\r\n\r\n\r\n-- == BLOCKS ==\r\n-- Drop the \\"blocks_authenticated_user_access\\" from v4\r\nDROP POLICY IF EXISTS \\"blocks_authenticated_user_access\\" ON public.blocks","-- Recreate explicitly for USER role to avoid overlap with admin/writer FOR ALL policy\r\nCREATE POLICY \\"blocks_user_role_can_read_published_parents\\" ON public.blocks\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND\r\n    (\r\n      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_user_role_can_read_published_parents\\" ON public.blocks IS 'Authenticated USERS can read blocks of published parents. Admin/Writer SELECT via their management policy.'","-- \\"blocks_anon_can_read_published\\" (FOR SELECT TO anon) from previous migrations is assumed to be fine.\r\n-- \\"blocks_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.\r\n\r\n\r\n-- == PAGES ==\r\n-- Drop \\"pages_user_authenticated_access\\" from v4\r\nDROP POLICY IF EXISTS \\"pages_user_authenticated_access\\" ON public.pages","-- Recreate explicitly for USER role\r\nCREATE POLICY \\"pages_user_role_access\\" ON public.pages\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND\r\n    (\r\n      (status = 'published') OR\r\n      (author_id = (SELECT auth.uid()) AND status <> 'published') -- auth.uid() is fine here as it's specific to USER\r\n    )\r\n  )","COMMENT ON POLICY \\"pages_user_role_access\\" ON public.pages IS 'Authenticated USERS can read published pages or their own drafts. Admin/Writer SELECT via their management policy.'","-- \\"pages_anon_can_read_published\\" (FOR SELECT TO anon) is assumed fine.\r\n-- \\"pages_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.\r\n\r\n-- == POSTS ==\r\n-- Drop \\"posts_user_authenticated_access\\" from v4\r\nDROP POLICY IF EXISTS \\"posts_user_authenticated_access\\" ON public.posts","-- Recreate explicitly for USER role\r\nCREATE POLICY \\"posts_user_role_access\\" ON public.posts\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND\r\n    (\r\n      (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR\r\n      (author_id = (SELECT auth.uid()) AND status <> 'published') -- auth.uid() is fine here\r\n    )\r\n  )","COMMENT ON POLICY \\"posts_user_role_access\\" ON public.posts IS 'Authenticated USERS can read published posts or their own drafts. Admin/Writer SELECT via their management policy.'","-- \\"posts_anon_can_read_published\\" (FOR SELECT TO anon) is assumed fine.\r\n-- \\"posts_admin_writer_management\\" (FOR ALL TO authenticated USING role IN (ADMIN,WRITER)) is assumed current.\r\n\r\n\r\nCOMMIT"}	resolve_remaining_rls_v5
20250526173538	{"-- supabase/migrations/YYYYMMDDHHMMSS_final_rls_cleanup_v7.sql\r\n-- (Ensure YYMMDDHHMMSS is the current timestamp)\r\n\r\nBEGIN","-- == BLOCKS ==\r\n-- Conflicting: {blocks_admin_writer_management, blocks_user_role_can_read_published_parents}\r\n-- \\"blocks_admin_writer_management\\" is FOR ALL and covers SELECT for ADMIN/WRITER.\r\n-- \\"blocks_user_role_can_read_published_parents\\" is for 'USER' role.\r\n-- This structure *should* be fine. The linter might be overly cautious.\r\n-- To be absolutely sure, we ensure \\"blocks_user_role_can_read_published_parents\\" only targets 'USER'.\r\nDROP POLICY IF EXISTS \\"blocks_user_role_can_read_published_parents\\" ON public.blocks","CREATE POLICY \\"blocks_user_role_can_read_published_parents\\" ON public.blocks\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND\r\n    (\r\n      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_user_role_can_read_published_parents\\" ON public.blocks IS 'Authenticated USERS can read blocks of published parents. Admin/Writer SELECT via their FOR ALL management policy.'","-- Assuming \\"blocks_anon_can_read_published\\" and \\"blocks_admin_writer_management\\" (FOR ALL) are correct from previous migrations.\r\n\r\n\r\n-- == LANGUAGES ==\r\n-- Conflicting: {languages_admin_management, languages_user_can_read}\r\n-- \\"languages_admin_management\\" is FOR ALL and covers SELECT for ADMIN.\r\n-- \\"languages_user_can_read\\" (from v5) was: TO authenticated USING (public.get_current_user_role() <> 'ADMIN');\r\n-- This should be fine, as an ADMIN would make the USING clause false.\r\n-- To be very explicit for the linter:\r\nDROP POLICY IF EXISTS \\"languages_user_can_read\\" ON public.languages","CREATE POLICY \\"languages_authenticated_non_admin_can_read\\" ON public.languages\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    public.get_current_user_role() IN ('USER', 'WRITER') -- Explicitly target USER and WRITER\r\n  )","COMMENT ON POLICY \\"languages_authenticated_non_admin_can_read\\" ON public.languages IS 'Authenticated USER and WRITER roles can read languages. Admin SELECT via their FOR ALL management policy.'","-- Assuming \\"languages_anon_can_read\\" and \\"languages_admin_management\\" (FOR ALL) are correct.\r\n\r\n\r\n-- == MEDIA ==\r\n-- Conflicting: {media_admin_writer_management, media_user_can_read}\r\n-- \\"media_admin_writer_management\\" is FOR ALL and covers SELECT for ADMIN/WRITER.\r\n-- \\"media_user_can_read\\" (from v5) was: TO authenticated USING (public.get_current_user_role() NOT IN ('ADMIN', 'WRITER'));\r\n-- This should be fine. To be very explicit:\r\nDROP POLICY IF EXISTS \\"media_user_can_read\\" ON public.media","CREATE POLICY \\"media_user_role_can_read\\" ON public.media\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    public.get_current_user_role() = 'USER' -- Explicitly target USER role\r\n  )","COMMENT ON POLICY \\"media_user_role_can_read\\" ON public.media IS 'Authenticated USER role can read media. Admin/Writer SELECT via their FOR ALL management policy.'","-- Assuming \\"media_anon_can_read\\" and \\"media_admin_writer_management\\" (FOR ALL) are correct.\r\n\r\n\r\n-- == NAVIGATION ITEMS ==\r\n-- Conflicting: {nav_items_admin_management, nav_items_user_can_read}\r\n-- \\"nav_items_admin_management\\" is FOR ALL and covers SELECT for ADMIN.\r\n-- \\"nav_items_user_can_read\\" (from v5) was: TO authenticated USING (public.get_current_user_role() <> 'ADMIN');\r\nDROP POLICY IF EXISTS \\"nav_items_user_can_read\\" ON public.navigation_items","CREATE POLICY \\"nav_items_authenticated_non_admin_can_read\\" ON public.navigation_items\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    public.get_current_user_role() IN ('USER', 'WRITER') -- Explicitly target USER and WRITER\r\n  )","COMMENT ON POLICY \\"nav_items_authenticated_non_admin_can_read\\" ON public.navigation_items IS 'Authenticated USER and WRITER roles can read nav items. Admin SELECT via their FOR ALL management policy.'","-- Assuming \\"nav_items_anon_can_read\\" and \\"nav_items_admin_management\\" (FOR ALL) are correct.\r\n\r\n\r\n-- == PAGES ==\r\n-- Conflicting: {pages_admin_writer_management, pages_user_role_access}\r\n-- This structure is identical to blocks and should be fine if \\"pages_user_role_access\\" correctly targets only USER.\r\nDROP POLICY IF EXISTS \\"pages_user_role_access\\" ON public.pages","CREATE POLICY \\"pages_user_role_can_read\\" ON public.pages -- Consistent naming\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND\r\n    (\r\n      (status = 'published') OR\r\n      (author_id = (SELECT auth.uid()) AND status <> 'published')\r\n    )\r\n  )","COMMENT ON POLICY \\"pages_user_role_can_read\\" ON public.pages IS 'Authenticated USERS can read published pages or their own drafts. Admin/Writer SELECT via their FOR ALL management policy.'","-- Assuming \\"pages_anon_can_read_published\\" and \\"pages_admin_writer_management\\" (FOR ALL) are correct.\r\n\r\n\r\n-- == POSTS ==\r\n-- Conflicting: {posts_admin_writer_management, posts_user_role_access}\r\n-- This structure is identical to blocks/pages and should be fine if \\"posts_user_role_access\\" correctly targets only USER.\r\nDROP POLICY IF EXISTS \\"posts_user_role_access\\" ON public.posts","CREATE POLICY \\"posts_user_role_can_read\\" ON public.posts -- Consistent naming\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND\r\n    (\r\n      (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR\r\n      (author_id = (SELECT auth.uid()) AND status <> 'published')\r\n    )\r\n  )","COMMENT ON POLICY \\"posts_user_role_can_read\\" ON public.posts IS 'Authenticated USERS can read published posts or their own drafts. Admin/Writer SELECT via their FOR ALL management policy.'","-- Assuming \\"posts_anon_can_read_published\\" and \\"posts_admin_writer_management\\" (FOR ALL) are correct.\r\n\r\nCOMMIT"}	finalize_rls_cleanup_v7
20250526174710	{"-- supabase/migrations/YYYYMMDDHHMMSS_separate_write_policies_v8.sql\r\n\r\nBEGIN","-- == PROFILES ==\r\n-- Assuming \\"authenticated_can_read_profiles\\" (FOR SELECT) is correctly in place.\r\n-- Define explicit INSERT and leave UPDATE to the existing \\"authenticated_can_update_profiles\\" policy.\r\nDROP POLICY IF EXISTS \\"admins_can_insert_profiles\\" ON public.profiles","CREATE POLICY \\"admins_can_insert_profiles\\" ON public.profiles\r\n  FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"admins_can_insert_profiles\\" ON public.profiles IS 'Admins can insert new profiles.'","-- \\"authenticated_can_update_profiles\\" (FOR UPDATE) is assumed to be in place and correct.\r\n\r\n\r\n-- == BLOCKS ==\r\n-- Drop the old \\"FOR ALL\\" or \\"FOR INSERT, UPDATE, DELETE\\" management policy\r\nDROP POLICY IF EXISTS \\"blocks_admin_writer_management\\" ON public.blocks","-- Create separate policies for INSERT, UPDATE, DELETE for Admins/Writers\r\nCREATE POLICY \\"blocks_admin_writer_can_insert\\" ON public.blocks\r\n  FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_can_insert\\" ON public.blocks IS 'Admins/Writers can insert blocks.'","CREATE POLICY \\"blocks_admin_writer_can_update\\" ON public.blocks\r\n  FOR UPDATE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER')) -- USING is relevant for UPDATE\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_can_update\\" ON public.blocks IS 'Admins/Writers can update blocks.'","CREATE POLICY \\"blocks_admin_writer_can_delete\\" ON public.blocks\r\n  FOR DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_can_delete\\" ON public.blocks IS 'Admins/Writers can delete blocks.'","-- Assumed SELECT policies: \\"blocks_anon_can_read_published\\" and \\"blocks_user_role_can_read_published_parents\\" are in place.\r\n\r\n\r\n-- == LANGUAGES ==\r\nDROP POLICY IF EXISTS \\"languages_admin_management\\" ON public.languages","CREATE POLICY \\"languages_admin_can_insert\\" ON public.languages\r\n  FOR INSERT TO authenticated\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"languages_admin_can_insert\\" ON public.languages IS 'Admins can insert languages.'","CREATE POLICY \\"languages_admin_can_update\\" ON public.languages\r\n  FOR UPDATE TO authenticated\r\n  USING (public.get_current_user_role() = 'ADMIN')\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"languages_admin_can_update\\" ON public.languages IS 'Admins can update languages.'","CREATE POLICY \\"languages_admin_can_delete\\" ON public.languages\r\n  FOR DELETE TO authenticated\r\n  USING (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"languages_admin_can_delete\\" ON public.languages IS 'Admins can delete languages.'","-- Assumed SELECT policies: \\"languages_anon_can_read\\" and \\"languages_authenticated_non_admin_can_read\\" are in place.\r\n\r\n\r\n-- == MEDIA ==\r\nDROP POLICY IF EXISTS \\"media_admin_writer_management\\" ON public.media","CREATE POLICY \\"media_admin_writer_can_insert\\" ON public.media\r\n  FOR INSERT TO authenticated\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"media_admin_writer_can_insert\\" ON public.media IS 'Admins/Writers can insert media.'","CREATE POLICY \\"media_admin_writer_can_update\\" ON public.media\r\n  FOR UPDATE TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"media_admin_writer_can_update\\" ON public.media IS 'Admins/Writers can update media.'","CREATE POLICY \\"media_admin_writer_can_delete\\" ON public.media\r\n  FOR DELETE TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"media_admin_writer_can_delete\\" ON public.media IS 'Admins/Writers can delete media.'","-- Assumed SELECT policies: \\"media_anon_can_read\\" and \\"media_user_role_can_read\\" are in place.\r\n\r\n\r\n-- == NAVIGATION ITEMS ==\r\nDROP POLICY IF EXISTS \\"nav_items_admin_management\\" ON public.navigation_items","CREATE POLICY \\"nav_items_admin_can_insert\\" ON public.navigation_items\r\n  FOR INSERT TO authenticated\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"nav_items_admin_can_insert\\" ON public.navigation_items IS 'Admins can insert navigation items.'","CREATE POLICY \\"nav_items_admin_can_update\\" ON public.navigation_items\r\n  FOR UPDATE TO authenticated\r\n  USING (public.get_current_user_role() = 'ADMIN')\r\n  WITH CHECK (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"nav_items_admin_can_update\\" ON public.navigation_items IS 'Admins can update navigation items.'","CREATE POLICY \\"nav_items_admin_can_delete\\" ON public.navigation_items\r\n  FOR DELETE TO authenticated\r\n  USING (public.get_current_user_role() = 'ADMIN')","COMMENT ON POLICY \\"nav_items_admin_can_delete\\" ON public.navigation_items IS 'Admins can delete navigation items.'","-- Assumed SELECT policies: \\"nav_items_anon_can_read\\" and \\"nav_items_authenticated_non_admin_can_read\\" are in place.\r\n\r\n\r\n-- == PAGES ==\r\nDROP POLICY IF EXISTS \\"pages_admin_writer_management\\" ON public.pages","CREATE POLICY \\"pages_admin_writer_can_insert\\" ON public.pages\r\n  FOR INSERT TO authenticated\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"pages_admin_writer_can_insert\\" ON public.pages IS 'Admins/Writers can insert pages.'","CREATE POLICY \\"pages_admin_writer_can_update\\" ON public.pages\r\n  FOR UPDATE TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"pages_admin_writer_can_update\\" ON public.pages IS 'Admins/Writers can update pages.'","CREATE POLICY \\"pages_admin_writer_can_delete\\" ON public.pages\r\n  FOR DELETE TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"pages_admin_writer_can_delete\\" ON public.pages IS 'Admins/Writers can delete pages.'","-- Assumed SELECT policies: \\"pages_anon_can_read_published\\" and \\"pages_user_role_can_read\\" are in place.\r\n\r\n\r\n-- == POSTS ==\r\nDROP POLICY IF EXISTS \\"posts_admin_writer_management\\" ON public.posts","CREATE POLICY \\"posts_admin_writer_can_insert\\" ON public.posts\r\n  FOR INSERT TO authenticated\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"posts_admin_writer_can_insert\\" ON public.posts IS 'Admins/Writers can insert posts.'","CREATE POLICY \\"posts_admin_writer_can_update\\" ON public.posts\r\n  FOR UPDATE TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"posts_admin_writer_can_update\\" ON public.posts IS 'Admins/Writers can update posts.'","CREATE POLICY \\"posts_admin_writer_can_delete\\" ON public.posts\r\n  FOR DELETE TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"posts_admin_writer_can_delete\\" ON public.posts IS 'Admins/Writers can delete posts.'","-- Assumed SELECT policies: \\"posts_anon_can_read_published\\" and \\"posts_user_role_can_read\\" are in place.\r\n\r\nCOMMIT"}	separate_write_policies_v8
20250526175359	{"-- supabase/migrations/YYYYMMDDHHMMSS_fix_languages_select_rls_v9.sql\r\n\r\nBEGIN","-- == LANGUAGES ==\r\n-- Drop the specific authenticated non-admin policy\r\nDROP POLICY IF EXISTS \\"languages_authenticated_non_admin_can_read\\" ON public.languages","DROP POLICY IF EXISTS \\"languages_user_can_read\\" ON public.languages","-- If this was the one from v5 attempt\r\n\r\n-- Create a simpler, broader SELECT policy for all authenticated users for the languages table.\r\n-- The \\"multiple_permissive_policies\\" warning for languages was between \\"languages_admin_management\\" (FOR ALL)\r\n-- and \\"languages_authenticated_non_admin_can_read\\".\r\n-- If \\"languages_admin_management\\" is FOR ALL, it handles SELECT for admins.\r\n-- We need a SELECT policy for authenticated users who are NOT admins.\r\n\r\n-- Option 1: Keep admin SELECT via FOR ALL, and add specific for USER/WRITER\r\n-- (This is what was in _v6.sql basically and was still warned by linter, but might be a linter quirk)\r\n-- CREATE POLICY \\"languages_user_writer_can_read\\" ON public.languages\r\n--   FOR SELECT TO authenticated\r\n--   USING (public.get_current_user_role() IN ('USER', 'WRITER'));\r\n\r\n-- Option 2: Make the \\"publicly readable\\" policy truly public for SELECT FOR ALL ROLES,\r\n-- and ensure the admin management policy is ONLY for writes. This was the _v7.sql approach which failed syntax.\r\n\r\n-- Let's retry the _v7 approach for *just* the languages table, as it's the most robust against the linter.\r\n-- We need to be absolutely sure about the FOR INSERT, UPDATE, DELETE syntax.\r\n-- If that syntax is the absolute blocker, we're in a tough spot.\r\n\r\n-- Assuming the error \\"JSON object requested, multiple (or no) rows returned\\" means NO rows were returned,\r\n-- it means NO select policy was satisfied for the 'languages' table by the role executing getNavigationMenu.\r\n\r\n-- Let's make languages readable by any authenticated user, plus the existing anon policy.\r\n-- This might re-trigger the \\"multiple_permissive_policies\\" if the admin FOR ALL policy is still active,\r\n-- but it should fix the immediate \\"0 rows returned\\" error.\r\nCREATE POLICY \\"languages_authenticated_can_read\\" ON public.languages\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (true)","-- Any authenticated user can read languages.\r\nCOMMENT ON POLICY \\"languages_authenticated_can_read\\" ON public.languages IS 'Any authenticated user can read languages.'","-- \\"languages_anon_can_read\\" (FOR SELECT TO anon USING (true)) should still be active and is fine.\r\n-- \\"languages_admin_management\\" (FOR ALL TO authenticated USING role = ADMIN) is assumed to be active.\r\n\r\n-- This setup WILL cause a \\"multiple_permissive_policies\\" warning for an authenticated ADMIN\r\n-- because \\"languages_authenticated_can_read\\" (USING true) and the SELECT part of\r\n-- \\"languages_admin_management\\" (USING role=ADMIN) will both apply.\r\n\r\n-- The root cause of the \\"0 rows returned\\" is that *neither* of the v6 policies for authenticated\r\n-- was being met by the server-side client running getNavigationMenu, OR the client was anon\r\n-- and \\"languages_anon_can_read\\" was somehow not effective or missing.\r\n\r\n-- To ensure the `getNavigationMenu` function works for ANY role calling it:\r\n-- Let's reinstate a very simple public read policy for languages.\r\n-- This was the original policy from `20250514143016_setup_languages_table.sql`:\r\n-- `CREATE POLICY \\"languages_are_publicly_readable\\" ON public.languages FOR SELECT TO anon, authenticated USING (true);`\r\n-- This was later split.\r\n\r\n-- Cleanest approach to fix the immediate error, and then we can re-evaluate the linter:\r\n-- Ensure there's one policy that makes languages readable to everyone for SELECT.\r\nDROP POLICY IF EXISTS \\"languages_anon_can_read\\" ON public.languages","DROP POLICY IF EXISTS \\"languages_user_can_read\\" ON public.languages","DROP POLICY IF EXISTS \\"languages_authenticated_non_admin_can_read\\" ON public.languages","DROP POLICY IF EXISTS \\"languages_authenticated_can_read\\" ON public.languages","DROP POLICY IF EXISTS \\"languages_are_publicly_readable_by_all\\" ON public.languages","-- from _v2\r\nDROP POLICY IF EXISTS \\"languages_are_publicly_readable\\" ON public.languages","-- from original\r\n\r\nCREATE POLICY \\"languages_are_publicly_readable_for_all_roles\\" ON public.languages\r\n  FOR SELECT\r\n  USING (true)","-- This allows 'anon' and all types of 'authenticated' users to read.\r\nCOMMENT ON POLICY \\"languages_are_publicly_readable_for_all_roles\\" ON public.languages IS 'All roles (anon, authenticated) can read from the languages table.'","-- The \\"languages_admin_management\\" policy (FOR ALL TO authenticated USING role=ADMIN) will still exist.\r\n-- This WILL re-introduce the \\"multiple_permissive_policies\\" warning for `languages` for `authenticated SELECT`,\r\n-- because an authenticated ADMIN will match both this new public read policy and their FOR ALL management policy.\r\n-- However, it should fix your immediate \\"Error fetching language ID\\" error.\r\n\r\n-- If the `FOR INSERT, UPDATE, DELETE` syntax was the true blocker, and you *must* use `FOR ALL` for admin management,\r\n-- then the previous \\"mutually exclusive USING clause\\" approach was logically correct but the linter didn't like it.\r\n-- The above `languages_are_publicly_readable_for_all_roles` is the simplest way to ensure reads, at the cost of a linter warning.\r\n\r\nCOMMIT"}	fix_languages_select_rls_v9
20250619092430	{"DROP POLICY IF EXISTS \\"Allow admin users to insert logos\\" ON public.logos","CREATE POLICY \\"Allow admin and writer users to insert logos\\"\r\nON public.logos\r\nFOR INSERT TO authenticated\r\nWITH CHECK ((get_my_claim('user_role'::text) IN ('\\"admin\\"'::jsonb, '\\"writer\\"'::jsonb)))"}	widen_logo_insert_policy
20250526182940	{"-- supabase/migrations/YYYYMMDDHHMMSS_fix_nav_read_policy_v10.sql\r\n\r\nBEGIN","-- == NAVIGATION ITEMS ==\r\n\r\n-- Drop the existing SELECT policy for authenticated non-admins, as we'll replace it with a broader one.\r\nDROP POLICY IF EXISTS \\"nav_items_authenticated_non_admin_can_read\\" ON public.navigation_items","-- Also drop older name if it somehow exists from v5 attempt\r\nDROP POLICY IF EXISTS \\"nav_items_user_can_read\\" ON public.navigation_items","-- Create a policy that allows ALL authenticated users to read navigation items.\r\n-- This will cover USER, WRITER, and ADMIN roles for SELECT.\r\nCREATE POLICY \\"nav_items_authenticated_can_read\\" ON public.navigation_items\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (true)","-- Any authenticated user can read all navigation items.\r\nCOMMENT ON POLICY \\"nav_items_authenticated_can_read\\" ON public.navigation_items IS 'All authenticated users (USER, WRITER, ADMIN) can read navigation items.'","-- The following policies are assumed to be correctly in place and should remain:\r\n-- 1. \\"nav_items_anon_can_read\\" ON public.navigation_items FOR SELECT TO anon USING (true);\r\n-- 2. \\"nav_items_admin_can_insert\\" ON public.navigation_items FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() = 'ADMIN');\r\n-- 3. \\"nav_items_admin_can_update\\" ON public.navigation_items FOR UPDATE TO authenticated USING (public.get_current_user_role() = 'ADMIN') WITH CHECK (public.get_current_user_role() = 'ADMIN');\r\n-- 4. \\"nav_items_admin_can_delete\\" ON public.navigation_items FOR DELETE TO authenticated USING (public.get_current_user_role() = 'ADMIN');\r\n\r\nCOMMIT"}	fix_nav_read_policy_v10
20250526183239	{"-- supabase/migrations/YYYYMMDDHHMMSS_fix_posts_read_rls_v11.sql\r\n\r\nBEGIN","-- == POSTS ==\r\n\r\n-- Drop the existing specific SELECT policy for USER role if it exists\r\nDROP POLICY IF EXISTS \\"posts_user_role_can_read\\" ON public.posts","-- Drop any older variations that might exist from previous attempts\r\nDROP POLICY IF EXISTS \\"posts_user_authenticated_access\\" ON public.posts","DROP POLICY IF EXISTS \\"posts_authenticated_access\\" ON public.posts","-- Policy for anonymous users to read published posts (should already exist, ensure it's correct)\r\nDROP POLICY IF EXISTS \\"posts_anon_can_read_published\\" ON public.posts","CREATE POLICY \\"posts_anon_can_read_published\\" ON public.posts\r\n  FOR SELECT\r\n  TO anon\r\n  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()))","COMMENT ON POLICY \\"posts_anon_can_read_published\\" ON public.posts IS 'Anonymous users can read published posts.'","-- Policy for ALL authenticated users to read PUBLISHED posts.\r\n-- This covers USER, WRITER, and ADMIN for viewing public, published content.\r\nCREATE POLICY \\"posts_authenticated_can_read_published\\" ON public.posts\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()))","COMMENT ON POLICY \\"posts_authenticated_can_read_published\\" ON public.posts IS 'All authenticated users can read published posts.'","-- Policy for authenticated users (authors) to read their OWN DRAFTS/non-published posts.\r\n-- This is important for CMS previews or if authors can view their non-live content.\r\nDROP POLICY IF EXISTS \\"posts_authors_can_read_own_drafts\\" ON public.posts","CREATE POLICY \\"posts_authors_can_read_own_drafts\\" ON public.posts\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (author_id = (SELECT auth.uid()) AND status <> 'published')","COMMENT ON POLICY \\"posts_authors_can_read_own_drafts\\" ON public.posts IS 'Authenticated authors can read their own non-published posts.'","-- The admin/writer management policies for INSERT, UPDATE, DELETE remain as they are (write-only).\r\n-- e.g., \\"posts_admin_writer_can_insert\\", \\"posts_admin_writer_can_update\\", \\"posts_admin_writer_can_delete\\"\r\n-- These do NOT provide SELECT access.\r\n\r\n-- Optional: If you need ADMINs/WRITERs to be able to SELECT *ALL* posts (including drafts of others)\r\n-- for CMS management purposes (e.g., in the /cms/posts listing page), you would need an\r\n-- additional policy or ensure their management policy was FOR ALL.\r\n-- However, for public site rendering (getPostDataBySlug), the above should be sufficient.\r\n-- If your CMS listing page for posts also breaks for ADMIN/WRITER, you might need:\r\n-- CREATE POLICY \\"posts_admin_writer_can_read_all_for_cms\\" ON public.posts\r\n--   FOR SELECT\r\n--   TO authenticated\r\n--   USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'));\r\n-- This WILL re-introduce a \\"multiple_permissive_policies\\" warning for ADMIN/WRITER on SELECT,\r\n-- as they would match this AND \\"posts_authenticated_can_read_published\\".\r\n-- For now, let's stick to fixing public reads. The CMS read access might be handled differently or might need its own policy.\r\n\r\nCOMMIT"}	fix_posts_read_rls_v11
20250526183746	{"-- supabase/migrations/YYYYMMDDHHMMSS_fix_media_select_rls_v12.sql\r\n\r\nBEGIN","-- == MEDIA ==\r\n\r\n-- Drop the existing specific SELECT policy for the 'USER' role,\r\n-- as we will replace it with a broader one for all authenticated users.\r\nDROP POLICY IF EXISTS \\"media_user_role_can_read\\" ON public.media","-- Drop any older variations that might exist from previous attempts if their names were different\r\nDROP POLICY IF EXISTS \\"media_user_can_read\\" ON public.media","DROP POLICY IF EXISTS \\"media_readable_by_anon_and_non_privileged_users\\" ON public.media","-- Policy for anonymous users to read media (ensure this is in place and correct)\r\n-- This policy allows anyone to read any media record if no other policy restricts them.\r\n-- This is generally desired if your R2 bucket URLs are guessable or if images are meant to be public.\r\nDROP POLICY IF EXISTS \\"media_anon_can_read\\" ON public.media","-- From _v6/_v7 logic\r\nDROP POLICY IF EXISTS \\"media_is_publicly_readable_by_all\\" ON public.media","-- From _v8 logic\r\nDROP POLICY IF EXISTS \\"media_is_readable_by_all\\" ON public.media","-- Older name\r\nDROP POLICY IF EXISTS \\"media_are_publicly_readable\\" ON public.media","-- Older name\r\n\r\nCREATE POLICY \\"media_public_can_read\\" ON public.media\r\n  FOR SELECT\r\n  USING (true)","-- Allows both 'anon' and 'authenticated' roles to read by default\r\nCOMMENT ON POLICY \\"media_public_can_read\\" ON public.media IS 'All users (anonymous and authenticated) can read media records. This is the general read access.'","-- The admin/writer management policies for INSERT, UPDATE, DELETE remain as they are (write-only).\r\n-- e.g., \\"media_admin_writer_can_insert\\", \\"media_admin_writer_can_update\\", \\"media_admin_writer_can_delete\\"\r\n-- These do NOT provide SELECT access.\r\n\r\n-- With the \\"media_public_can_read\\" policy USING (true), all authenticated users (USER, WRITER, ADMIN)\r\n-- will have SELECT access. This should resolve the error when fetching feature_image_id details\r\n-- and allow images to be displayed.\r\n-- This will also mean the linter should not complain about \\"multiple permissive policies for authenticated SELECT\\"\r\n-- because the management policies are write-only, and there's now one clear \\"public read\\" policy for SELECT.\r\n\r\nCOMMIT"}	fix_media_select_rls_v12
20250526184205	{"-- supabase/migrations/YYYYMMDDHHMMSS_consolidate_content_read_rls_v13.sql\r\n\r\nBEGIN","-- == POSTS ==\r\n\r\n-- Drop the existing separate SELECT policies for authenticated users on posts\r\nDROP POLICY IF EXISTS \\"posts_authenticated_can_read_published\\" ON public.posts","DROP POLICY IF EXISTS \\"posts_authors_can_read_own_drafts\\" ON public.posts","-- Drop any older variations that might exist\r\nDROP POLICY IF EXISTS \\"posts_user_role_can_read\\" ON public.posts","DROP POLICY IF EXISTS \\"posts_user_authenticated_access\\" ON public.posts","DROP POLICY IF EXISTS \\"posts_authenticated_access\\" ON public.posts","-- Create a single, comprehensive SELECT policy for authenticated users on posts\r\nCREATE POLICY \\"posts_authenticated_comprehensive_read\\" ON public.posts\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    -- Condition 1: Any authenticated user can read PUBLISHED posts\r\n    (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR\r\n    -- Condition 2: Authenticated authors can read their OWN NON-PUBLISHED posts\r\n    (author_id = (SELECT auth.uid()) AND status <> 'published') OR\r\n    -- Condition 3: ADMINs and WRITERs can read ALL posts (any status)\r\n    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  )","COMMENT ON POLICY \\"posts_authenticated_comprehensive_read\\" ON public.posts IS 'Handles all SELECT scenarios for authenticated users: published for all, own drafts for authors, and all posts for admins/writers.'","-- \\"posts_anon_can_read_published\\" (FOR SELECT TO anon) is assumed to be correct and in place.\r\n-- Admin/Writer management policies (FOR INSERT, UPDATE, DELETE) are assumed to be correct and in place.\r\n\r\n\r\n-- == PAGES ==\r\n\r\n-- Drop the existing separate SELECT policies for authenticated users on pages\r\nDROP POLICY IF EXISTS \\"pages_authenticated_can_read_published\\" ON public.pages","-- If created in a previous step\r\nDROP POLICY IF EXISTS \\"pages_authors_can_read_own_drafts\\" ON public.pages","-- If created\r\nDROP POLICY IF EXISTS \\"pages_user_role_can_read\\" ON public.pages","DROP POLICY IF EXISTS \\"pages_user_authenticated_access\\" ON public.pages","DROP POLICY IF EXISTS \\"pages_authenticated_access\\" ON public.pages","-- Create a single, comprehensive SELECT policy for authenticated users on pages\r\nCREATE POLICY \\"pages_authenticated_comprehensive_read\\" ON public.pages\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    -- Condition 1: Any authenticated user can read PUBLISHED pages\r\n    (status = 'published') OR\r\n    -- Condition 2: Authenticated authors can read their OWN NON-PUBLISHED pages\r\n    (author_id = (SELECT auth.uid()) AND status <> 'published') OR\r\n    -- Condition 3: ADMINs and WRITERs can read ALL pages (any status)\r\n    (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  )","COMMENT ON POLICY \\"pages_authenticated_comprehensive_read\\" ON public.pages IS 'Handles all SELECT scenarios for authenticated users: published for all, own drafts for authors, and all pages for admins/writers.'","-- \\"pages_anon_can_read_published\\" (FOR SELECT TO anon) is assumed to be correct and in place.\r\n-- Admin/Writer management policies (FOR INSERT, UPDATE, DELETE) are assumed to be correct and in place.\r\n\r\nCOMMIT"}	consolidate_content_read_rls_v13
20250526185854	{"-- supabase/migrations/YYYYMMDDHHMMSS_optimize_indexes.sql\r\n-- (Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file, e.g., 20250526185854)\r\n\r\nBEGIN","-- Add indexes for foreign keys in the 'public.blocks' table\r\nCREATE INDEX IF NOT EXISTS idx_blocks_language_id ON public.blocks(language_id)","COMMENT ON INDEX public.idx_blocks_language_id IS 'Index for the foreign key blocks_language_id_fkey on public.blocks.'","CREATE INDEX IF NOT EXISTS idx_blocks_page_id ON public.blocks(page_id)","COMMENT ON INDEX public.idx_blocks_page_id IS 'Index for the foreign key blocks_page_id_fkey on public.blocks.'","CREATE INDEX IF NOT EXISTS idx_blocks_post_id ON public.blocks(post_id)","COMMENT ON INDEX public.idx_blocks_post_id IS 'Index for the foreign key blocks_post_id_fkey on public.blocks.'","-- Add index for foreign key in the 'public.media' table\r\nCREATE INDEX IF NOT EXISTS idx_media_uploader_id ON public.media(uploader_id)","COMMENT ON INDEX public.idx_media_uploader_id IS 'Index for the foreign key media_uploader_id_fkey on public.media.'","-- Add indexes for foreign keys in the 'public.navigation_items' table\r\nCREATE INDEX IF NOT EXISTS idx_navigation_items_language_id ON public.navigation_items(language_id)","COMMENT ON INDEX public.idx_navigation_items_language_id IS 'Index for the foreign key navigation_items_language_id_fkey on public.navigation_items.'","CREATE INDEX IF NOT EXISTS idx_navigation_items_page_id ON public.navigation_items(page_id)","COMMENT ON INDEX public.idx_navigation_items_page_id IS 'Index for the foreign key navigation_items_page_id_fkey on public.navigation_items.'","CREATE INDEX IF NOT EXISTS idx_navigation_items_parent_id ON public.navigation_items(parent_id)","COMMENT ON INDEX public.idx_navigation_items_parent_id IS 'Index for the foreign key navigation_items_parent_id_fkey on public.navigation_items.'","-- Add index for foreign key in the 'public.pages' table\r\nCREATE INDEX IF NOT EXISTS idx_pages_author_id ON public.pages(author_id)","COMMENT ON INDEX public.idx_pages_author_id IS 'Index for the foreign key pages_author_id_fkey on public.pages.'","-- Add indexes for foreign keys in the 'public.posts' table\r\nCREATE INDEX IF NOT EXISTS idx_posts_feature_image_id ON public.posts(feature_image_id)","COMMENT ON INDEX public.idx_posts_feature_image_id IS 'Index for the foreign key fk_feature_image on public.posts.'","CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id)","COMMENT ON INDEX public.idx_posts_author_id IS 'Index for the foreign key posts_author_id_fkey on public.posts.'","-- Remove unused index in 'public.navigation_items' table\r\n-- The linter identified 'idx_navigation_items_translation_group_id' as unused.\r\n-- This index was created in migration 20250520171900_add_translation_group_to_nav_items.sql\r\nDROP INDEX IF EXISTS public.idx_navigation_items_translation_group_id","-- The COMMENT ON for the dropped index has been removed to prevent the error.\r\n\r\nCOMMIT"}	optimize_indexes
20250618151500	{"-- Reverts the RLS policies on storage.objects that caused the upload failure.\r\n\r\nDROP POLICY IF EXISTS \\"allow_authenticated_uploads\\" ON storage.objects","DROP POLICY IF EXISTS \\"allow_authenticated_select\\" ON storage.objects","DROP POLICY IF EXISTS \\"allow_authenticated_updates\\" ON storage.objects","DROP POLICY IF EXISTS \\"allow_authenticated_deletes\\" ON storage.objects"}	revert_storage_rls
20250619093122	{"CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)\r\nRETURNS JSONB AS $$\r\n  SET search_path = '';\r\n  SELECT COALESCE(current_setting('request.jwt.claims', true)::JSONB ->> claim, NULL)::JSONB\r\n$$ LANGUAGE SQL VOLATILE"}	fix_get_my_claim_volatility
20250526190900	{"-- supabase/migrations/YYYYMMDDHHMMSS_debug_blocks_rls.sql\r\n\r\nBEGIN","-- Drop the more specific separated write policies for blocks from v8\r\nDROP POLICY IF EXISTS \\"blocks_admin_writer_can_insert\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_update\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_delete\\" ON public.blocks","-- Reinstate a broad \\"FOR ALL\\" policy for ADMINS and WRITERS on blocks\r\n-- This is similar to what was effectively in place before v8 for admin/writer management.\r\nCREATE POLICY \\"blocks_admin_writer_management_reinstated\\" ON public.blocks\r\n  FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_management_reinstated\\" ON public.blocks IS 'Reinstated FOR ALL policy for ADMIN/WRITER to manage blocks. This may cause linter warnings for SELECT overlaps if other SELECT policies exist but is for debugging block creation.'","-- Ensure SELECT policies for other roles are still in place and don't conflict in a breaking way.\r\n-- The policies \\"blocks_anon_can_read_published\\" and \\"blocks_user_role_can_read_published_parents\\" (from v5/v7) handle reads for anon and USERs.\r\n-- \\"blocks_anon_can_read_published\\" (FOR SELECT TO anon USING (...))\r\n-- \\"blocks_user_role_can_read_published_parents\\" (FOR SELECT TO authenticated USING (public.get_current_user_role() = 'USER' AND ...))\r\n\r\n-- Let's re-assert the anon read policy to be sure it's correct, as it was defined early on.\r\nDROP POLICY IF EXISTS \\"blocks_are_readable_if_parent_is_published\\" ON public.blocks","-- Original name from 20250514171553\r\nDROP POLICY IF EXISTS \\"blocks_anon_can_read_published\\" ON public.blocks","-- Renamed in 20250526153321\r\n\r\nCREATE POLICY \\"blocks_anon_can_read_published_content\\" ON public.blocks\r\n  FOR SELECT\r\n  TO anon\r\n  USING (\r\n    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n  )","COMMENT ON POLICY \\"blocks_anon_can_read_published_content\\" ON public.blocks IS 'Anonymous users can read blocks of published parent pages/posts.'","-- Re-assert the USER role SELECT policy, ensuring it only applies to USER.\r\nDROP POLICY IF EXISTS \\"blocks_authenticated_user_access\\" ON public.blocks","-- From v4\r\nDROP POLICY IF EXISTS \\"blocks_user_role_can_read_published_parents\\" ON public.blocks","-- From v5/v7\r\n\r\nCREATE POLICY \\"blocks_auth_users_can_read_published_parents\\" ON public.blocks\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (public.get_current_user_role() = 'USER') AND -- Crucially, only applies to 'USER' role\r\n    (\r\n      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_auth_users_can_read_published_parents\\" ON public.blocks IS 'Authenticated USERS can read blocks of published parents. Admin/Writer SELECT is handled by their management policy.'",COMMIT}	debug_blocks_rls
20250526191217	{"-- supabase/migrations/YYYYMMDDHHMMSS_consolidate_blocks_select_rls.sql\r\n-- (Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file)\r\n\r\nBEGIN","-- Drop existing policies for 'public.blocks' that will be replaced or refined.\r\n-- This includes the broad \\"FOR ALL\\" policy and the specific \\"USER\\" SELECT policy\r\n-- created in the previous debug migration.\r\nDROP POLICY IF EXISTS \\"blocks_admin_writer_management_reinstated\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_auth_users_can_read_published_parents\\" ON public.blocks","-- The \\"blocks_anon_can_read_published_content\\" policy can remain as it targets 'anon'\r\n-- and does not conflict with 'authenticated' role policies for the linter's warning.\r\n-- However, if you wish to have a completely clean slate before adding the consolidated one,\r\n-- you can drop and re-add it. For this exercise, we'll assume it's fine and already specific.\r\n-- If it was named \\"blocks_anon_can_read_published\\" from 20250526153321_optimize_rls_policies.sql:\r\n-- DROP POLICY IF EXISTS \\"blocks_anon_can_read_published\\" ON public.blocks;\r\n-- Or if it was \\"blocks_are_readable_if_parent_is_published\\" from 20250514171553_create_blocks_table.sql:\r\n-- DROP POLICY IF EXISTS \\"blocks_are_readable_if_parent_is_published\\" ON public.blocks;\r\n-- Re-creating the anon policy for clarity and to ensure it's exactly as needed:\r\nDROP POLICY IF EXISTS \\"blocks_anon_can_read_published_content\\" ON public.blocks","-- From debug migration\r\nDROP POLICY IF EXISTS \\"blocks_anon_can_read_published\\" ON public.blocks","-- From optimize_rls_policies\r\nDROP POLICY IF EXISTS \\"blocks_are_readable_if_parent_is_published\\" ON public.blocks","-- From initial table creation\r\n\r\nCREATE POLICY \\"blocks_anon_can_read_published_blocks\\" ON public.blocks\r\n  FOR SELECT\r\n  TO anon\r\n  USING (\r\n    (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n    (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n  )","COMMENT ON POLICY \\"blocks_anon_can_read_published_blocks\\" ON public.blocks IS 'Anonymous users can read blocks of published parent content.'","-- Create a single, comprehensive SELECT policy for ALL authenticated users on blocks\r\nCREATE POLICY \\"blocks_authenticated_comprehensive_select\\" ON public.blocks\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (\r\n      -- Condition for ADMIN or WRITER: they can read ALL blocks\r\n      public.get_current_user_role() IN ('ADMIN', 'WRITER')\r\n    ) OR\r\n    (\r\n      -- Condition for USER: they can read blocks of published parents\r\n      (public.get_current_user_role() = 'USER') AND\r\n      (\r\n        (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n        (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n      )\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_authenticated_comprehensive_select\\" ON public.blocks IS 'Comprehensive SELECT policy for authenticated users on the blocks table, differentiating access by role (ADMIN/WRITER see all, USER sees blocks of published parents).'","-- Re-add the specific management policies for INSERT, UPDATE, DELETE for ADMIN/WRITER.\r\n-- These only have WITH CHECK (for INSERT/UPDATE) or USING (for DELETE/UPDATE) based on role.\r\n-- These were the ones created in 20250526174710_separate_write_policies_v8.sql and are fine.\r\n\r\nCREATE POLICY \\"blocks_admin_writer_can_insert\\" ON public.blocks\r\n  FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_can_insert\\" ON public.blocks IS 'Admins/Writers can insert blocks.'","CREATE POLICY \\"blocks_admin_writer_can_update\\" ON public.blocks\r\n  FOR UPDATE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER')) -- Who can be targeted by an update\r\n  WITH CHECK (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","-- What rows can be created/modified by them\r\nCOMMENT ON POLICY \\"blocks_admin_writer_can_update\\" ON public.blocks IS 'Admins/Writers can update blocks.'","CREATE POLICY \\"blocks_admin_writer_can_delete\\" ON public.blocks\r\n  FOR DELETE\r\n  TO authenticated\r\n  USING (public.get_current_user_role() IN ('ADMIN', 'WRITER'))","COMMENT ON POLICY \\"blocks_admin_writer_can_delete\\" ON public.blocks IS 'Admins/Writers can delete blocks.'",COMMIT}	consolidate_blocks_select_rls
20250526192822	{"-- supabase/migrations/YYYYMMDDHHMMSS_fix_handle_languages_update_search_path.sql\r\n-- (Replace YYYYMMDDHHMMSS with the actual timestamp of this migration file)\r\n\r\nBEGIN","-- Step 1: Drop the existing trigger that depends on the function.\r\nDROP TRIGGER IF EXISTS on_languages_update ON public.languages","-- Step 2: Now it's safe to drop and recreate the function.\r\nDROP FUNCTION IF EXISTS public.handle_languages_update()","CREATE OR REPLACE FUNCTION public.handle_languages_update()\r\nRETURNS TRIGGER\r\nLANGUAGE plpgsql\r\nSECURITY DEFINER -- Explicitly set security context\r\nSET search_path = public -- Explicitly set search_path\r\nAS $$\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n$$","COMMENT ON FUNCTION public.handle_languages_update() IS 'Sets updated_at timestamp on language update. Includes explicit search_path and security definer.'","-- Step 3: Re-create the trigger to use the updated function.\r\nCREATE TRIGGER on_languages_update\r\n  BEFORE UPDATE ON public.languages\r\n  FOR EACH ROW\r\n  EXECUTE PROCEDURE public.handle_languages_update()",COMMIT}	fix_handle_languages_update_search_path
20250527150500	{"-- Fix blocks RLS policy to resolve joined query issues\r\n-- Replace public.get_current_user_role() with direct EXISTS queries\r\n\r\nBEGIN","-- Drop the existing comprehensive SELECT policy that uses the problematic function\r\nDROP POLICY IF EXISTS \\"blocks_authenticated_comprehensive_select\\" ON public.blocks","-- Drop the existing management policies that use the problematic function\r\nDROP POLICY IF EXISTS \\"blocks_admin_writer_can_insert\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_update\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_delete\\" ON public.blocks","-- Create a new comprehensive SELECT policy using direct EXISTS queries\r\nCREATE POLICY \\"blocks_authenticated_comprehensive_select\\" ON public.blocks\r\n  FOR SELECT\r\n  TO authenticated\r\n  USING (\r\n    (\r\n      -- Condition for ADMIN or WRITER: they can read ALL blocks\r\n      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER'))\r\n    ) OR\r\n    (\r\n      -- Condition for USER: they can read blocks of published parents\r\n      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'USER') AND\r\n      (\r\n        (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n        (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n      )\r\n    )\r\n  )","COMMENT ON POLICY \\"blocks_authenticated_comprehensive_select\\" ON public.blocks IS 'Comprehensive SELECT policy for authenticated users on the blocks table, differentiating access by role (ADMIN/WRITER see all, USER sees blocks of published parents). Uses direct EXISTS queries to avoid function call issues in joined queries.'","-- Re-create the management policies using direct EXISTS queries\r\nCREATE POLICY \\"blocks_admin_writer_can_insert\\" ON public.blocks\r\n  FOR INSERT\r\n  TO authenticated\r\n  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER')))","COMMENT ON POLICY \\"blocks_admin_writer_can_insert\\" ON public.blocks IS 'Admins/Writers can insert blocks.'","CREATE POLICY \\"blocks_admin_writer_can_update\\" ON public.blocks\r\n  FOR UPDATE\r\n  TO authenticated\r\n  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER'))) -- Who can be targeted by an update\r\n  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER')))","-- What rows can be created/modified by them\r\nCOMMENT ON POLICY \\"blocks_admin_writer_can_update\\" ON public.blocks IS 'Admins/Writers can update blocks.'","CREATE POLICY \\"blocks_admin_writer_can_delete\\" ON public.blocks\r\n  FOR DELETE\r\n  TO authenticated\r\n  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'WRITER')))","COMMENT ON POLICY \\"blocks_admin_writer_can_delete\\" ON public.blocks IS 'Admins/Writers can delete blocks.'",COMMIT}	fix_blocks_rls_policy
20250602150602	{"ALTER TABLE public.media\r\nADD COLUMN blur_data_url TEXT NULL","COMMENT ON COLUMN public.media.blur_data_url IS 'Stores the base64 encoded string for image blur placeholders.'"}	add_blur_data_url_to_media
20250602150959	{"ALTER TABLE public.media\r\nADD COLUMN variants JSONB NULL","COMMENT ON COLUMN public.media.variants IS 'Stores an array of image variant objects, including different sizes and formats.'"}	add_variants_to_media
20250618124000	{"CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)\r\nRETURNS JSONB AS $$\r\n  SELECT COALESCE(current_setting('request.jwt.claims', true)::JSONB ->> claim, NULL)::JSONB\r\n$$ LANGUAGE SQL STABLE"}	create_get_my_claim_function
20250618124100	{"CREATE TABLE public.logos (\r\n    id uuid NOT NULL DEFAULT gen_random_uuid(),\r\n    created_at timestamp with time zone NOT NULL DEFAULT now(),\r\n    name text NOT NULL,\r\n    media_id uuid,\r\n    CONSTRAINT logos_pkey PRIMARY KEY (id),\r\n    CONSTRAINT logos_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL\r\n)","COMMENT ON TABLE public.logos IS 'Stores company and brand logos.'","COMMENT ON COLUMN public.logos.name IS 'The name of the brand or company for the logo.'","COMMENT ON COLUMN public.logos.media_id IS 'Foreign key to the media table for the logo image.'","GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.logos TO authenticated","ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY","CREATE POLICY \\"Allow admin users to manage logos\\"\r\nON public.logos\r\nFOR ALL\r\nTO authenticated\r\nUSING ((get_my_claim('user_role'::text) = '\\"admin\\"'::jsonb))\r\nWITH CHECK ((get_my_claim('user_role'::text) = '\\"admin\\"'::jsonb))","CREATE POLICY \\"Allow read access for authenticated users on logos\\"\r\nON public.logos\r\nFOR SELECT\r\nTO authenticated\r\nUSING (true)"}	create_logos_table
20250619104249	{"-- Step 1: Drop all dependent policies first.\r\nDROP POLICY IF EXISTS \\"Allow admins to manage logos\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow users to insert logos\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo insert for writers and admins\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo update for admins\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo delete for admins\\" ON public.logos","-- Step 2: Drop the old function to avoid return type conflicts.\r\n-- Note: It's critical to drop policies before the function they depend on.\r\nDROP FUNCTION IF EXISTS get_my_claim(text) CASCADE","-- Step 3: Redefine the get_my_claim function to be more robust and return TEXT.\r\n-- This avoids JSON casting errors and type mismatches in policies.\r\nCREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)\r\nRETURNS TEXT AS $$\r\nDECLARE\r\n    claims jsonb;\r\n    claim_value text;\r\nBEGIN\r\n    -- Safely get claims, defaulting to NULL if not present or invalid JSON\r\n    BEGIN\r\n        claims := current_setting('request.jwt.claims', true)::jsonb;\r\n    EXCEPTION\r\n        WHEN invalid_text_representation THEN\r\n            claims := NULL;\r\n    END;\r\n\r\n    -- If claims are NULL, return NULL\r\n    IF claims IS NULL THEN\r\n        RETURN NULL;\r\n    END IF;\r\n\r\n    -- Safely extract the claim value as text, removing quotes\r\n    claim_value := claims ->> claim;\r\n\r\n    RETURN claim_value;\r\nEND;\r\n$$ LANGUAGE plpgsql VOLATILE","-- Create the new, correct policies using the updated function\r\nCREATE POLICY \\"Allow logo insert for writers and admins\\"\r\nON public.logos\r\nFOR INSERT\r\nWITH CHECK (get_my_claim('user_role') IN ('admin', 'writer'))","CREATE POLICY \\"Allow logo update for admins\\"\r\nON public.logos\r\nFOR UPDATE\r\nUSING (get_my_claim('user_role') = 'admin')\r\nWITH CHECK (get_my_claim('user_role') = 'admin')","CREATE POLICY \\"Allow logo delete for admins\\"\r\nON public.logos\r\nFOR DELETE\r\nUSING (get_my_claim('user_role') = 'admin')"}	consolidated_logo_rls_fix
20250619110700	{"-- Step 1: Drop all dependent policies first.\r\nDROP POLICY IF EXISTS \\"Allow admins to manage logos\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow users to insert logos\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo insert for writers and admins\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo update for admins\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo delete for admins\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo insert for authenticated users\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo update for authenticated users\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo delete for authenticated users\\" ON public.logos","-- Step 2: Drop the old function to avoid return type conflicts.\r\n-- Note: It's critical to drop policies before the function they depend on.\r\nDROP FUNCTION IF EXISTS get_my_claim(text) CASCADE","-- Step 3: Redefine the get_my_claim function to be more robust and return TEXT.\r\n-- This avoids JSON casting errors and type mismatches in policies.\r\nCREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)\r\nRETURNS TEXT AS $$\r\nDECLARE\r\n    claims jsonb;\r\n    claim_value text;\r\nBEGIN\r\n    -- Safely get claims, defaulting to NULL if not present or invalid JSON\r\n    BEGIN\r\n        claims := current_setting('request.jwt.claims', true)::jsonb;\r\n    EXCEPTION\r\n        WHEN invalid_text_representation THEN\r\n            claims := NULL;\r\n    END;\r\n\r\n    -- If claims are NULL, return NULL\r\n    IF claims IS NULL THEN\r\n        RETURN NULL;\r\n    END IF;\r\n\r\n    -- Safely extract the claim value as text, removing quotes\r\n    claim_value := claims ->> claim;\r\n\r\n    RETURN claim_value;\r\nEND;\r\n$$ LANGUAGE plpgsql VOLATILE","-- Create the new, correct policies using the updated function\r\nCREATE POLICY \\"Allow logo insert for authenticated users\\"\r\nON public.logos\r\nFOR INSERT\r\nWITH CHECK (auth.role() = 'authenticated')","CREATE POLICY \\"Allow logo update for authenticated users\\"\r\nON public.logos\r\nFOR UPDATE\r\nUSING (auth.role() = 'authenticated')\r\nWITH CHECK (auth.role() = 'authenticated')","CREATE POLICY \\"Allow logo delete for authenticated users\\"\r\nON public.logos\r\nFOR DELETE\r\nUSING (auth.role() = 'authenticated')"}	fix_logo_rls_again
20250619113200	{"ALTER TABLE public.media\r\nADD COLUMN file_path TEXT","COMMENT ON COLUMN public.media.file_path IS 'The full path to the file in the storage bucket.'"}	add_file_path_to_media
20250619124100	{BEGIN,"-- Drop existing policies for 'public.logos'\r\nDROP POLICY IF EXISTS \\"Allow logo insert for authenticated users\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo update for authenticated users\\" ON public.logos","DROP POLICY IF EXISTS \\"Allow logo delete for authenticated users\\" ON public.logos","-- Recreate policies for 'public.logos' with optimized auth calls\r\nCREATE POLICY \\"Allow logo insert for authenticated users\\"\r\nON public.logos\r\nFOR INSERT\r\nWITH CHECK ((SELECT auth.role()) = 'authenticated')","CREATE POLICY \\"Allow logo update for authenticated users\\"\r\nON public.logos\r\nFOR UPDATE\r\nUSING ((SELECT auth.role()) = 'authenticated')\r\nWITH CHECK ((SELECT auth.role()) = 'authenticated')","CREATE POLICY \\"Allow logo delete for authenticated users\\"\r\nON public.logos\r\nFOR DELETE\r\nUSING ((SELECT auth.role()) = 'authenticated')","-- Drop existing policies for 'public.blocks'\r\nDROP POLICY IF EXISTS \\"blocks_authenticated_comprehensive_select\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_insert\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_update\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_admin_writer_can_delete\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_anon_can_read_published_blocks\\" ON public.blocks","DROP POLICY IF EXISTS \\"blocks_are_readable_if_parent_is_published\\" ON public.blocks","-- Create a new comprehensive SELECT policy for 'public.blocks'\r\nCREATE POLICY \\"Allow read access to blocks\\" ON public.blocks\r\nFOR SELECT USING (\r\n  (\r\n    -- Anonymous users can read blocks of published content\r\n    (SELECT auth.role()) = 'anon' AND\r\n    (\r\n      (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n      (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n    )\r\n  ) OR (\r\n    -- Authenticated users have role-based access\r\n    (SELECT auth.role()) = 'authenticated' AND\r\n    (\r\n      (\r\n        -- ADMIN or WRITER can read all blocks\r\n        EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER'))\r\n      ) OR\r\n      (\r\n        -- USER can read blocks of published parents\r\n        EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'USER') AND\r\n        (\r\n          (page_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.pages p WHERE p.id = blocks.page_id AND p.status = 'published')) OR\r\n          (post_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.posts pt WHERE pt.id = blocks.post_id AND pt.status = 'published' AND (pt.published_at IS NULL OR pt.published_at <= now())))\r\n        )\r\n      )\r\n    )\r\n  )\r\n)","-- Re-create the management policies for 'public.blocks' with optimized auth calls\r\nCREATE POLICY \\"Allow insert for admins and writers on blocks\\" ON public.blocks\r\nFOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')))","CREATE POLICY \\"Allow update for admins and writers on blocks\\" ON public.blocks\r\nFOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')))\r\nWITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')))","CREATE POLICY \\"Allow delete for admins and writers on blocks\\" ON public.blocks\r\nFOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('ADMIN', 'WRITER')))",COMMIT}	fix_rls_performance_warnings
20250619195500	{"-- supabase/migrations/20250619195500_create_site_settings_table.sql\r\n\r\nCREATE TABLE public.site_settings (\r\n    key TEXT PRIMARY KEY,\r\n    value JSONB\r\n)","-- Enable RLS\r\nALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY","-- Allow admins to do everything\r\nCREATE POLICY \\"Allow admins full access on site_settings\\"\r\nON public.site_settings\r\nFOR ALL\r\nTO authenticated\r\nUSING (get_my_claim('user_role') = '\\"admin\\"')","-- Allow authenticated users to read settings\r\nCREATE POLICY \\"Allow authenticated users to read site_settings\\"\r\nON public.site_settings\r\nFOR SELECT\r\nTO authenticated\r\nUSING (true)","-- Seed initial copyright setting\r\nINSERT INTO public.site_settings (key, value)\r\nVALUES ('footer_copyright', '{\\"en\\": \\"© {year} My Ultra-Fast CMS. All rights reserved.\\"}')\r\nON CONFLICT (key) DO NOTHING"}	create_site_settings_table
20250619201500	{"-- supabase/migrations/20250619201500_add_anon_read_to_site_settings.sql\r\n\r\nCREATE POLICY \\"Allow public read access to site_settings\\"\r\nON public.site_settings\r\nFOR SELECT\r\nTO anon\r\nUSING (true)"}	add_anon_read_to_site_settings
20250619202000	{"-- Add is_active column to languages table\r\nALTER TABLE public.languages\r\nADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true","COMMENT ON COLUMN public.languages.is_active IS 'Indicates if the language is currently active and available for use.'"}	add_is_active_to_languages
20250620085700	{"-- This policy grants permission to insert into the site_settings table\r\n-- to any authenticated user with the role of 'ADMIN' or 'WRITER'.\r\nCREATE POLICY \\"Allow ADMIN and WRITER to insert into site_settings\\"\r\nON public.site_settings\r\nFOR INSERT\r\nTO authenticated\r\nWITH CHECK (\r\n  (get_my_claim('user_role') = 'ADMIN') OR\r\n  (get_my_claim('user_role') = 'WRITER')\r\n)","-- This policy grants permission to update the site_settings table\r\n-- to any authenticated user with the role of 'ADMIN' or 'WRITER'.\r\nCREATE POLICY \\"Allow ADMIN and WRITER to update site_settings\\"\r\nON public.site_settings\r\nFOR UPDATE\r\nTO authenticated\r\nUSING (\r\n  (get_my_claim('user_role') = 'ADMIN') OR\r\n  (get_my_claim('user_role') = 'WRITER')\r\n)\r\nWITH CHECK (\r\n  (get_my_claim('user_role') = 'ADMIN') OR\r\n  (get_my_claim('user_role') = 'WRITER')\r\n)"}	fix_site_settings_write_rls
20250620095500	{"-- Drop the policy if it exists to ensure a clean state.\r\nDROP POLICY IF EXISTS \\"Allow user to read their own profile\\" ON public.profiles","-- This policy allows an authenticated user to read their own row from the profiles table.\r\n-- This is necessary for other RLS policies (like the one on site_settings) to be able\r\n-- to look up the user's role during policy evaluation.\r\nCREATE POLICY \\"Allow user to read their own profile\\"\r\nON public.profiles\r\nFOR SELECT\r\nTO authenticated\r\nUSING (auth.uid() = id)"}	fix_profiles_read_rls
20250620100000	{"-- Drop all previous policies on site_settings to ensure a clean slate.\r\nDROP POLICY IF EXISTS \\"Allow ADMIN and WRITER to insert into site_settings\\" ON public.site_settings","DROP POLICY IF EXISTS \\"Allow ADMIN and WRITER to update site_settings\\" ON public.site_settings","DROP POLICY IF EXISTS \\"Allow ADMIN and WRITER to modify site_settings\\" ON public.site_settings","-- Create a trusted, elevated-privilege function to get the current user's role.\r\n-- SECURITY DEFINER makes it run with the permissions of the function owner, bypassing nested RLS.\r\nCREATE OR REPLACE FUNCTION get_my_role()\r\nRETURNS TEXT AS $$\r\nDECLARE\r\n  user_role TEXT;\r\nBEGIN\r\n  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();\r\n  RETURN user_role;\r\nEND;\r\n$$ LANGUAGE plpgsql SECURITY DEFINER","-- This policy grants permission to insert into the site_settings table\r\n-- by using the trusted function to check the user's role.\r\nCREATE POLICY \\"Allow insert based on user role\\"\r\nON public.site_settings\r\nFOR INSERT\r\nTO authenticated\r\nWITH CHECK (\r\n  get_my_role() IN ('ADMIN', 'WRITER')\r\n)","-- This policy grants permission to update the site_settings table\r\n-- by using the trusted function to check the user's role.\r\nCREATE POLICY \\"Allow update based on user role\\"\r\nON public.site_settings\r\nFOR UPDATE\r\nTO authenticated\r\nUSING (\r\n  get_my_role() IN ('ADMIN', 'WRITER')\r\n)\r\nWITH CHECK (\r\n  get_my_role() IN ('ADMIN', 'WRITER')\r\n)"}	use_security_definer_for_rls
20250620130000	{"CREATE POLICY \\"Allow public read access to logos\\"\r\nON public.logos\r\nFOR SELECT\r\nUSING (true)"}	add_public_read_to_logos
20250708091700	{"-- Create the translations table\r\nCREATE TABLE translations (\r\n    key TEXT PRIMARY KEY,\r\n    translations JSONB NOT NULL,\r\n    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,\r\n    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL\r\n)","-- Add comments on the columns\r\nCOMMENT ON COLUMN translations.key IS 'A unique, slugified identifier (e.g., \\"sign_in_button_text\\").'","COMMENT ON COLUMN translations.translations IS 'Stores translations as key-value pairs (e.g., {\\"en\\": \\"Sign In\\", \\"fr\\": \\"s''inscrire\\"}).'","-- Enable Row Level Security\r\nALTER TABLE translations ENABLE ROW LEVEL SECURITY","-- RLS Policies\r\nCREATE POLICY \\"Allow all access to ADMIN\\"\r\nON public.translations\r\nFOR ALL\r\nTO authenticated\r\nUSING (\r\n  (auth.jwt() ->> 'user_role') = 'ADMIN'\r\n)\r\nWITH CHECK (\r\n  (auth.jwt() ->> 'user_role') = 'ADMIN'\r\n)","CREATE POLICY \\"Allow read access to all authenticated users\\"\r\nON public.translations\r\nFOR SELECT\r\nTO authenticated\r\nUSING (true)","CREATE POLICY \\"Allow read access to all anonymous users\\"\r\nON public.translations\r\nFOR SELECT\r\nTO anon\r\nUSING (true)","-- Trigger to update updated_at timestamp\r\nCREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()\r\nRETURNS TRIGGER AS $$\r\nDECLARE\r\n  _new record;\r\nBEGIN\r\n  _new := NEW;\r\n  _new.\\"updated_at\\" = NOW();\r\n  RETURN _new;\r\nEND;\r\n$$ LANGUAGE plpgsql","CREATE TRIGGER set_updated_at\r\nBEFORE UPDATE ON public.translations\r\nFOR EACH ROW\r\nEXECUTE FUNCTION public.set_current_timestamp_updated_at()"}	create_translations_table
20250708093403	{"INSERT INTO public.translations (key, translations) VALUES\r\n('sign_in', '{\\"en\\": \\"Sign in\\"}'),\r\n('sign_up', '{\\"en\\": \\"Sign up\\"}'),\r\n('sign_out', '{\\"en\\": \\"Sign out\\"}'),\r\n('dont_have_account', '{\\"en\\": \\"Don''t have an account?\\"}'),\r\n('email', '{\\"en\\": \\"Email\\"}'),\r\n('you_at_example_com', '{\\"en\\": \\"you@example.com\\"}'),\r\n('password', '{\\"en\\": \\"Password\\"}'),\r\n('forgot_password', '{\\"en\\": \\"Forgot Password?\\"}'),\r\n('your_password', '{\\"en\\": \\"Your password\\"}'),\r\n('signing_in_pending', '{\\"en\\": \\"Signing In...\\"}'),\r\n('already_have_account', '{\\"en\\": \\"Already have an account?\\"}'),\r\n('signing_up_pending', '{\\"en\\": \\"Signing up...\\"}'),\r\n('reset_password', '{\\"en\\": \\"Reset Password\\"}')"}	seed_translations_table
20250708110600	{"-- Drop the existing restrictive policy for updates\r\nDROP POLICY IF EXISTS \\"Allow all access to ADMIN\\" ON public.translations","-- Create a more permissive policy that allows authenticated users to update translations\r\n-- This assumes that access to the CMS is already controlled at the application level\r\nCREATE POLICY \\"Allow authenticated users to manage translations\\"\r\nON public.translations\r\nFOR ALL\r\nTO authenticated\r\nUSING (true)\r\nWITH CHECK (true)"}	fix_translations_rls_policies
20250708112300	{"INSERT INTO public.translations (key, translations) VALUES\r\n('edit_page', '{\\"en\\": \\"Edit Page\\"}'),\r\n('edit_post', '{\\"en\\": \\"Edit Post\\"}'),\r\n('open_main_menu', '{\\"en\\": \\"Open main menu\\"}'),\r\n('mobile_navigation_menu', '{\\"en\\": \\"Mobile navigation menu\\"}'),\r\n('cms_dashboard', '{\\"en\\": \\"CMS Dashboard\\"}'),\r\n('update_env_file_warning', '{\\"en\\": \\"Please update .env.local file with anon key and url\\"}'),\r\n('greeting', '{\\"en\\": \\"Hey, {username}!\\"}')\r\nON CONFLICT (key) DO NOTHING"}	add_new_translations
20250708151000	{"-- Drop the unused page and post data fetching functions.\r\n-- These were part of a reverted database optimization.\r\n\r\n-- Drop get_page_data_by_slug functions\r\nDROP FUNCTION IF EXISTS public.get_page_data_by_slug(page_slug text)","DROP FUNCTION IF EXISTS public.get_page_data_by_slug(p_slug text, p_lang text)","-- Drop get_post_data_by_slug functions\r\nDROP FUNCTION IF EXISTS public.get_post_data_by_slug(post_slug text)","DROP FUNCTION IF EXISTS public.get_post_data_by_slug(p_slug text, p_lang text)"}	cleanup_unused_db_functions
\.


--
-- Data for Name: seed_files; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

COPY supabase_migrations.seed_files (path, hash) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 354, true);


--
-- Name: blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blocks_id_seq', 73, true);


--
-- Name: languages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.languages_id_seq', 3, true);


--
-- Name: navigation_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.navigation_items_id_seq', 33, true);


--
-- Name: pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pages_id_seq', 25, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 8, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('supabase_functions.hooks_id_seq', 90, true);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: languages languages_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_code_key UNIQUE (code);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- Name: logos logos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logos
    ADD CONSTRAINT logos_pkey PRIMARY KEY (id);


--
-- Name: media media_object_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_object_key_key UNIQUE (object_key);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: navigation_items navigation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navigation_items
    ADD CONSTRAINT navigation_items_pkey PRIMARY KEY (id);


--
-- Name: pages pages_language_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_language_id_slug_key UNIQUE (language_id, slug);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: posts posts_language_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_language_id_slug_key UNIQUE (language_id, slug);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: translations translations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.translations
    ADD CONSTRAINT translations_pkey PRIMARY KEY (key);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: ensure_single_default_language_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ensure_single_default_language_idx ON public.languages USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_blocks_language_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocks_language_id ON public.blocks USING btree (language_id);


--
-- Name: INDEX idx_blocks_language_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_blocks_language_id IS 'Index for the foreign key blocks_language_id_fkey on public.blocks.';


--
-- Name: idx_blocks_page_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocks_page_id ON public.blocks USING btree (page_id);


--
-- Name: INDEX idx_blocks_page_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_blocks_page_id IS 'Index for the foreign key blocks_page_id_fkey on public.blocks.';


--
-- Name: idx_blocks_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocks_post_id ON public.blocks USING btree (post_id);


--
-- Name: INDEX idx_blocks_post_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_blocks_post_id IS 'Index for the foreign key blocks_post_id_fkey on public.blocks.';


--
-- Name: idx_media_uploader_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_uploader_id ON public.media USING btree (uploader_id);


--
-- Name: INDEX idx_media_uploader_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_media_uploader_id IS 'Index for the foreign key media_uploader_id_fkey on public.media.';


--
-- Name: idx_navigation_items_language_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navigation_items_language_id ON public.navigation_items USING btree (language_id);


--
-- Name: INDEX idx_navigation_items_language_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_navigation_items_language_id IS 'Index for the foreign key navigation_items_language_id_fkey on public.navigation_items.';


--
-- Name: idx_navigation_items_menu_lang_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navigation_items_menu_lang_order ON public.navigation_items USING btree (menu_key, language_id, "order");


--
-- Name: idx_navigation_items_page_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navigation_items_page_id ON public.navigation_items USING btree (page_id);


--
-- Name: INDEX idx_navigation_items_page_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_navigation_items_page_id IS 'Index for the foreign key navigation_items_page_id_fkey on public.navigation_items.';


--
-- Name: idx_navigation_items_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_navigation_items_parent_id ON public.navigation_items USING btree (parent_id);


--
-- Name: INDEX idx_navigation_items_parent_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_navigation_items_parent_id IS 'Index for the foreign key navigation_items_parent_id_fkey on public.navigation_items.';


--
-- Name: idx_pages_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_author_id ON public.pages USING btree (author_id);


--
-- Name: INDEX idx_pages_author_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_pages_author_id IS 'Index for the foreign key pages_author_id_fkey on public.pages.';


--
-- Name: idx_pages_translation_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_translation_group_id ON public.pages USING btree (translation_group_id);


--
-- Name: idx_posts_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_author_id ON public.posts USING btree (author_id);


--
-- Name: INDEX idx_posts_author_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_posts_author_id IS 'Index for the foreign key posts_author_id_fkey on public.posts.';


--
-- Name: idx_posts_feature_image_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_feature_image_id ON public.posts USING btree (feature_image_id);


--
-- Name: INDEX idx_posts_feature_image_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_posts_feature_image_id IS 'Index for the foreign key fk_feature_image on public.posts.';


--
-- Name: idx_posts_translation_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_translation_group_id ON public.posts USING btree (translation_group_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: pages Next.js Revalidate Pages; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "Next.js Revalidate Pages" AFTER INSERT OR DELETE OR UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('http://localhost:3000/api/revalidate', 'POST', '{"Content-type":"application/json","x-revalidate-secret":"This_Is_a_strong_secret_token_for_Nick"}', '{}', '5000');


--
-- Name: posts Next.js Revalidate Posts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "Next.js Revalidate Posts" AFTER INSERT OR DELETE OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('http://localhost:3000/api/revalidate', 'POST', '{"Content-type":"application/json","x-revalidate-secret":"This_Is_a_strong_secret_token_for_Nick"}', '{}', '5000');


--
-- Name: blocks on_blocks_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_blocks_update BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.handle_blocks_update();


--
-- Name: languages on_languages_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_languages_update BEFORE UPDATE ON public.languages FOR EACH ROW EXECUTE FUNCTION public.handle_languages_update();


--
-- Name: media on_media_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_media_update BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.handle_media_update();


--
-- Name: navigation_items on_navigation_items_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_navigation_items_update BEFORE UPDATE ON public.navigation_items FOR EACH ROW EXECUTE FUNCTION public.handle_navigation_items_update();


--
-- Name: pages on_pages_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_pages_update BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.handle_pages_update();


--
-- Name: posts on_posts_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_posts_update BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.handle_posts_update();


--
-- Name: translations set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.translations FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: blocks blocks_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE CASCADE;


--
-- Name: blocks blocks_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: blocks blocks_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: posts fk_feature_image; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_feature_image FOREIGN KEY (feature_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: logos logos_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logos
    ADD CONSTRAINT logos_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: media media_uploader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: navigation_items navigation_items_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navigation_items
    ADD CONSTRAINT navigation_items_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE CASCADE;


--
-- Name: navigation_items navigation_items_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navigation_items
    ADD CONSTRAINT navigation_items_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE SET NULL;


--
-- Name: navigation_items navigation_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.navigation_items
    ADD CONSTRAINT navigation_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.navigation_items(id) ON DELETE CASCADE;


--
-- Name: pages pages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: pages pages_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: posts posts_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings Allow admins full access on site_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admins full access on site_settings" ON public.site_settings TO authenticated USING ((public.get_my_claim('user_role'::text) = '"admin"'::text));


--
-- Name: translations Allow authenticated users to manage translations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to manage translations" ON public.translations TO authenticated USING (true) WITH CHECK (true);


--
-- Name: site_settings Allow authenticated users to read site_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to read site_settings" ON public.site_settings FOR SELECT TO authenticated USING (true);


--
-- Name: blocks Allow delete for admins and writers on blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow delete for admins and writers on blocks" ON public.blocks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))))));


--
-- Name: site_settings Allow insert based on user role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow insert based on user role" ON public.site_settings FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['ADMIN'::text, 'WRITER'::text])));


--
-- Name: blocks Allow insert for admins and writers on blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow insert for admins and writers on blocks" ON public.blocks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))))));


--
-- Name: logos Allow logo delete for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow logo delete for authenticated users" ON public.logos FOR DELETE USING ((( SELECT auth.role() AS role) = 'authenticated'::text));


--
-- Name: logos Allow logo insert for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow logo insert for authenticated users" ON public.logos FOR INSERT WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));


--
-- Name: logos Allow logo update for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow logo update for authenticated users" ON public.logos FOR UPDATE USING ((( SELECT auth.role() AS role) = 'authenticated'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));


--
-- Name: logos Allow public read access to logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read access to logos" ON public.logos FOR SELECT USING (true);


--
-- Name: site_settings Allow public read access to site_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read access to site_settings" ON public.site_settings FOR SELECT TO anon USING (true);


--
-- Name: logos Allow read access for authenticated users on logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access for authenticated users on logos" ON public.logos FOR SELECT TO authenticated USING (true);


--
-- Name: translations Allow read access to all anonymous users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to all anonymous users" ON public.translations FOR SELECT TO anon USING (true);


--
-- Name: translations Allow read access to all authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to all authenticated users" ON public.translations FOR SELECT TO authenticated USING (true);


--
-- Name: blocks Allow read access to blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to blocks" ON public.blocks FOR SELECT USING ((((( SELECT auth.role() AS role) = 'anon'::text) AND (((page_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.pages p
  WHERE ((p.id = blocks.page_id) AND (p.status = 'published'::public.page_status))))) OR ((post_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.posts pt
  WHERE ((pt.id = blocks.post_id) AND (pt.status = 'published'::public.page_status) AND ((pt.published_at IS NULL) OR (pt.published_at <= now())))))))) OR ((( SELECT auth.role() AS role) = 'authenticated'::text) AND ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))))) OR ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'USER'::public.user_role)))) AND (((page_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.pages p
  WHERE ((p.id = blocks.page_id) AND (p.status = 'published'::public.page_status))))) OR ((post_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.posts pt
  WHERE ((pt.id = blocks.post_id) AND (pt.status = 'published'::public.page_status) AND ((pt.published_at IS NULL) OR (pt.published_at <= now()))))))))))));


--
-- Name: site_settings Allow update based on user role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow update based on user role" ON public.site_settings FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['ADMIN'::text, 'WRITER'::text]))) WITH CHECK ((public.get_my_role() = ANY (ARRAY['ADMIN'::text, 'WRITER'::text])));


--
-- Name: blocks Allow update for admins and writers on blocks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow update for admins and writers on blocks" ON public.blocks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))))));


--
-- Name: profiles Allow user to read their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow user to read their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles admins_can_insert_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admins_can_insert_profiles ON public.profiles FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY admins_can_insert_profiles ON profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY admins_can_insert_profiles ON public.profiles IS 'Admins can insert new profiles.';


--
-- Name: profiles authenticated_can_read_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_can_read_profiles ON public.profiles FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR (public.get_current_user_role() = 'ADMIN'::public.user_role)));


--
-- Name: POLICY authenticated_can_read_profiles ON profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY authenticated_can_read_profiles ON public.profiles IS 'Authenticated users can read their own profile, and admins can read any profile.';


--
-- Name: profiles authenticated_can_update_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_can_update_profiles ON public.profiles FOR UPDATE TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR (public.get_current_user_role() = 'ADMIN'::public.user_role))) WITH CHECK (((id = ( SELECT auth.uid() AS uid)) OR (public.get_current_user_role() = 'ADMIN'::public.user_role)));


--
-- Name: POLICY authenticated_can_update_profiles ON profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY authenticated_can_update_profiles ON public.profiles IS 'Authenticated users can update their own profile, and admins can update any profile.';


--
-- Name: blocks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: languages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

--
-- Name: languages languages_admin_can_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY languages_admin_can_delete ON public.languages FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY languages_admin_can_delete ON languages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY languages_admin_can_delete ON public.languages IS 'Admins can delete languages.';


--
-- Name: languages languages_admin_can_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY languages_admin_can_insert ON public.languages FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY languages_admin_can_insert ON languages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY languages_admin_can_insert ON public.languages IS 'Admins can insert languages.';


--
-- Name: languages languages_admin_can_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY languages_admin_can_update ON public.languages FOR UPDATE TO authenticated USING ((public.get_current_user_role() = 'ADMIN'::public.user_role)) WITH CHECK ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY languages_admin_can_update ON languages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY languages_admin_can_update ON public.languages IS 'Admins can update languages.';


--
-- Name: languages languages_are_publicly_readable_for_all_roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY languages_are_publicly_readable_for_all_roles ON public.languages FOR SELECT USING (true);


--
-- Name: POLICY languages_are_publicly_readable_for_all_roles ON languages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY languages_are_publicly_readable_for_all_roles ON public.languages IS 'All roles (anon, authenticated) can read from the languages table.';


--
-- Name: logos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;

--
-- Name: media; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

--
-- Name: media media_admin_writer_can_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_admin_writer_can_delete ON public.media FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY media_admin_writer_can_delete ON media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY media_admin_writer_can_delete ON public.media IS 'Admins/Writers can delete media.';


--
-- Name: media media_admin_writer_can_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_admin_writer_can_insert ON public.media FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY media_admin_writer_can_insert ON media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY media_admin_writer_can_insert ON public.media IS 'Admins/Writers can insert media.';


--
-- Name: media media_admin_writer_can_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_admin_writer_can_update ON public.media FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY media_admin_writer_can_update ON media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY media_admin_writer_can_update ON public.media IS 'Admins/Writers can update media.';


--
-- Name: media media_public_can_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_public_can_read ON public.media FOR SELECT USING (true);


--
-- Name: POLICY media_public_can_read ON media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY media_public_can_read ON public.media IS 'All users (anonymous and authenticated) can read media records. This is the general read access.';


--
-- Name: navigation_items nav_items_admin_can_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY nav_items_admin_can_delete ON public.navigation_items FOR DELETE TO authenticated USING ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY nav_items_admin_can_delete ON navigation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY nav_items_admin_can_delete ON public.navigation_items IS 'Admins can delete navigation items.';


--
-- Name: navigation_items nav_items_admin_can_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY nav_items_admin_can_insert ON public.navigation_items FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY nav_items_admin_can_insert ON navigation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY nav_items_admin_can_insert ON public.navigation_items IS 'Admins can insert navigation items.';


--
-- Name: navigation_items nav_items_admin_can_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY nav_items_admin_can_update ON public.navigation_items FOR UPDATE TO authenticated USING ((public.get_current_user_role() = 'ADMIN'::public.user_role)) WITH CHECK ((public.get_current_user_role() = 'ADMIN'::public.user_role));


--
-- Name: POLICY nav_items_admin_can_update ON navigation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY nav_items_admin_can_update ON public.navigation_items IS 'Admins can update navigation items.';


--
-- Name: navigation_items nav_items_anon_can_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY nav_items_anon_can_read ON public.navigation_items FOR SELECT TO anon USING (true);


--
-- Name: POLICY nav_items_anon_can_read ON navigation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY nav_items_anon_can_read ON public.navigation_items IS 'Anonymous users can read navigation items.';


--
-- Name: navigation_items nav_items_authenticated_can_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY nav_items_authenticated_can_read ON public.navigation_items FOR SELECT TO authenticated USING (true);


--
-- Name: POLICY nav_items_authenticated_can_read ON navigation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY nav_items_authenticated_can_read ON public.navigation_items IS 'All authenticated users (USER, WRITER, ADMIN) can read navigation items.';


--
-- Name: navigation_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- Name: pages pages_admin_writer_can_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pages_admin_writer_can_delete ON public.pages FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY pages_admin_writer_can_delete ON pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY pages_admin_writer_can_delete ON public.pages IS 'Admins/Writers can delete pages.';


--
-- Name: pages pages_admin_writer_can_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pages_admin_writer_can_insert ON public.pages FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY pages_admin_writer_can_insert ON pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY pages_admin_writer_can_insert ON public.pages IS 'Admins/Writers can insert pages.';


--
-- Name: pages pages_admin_writer_can_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pages_admin_writer_can_update ON public.pages FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY pages_admin_writer_can_update ON pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY pages_admin_writer_can_update ON public.pages IS 'Admins/Writers can update pages.';


--
-- Name: pages pages_anon_can_read_published; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pages_anon_can_read_published ON public.pages FOR SELECT TO anon USING ((status = 'published'::public.page_status));


--
-- Name: POLICY pages_anon_can_read_published ON pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY pages_anon_can_read_published ON public.pages IS 'Anonymous users can read published pages.';


--
-- Name: pages pages_authenticated_comprehensive_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pages_authenticated_comprehensive_read ON public.pages FOR SELECT TO authenticated USING (((status = 'published'::public.page_status) OR ((author_id = ( SELECT auth.uid() AS uid)) AND (status <> 'published'::public.page_status)) OR (public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))));


--
-- Name: POLICY pages_authenticated_comprehensive_read ON pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY pages_authenticated_comprehensive_read ON public.pages IS 'Handles all SELECT scenarios for authenticated users: published for all, own drafts for authors, and all pages for admins/writers.';


--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: posts posts_admin_writer_can_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_admin_writer_can_delete ON public.posts FOR DELETE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY posts_admin_writer_can_delete ON posts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY posts_admin_writer_can_delete ON public.posts IS 'Admins/Writers can delete posts.';


--
-- Name: posts posts_admin_writer_can_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_admin_writer_can_insert ON public.posts FOR INSERT TO authenticated WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY posts_admin_writer_can_insert ON posts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY posts_admin_writer_can_insert ON public.posts IS 'Admins/Writers can insert posts.';


--
-- Name: posts posts_admin_writer_can_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_admin_writer_can_update ON public.posts FOR UPDATE TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))) WITH CHECK ((public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));


--
-- Name: POLICY posts_admin_writer_can_update ON posts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY posts_admin_writer_can_update ON public.posts IS 'Admins/Writers can update posts.';


--
-- Name: posts posts_anon_can_read_published; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_anon_can_read_published ON public.posts FOR SELECT TO anon USING (((status = 'published'::public.page_status) AND ((published_at IS NULL) OR (published_at <= now()))));


--
-- Name: POLICY posts_anon_can_read_published ON posts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY posts_anon_can_read_published ON public.posts IS 'Anonymous users can read published posts.';


--
-- Name: posts posts_authenticated_comprehensive_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_authenticated_comprehensive_read ON public.posts FOR SELECT TO authenticated USING ((((status = 'published'::public.page_status) AND ((published_at IS NULL) OR (published_at <= now()))) OR ((author_id = ( SELECT auth.uid() AS uid)) AND (status <> 'published'::public.page_status)) OR (public.get_current_user_role() = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role]))));


--
-- Name: POLICY posts_authenticated_comprehensive_read ON posts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY posts_authenticated_comprehensive_read ON public.posts IS 'Handles all SELECT scenarios for authenticated users: published for all, own drafts for authors, and all posts for admins/writers.';


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: translations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects allow_authenticated_deletes; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY allow_authenticated_deletes ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'public'::text) AND (owner = auth.uid())));


--
-- Name: objects allow_authenticated_select; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY allow_authenticated_select ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'public'::text));


--
-- Name: objects allow_authenticated_updates; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY allow_authenticated_updates ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'public'::text) AND (owner = auth.uid())));


--
-- Name: objects allow_authenticated_uploads; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY allow_authenticated_uploads ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'public'::text) AND (owner = auth.uid())));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA net; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO anon;
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT USAGE ON SCHEMA net TO service_role;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA supabase_functions; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA supabase_functions TO postgres;
GRANT USAGE ON SCHEMA supabase_functions TO anon;
GRANT USAGE ON SCHEMA supabase_functions TO authenticated;
GRANT USAGE ON SCHEMA supabase_functions TO service_role;
GRANT ALL ON SCHEMA supabase_functions TO supabase_functions_admin;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;
GRANT ALL ON FUNCTION auth.email() TO postgres;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;
GRANT ALL ON FUNCTION auth.role() TO postgres;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;
GRANT ALL ON FUNCTION auth.uid() TO postgres;


--
-- Name: FUNCTION algorithm_sign(signables text, secret text, algorithm text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.algorithm_sign(signables text, secret text, algorithm text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.algorithm_sign(signables text, secret text, algorithm text) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sign(payload json, secret text, algorithm text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sign(payload json, secret text, algorithm text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.sign(payload json, secret text, algorithm text) TO dashboard_user;


--
-- Name: FUNCTION try_cast_double(inp text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.try_cast_double(inp text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.try_cast_double(inp text) TO dashboard_user;


--
-- Name: FUNCTION url_decode(data text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.url_decode(data text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.url_decode(data text) TO dashboard_user;


--
-- Name: FUNCTION url_encode(data bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.url_encode(data bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.url_encode(data bytea) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION verify(token text, secret text, algorithm text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.verify(token text, secret text, algorithm text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.verify(token text, secret text, algorithm text) TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION get_current_user_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_user_role() TO anon;
GRANT ALL ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_user_role() TO service_role;


--
-- Name: FUNCTION get_my_claim(claim text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_claim(claim text) TO anon;
GRANT ALL ON FUNCTION public.get_my_claim(claim text) TO authenticated;
GRANT ALL ON FUNCTION public.get_my_claim(claim text) TO service_role;


--
-- Name: FUNCTION get_my_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_role() TO anon;
GRANT ALL ON FUNCTION public.get_my_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_role() TO service_role;


--
-- Name: FUNCTION handle_blocks_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_blocks_update() TO anon;
GRANT ALL ON FUNCTION public.handle_blocks_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_blocks_update() TO service_role;


--
-- Name: FUNCTION handle_languages_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_languages_update() TO anon;
GRANT ALL ON FUNCTION public.handle_languages_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_languages_update() TO service_role;


--
-- Name: FUNCTION handle_media_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_media_update() TO anon;
GRANT ALL ON FUNCTION public.handle_media_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_media_update() TO service_role;


--
-- Name: FUNCTION handle_navigation_items_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_navigation_items_update() TO anon;
GRANT ALL ON FUNCTION public.handle_navigation_items_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_navigation_items_update() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_pages_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_pages_update() TO anon;
GRANT ALL ON FUNCTION public.handle_pages_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_pages_update() TO service_role;


--
-- Name: FUNCTION handle_posts_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_posts_update() TO anon;
GRANT ALL ON FUNCTION public.handle_posts_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_posts_update() TO service_role;


--
-- Name: FUNCTION set_current_timestamp_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION can_insert_object(bucketid text, name text, owner uuid, metadata jsonb); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) TO postgres;


--
-- Name: FUNCTION extension(name text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.extension(name text) TO postgres;


--
-- Name: FUNCTION filename(name text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.filename(name text) TO postgres;


--
-- Name: FUNCTION foldername(name text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.foldername(name text) TO postgres;


--
-- Name: FUNCTION get_size_by_bucket(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.get_size_by_bucket() TO postgres;


--
-- Name: FUNCTION list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) TO postgres;


--
-- Name: FUNCTION list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) TO postgres;


--
-- Name: FUNCTION operation(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.operation() TO postgres;


--
-- Name: FUNCTION search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) TO postgres;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION storage.update_updated_at_column() TO postgres;


--
-- Name: FUNCTION http_request(); Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

REVOKE ALL ON FUNCTION supabase_functions.http_request() FROM PUBLIC;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO postgres;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO anon;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO authenticated;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO service_role;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE blocks; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.blocks TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.blocks TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.blocks TO service_role;


--
-- Name: SEQUENCE blocks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.blocks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.blocks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.blocks_id_seq TO service_role;


--
-- Name: TABLE languages; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.languages TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.languages TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.languages TO service_role;


--
-- Name: SEQUENCE languages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.languages_id_seq TO anon;
GRANT ALL ON SEQUENCE public.languages_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.languages_id_seq TO service_role;


--
-- Name: TABLE logos; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.logos TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.logos TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.logos TO service_role;


--
-- Name: TABLE media; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media TO service_role;


--
-- Name: TABLE navigation_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.navigation_items TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.navigation_items TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.navigation_items TO service_role;


--
-- Name: SEQUENCE navigation_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.navigation_items_id_seq TO anon;
GRANT ALL ON SEQUENCE public.navigation_items_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.navigation_items_id_seq TO service_role;


--
-- Name: TABLE pages; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pages TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pages TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pages TO service_role;


--
-- Name: SEQUENCE pages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pages_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pages_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pages_id_seq TO service_role;


--
-- Name: TABLE posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.posts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.posts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.posts TO service_role;


--
-- Name: SEQUENCE posts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.posts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.posts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.posts_id_seq TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.profiles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.profiles TO service_role;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.site_settings TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.site_settings TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.site_settings TO service_role;


--
-- Name: TABLE translations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.translations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.translations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.translations TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.messages TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.buckets TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.buckets TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.buckets TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.objects TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.objects TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.objects TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads TO postgres;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE storage.s3_multipart_uploads_parts TO postgres;


--
-- Name: TABLE hooks; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.hooks TO service_role;


--
-- Name: SEQUENCE hooks_id_seq; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO postgres;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO anon;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO service_role;


--
-- Name: TABLE migrations; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO postgres;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE supabase_functions.migrations TO service_role;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

