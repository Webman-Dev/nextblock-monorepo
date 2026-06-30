-- System notification layer for the automated upstream-update architecture.
--
-- `system_alerts` is the single sink that every update track writes into:
--   * Track A (the .github/workflows/nextblock-sync.yml GitHub Action) inserts a
--     'merge_conflict' row via the Supabase REST API when an upstream merge can't be
--     auto-resolved, so the CMS dashboard can point an operator at GitHub to sort it.
--   * Track B (the runtime update engine, app/api/cms/check-updates) inserts a
--     'runtime_update_available' row for non-git installs (npm create / local / Docker)
--     with a download link to the latest verified release tarball.
-- The dashboard banner (cms/layout.tsx -> SystemAlertsBanner) renders unresolved rows.
--
-- Writers always use the service-role key (REST API / getServiceRoleSupabaseClient),
-- which bypasses RLS; RLS below only governs who can READ/RESOLVE from the dashboard.

create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  -- The notification kind. Constrained to the two tracks this system emits; widen the
  -- CHECK in a later migration if new alert kinds are added.
  alert_type text not null check (alert_type in ('merge_conflict', 'runtime_update_available')),
  title text not null,
  message text not null,
  -- Structured context for deep-linking the banner CTA, e.g.
  --   merge_conflict           -> { "repo": "owner/name", "branch": "...", "action_url": "https://github.com/owner/name/branches" }
  --   runtime_update_available -> { "latest_version": "0.11.0", "download_url": "https://github.com/.../v0.11.0.tar.gz" }
  metadata jsonb not null default '{}'::jsonb,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.system_alerts is 'System notifications for the automated upstream-update architecture (merge conflicts, runtime updates available). Written by service-role; read by ADMINs.';
comment on column public.system_alerts.alert_type is 'One of: merge_conflict, runtime_update_available.';
comment on column public.system_alerts.metadata is 'Structured deep-link context for the dashboard banner CTA (repo/branch/action_url or latest_version/download_url).';
comment on column public.system_alerts.is_resolved is 'When true the alert is hidden from the dashboard banner.';

-- Banner query: unresolved alerts, newest first.
create index if not exists idx_system_alerts_unresolved
  on public.system_alerts (is_resolved, created_at desc);

-- Keep updated_at fresh on every mutation (same helper used across the schema).
drop trigger if exists trg_system_alerts_updated_at on public.system_alerts;
create trigger trg_system_alerts_updated_at
  before update on public.system_alerts
  for each row
  execute function public.set_current_timestamp_updated_at();

alter table public.system_alerts enable row level security;

-- Only authenticated ADMINs may view alerts in the dashboard. WRITERs and the public
-- anon role get zero rows (RLS default-deny: no policy applies to them).
drop policy if exists system_alerts_select_admin on public.system_alerts;
create policy system_alerts_select_admin
  on public.system_alerts
  for select
  to authenticated
  using ((select public.get_current_user_role()) = 'ADMIN');

-- ADMINs may resolve (dismiss) alerts from the dashboard. Inserts are service-role only
-- (RLS-bypassing), so there is intentionally no INSERT policy.
drop policy if exists system_alerts_update_admin on public.system_alerts;
create policy system_alerts_update_admin
  on public.system_alerts
  for update
  to authenticated
  using ((select public.get_current_user_role()) = 'ADMIN')
  with check ((select public.get_current_user_role()) = 'ADMIN');

-- Base table privileges (RLS still filters rows on top of these). Mirrors the grant
-- model the rest of the schema uses; service_role keeps full access for the writers.
grant select, update on public.system_alerts to authenticated;
grant all on public.system_alerts to service_role;
