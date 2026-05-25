# NextBlock CMS Documentation

This folder is the source-of-truth reference set for the NextBlock monorepo.
The numbered files are written from live code, routes, migrations, and shipped
library surfaces rather than historical planning notes.

## Start Here

- Product and architecture overview: [01-PROJECT-OVERVIEW.md](./01-PROJECT-OVERVIEW.md)
- Commerce capabilities: [02-ECOMMERCE-CAPABILITIES.md](./02-ECOMMERCE-CAPABILITIES.md)
- CMS editor and block system: [03-CMS-AND-EDITOR.md](./03-CMS-AND-EDITOR.md)
- Database, auth, and migrations: [04-DATABASE-AND-AUTH.md](./04-DATABASE-AND-AUTH.md)
- Contributor workflow and local operations: [05-DEVELOPER-GUIDE.md](./05-DEVELOPER-GUIDE.md)
- CLI and scaffolded project flow: [06-CLI-AND-SCAFFOLDING.md](./06-CLI-AND-SCAFFOLDING.md)
- Block SDK and extensibility surface: [07-BLOCK-SDK-AND-EXTENSIBILITY.md](./07-BLOCK-SDK-AND-EXTENSIBILITY.md)

## Audience Guide

- New contributors: read `01`, then `04`, then `05`.
- Commerce work: read `02`, then `04`.
- Editor or page-builder work: read `03`, then `07`.
- CLI or template work: read `06`.
- AI agents: start with this index, then move directly to the subsystem file that
  matches the task. Treat `apps/nextblock`, `libs/*`, and
  `libs/db/src/supabase/migrations` as the final authority if a doc and code ever
  disagree.
- AI agents touching migrations must also read the root `AGENTS.md` note:
  production/shared database changes are append-only and non-destructive by
  default.
