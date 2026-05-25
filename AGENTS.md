# NextBlock Agent Notes

## Production Migration Rule

NextBlock has launched against real Supabase data. Future schema and data
changes must be append-only, forward-only, and non-destructive by default.

- Do not rewrite, squash, reorder, delete, or recycle existing migration files
  once they may have been applied to any shared or production database.
- Add a new migration file under `libs/db/src/supabase/migrations` for each
  production schema/data change.
- Never use `db:reset`, `sandbox:reset`, `db:push:sandbox`, or a fresh baseline
  replay on production or any database containing orders, users, payments, or
  customer data.
- Use `npm run db:migrate:check` before `npm run db:migrate`.
- If a live database reports old baseline migrations, including
  `00000000000000_setup_foundation_and_enums.sql`, as pending, use
  `npm run db:migrate:repair-history:check`, then
  `npm run db:migrate:repair-history`, then rerun
  `npm run db:migrate:check`. This marks already-present baseline migrations as
  applied; it does not run their SQL.
- Only use `npm run db:migrate:fresh` for a brand-new empty database.

For more detail, read `docs/04-DATABASE-AND-AUTH.md` and
`docs/05-DEVELOPER-GUIDE.md` before touching migrations.
