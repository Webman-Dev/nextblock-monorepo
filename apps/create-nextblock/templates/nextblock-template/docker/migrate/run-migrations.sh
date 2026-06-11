#!/bin/sh
# Applies the NextBlock SQL migrations (mounted at /migrations) in chronological filename order,
# once GoTrue has provisioned the auth schema (profiles etc. FK to auth.users). Idempotent: a
# tracking table records applied versions so restarts never re-run a migration. Each file runs
# in a single transaction (ON_ERROR_STOP).
set -eu

PGHOST="${POSTGRES_HOST:-db}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="postgres"
PGDATABASE="${POSTGRES_DB:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

psql_cmd() {
  psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" "$@"
}

echo "[migrate] waiting for Postgres at ${PGHOST}:${PGPORT}..."
until psql_cmd -c 'select 1;' >/dev/null 2>&1; do
  sleep 2
done

echo "[migrate] waiting for GoTrue to create auth.users..."
until [ "$(psql_cmd -tAc "select to_regclass('auth.users') is not null;")" = "t" ]; do
  sleep 2
done

psql_cmd -c "create table if not exists public._nextblock_docker_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);"

applied_any=0
for file in $(ls /migrations/*.sql | sort); do
  version="$(basename "$file" .sql)"
  already="$(psql_cmd -tAc "select 1 from public._nextblock_docker_migrations where version = '${version}';")"
  if [ "$already" = "1" ]; then
    echo "[migrate] skip ${version} (already applied)"
    continue
  fi
  echo "[migrate] applying ${version}"
  psql_cmd --single-transaction -f "$file"
  psql_cmd -c "insert into public._nextblock_docker_migrations (version) values ('${version}');"
  applied_any=1
done

if [ "$applied_any" = "1" ]; then
  echo "[migrate] migrations applied successfully."
else
  echo "[migrate] database already up to date."
fi
