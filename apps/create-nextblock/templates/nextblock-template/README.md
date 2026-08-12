# NextBlock

Your NextBlock site — a standalone Next.js app with the CMS, block editor and storefront
built in. Everything here is yours to edit.

## Everyday commands

```bash
npm run dev             # start the dev server on http://localhost:3000
npm run build           # production build (applies pending migrations first)
npm start               # serve the production build
npm run lint            # lint
```

## Keeping NextBlock up to date

```bash
npm run update              # code + dependencies + database schema, in one step
npm run update -- --check   # show what would change; write nothing
```

New framework code comes from the published `create-nextblock` package and is applied as a
**git 3-way merge**, so edits you made to NextBlock's own files are preserved — only a change
that genuinely overlaps yours conflicts, with the usual `<<<<<<<` markers. Your own pages,
components, content and `.env` are never touched.

If a merge does conflict, the update finishes the code and dependency work and **stops before
touching the database**. Fix the conflicts, then run `npm run update` again to apply the
migrations — or `git reset --hard HEAD` to back the whole update out. Either way the database
is untouched until you say so.

Commit your work before updating: a clean git tree is what lets you review the result with
`git diff` and undo it with `git reset`.

Full details: [docs/13-STAYING-UP-TO-DATE.md](./docs/13-STAYING-UP-TO-DATE.md).

## Running the whole stack locally with Docker

```bash
npm run docker:setup    # first run: generate .env, build, and start everything
npm run docker:up       # rebuild and restart (also applies pending migrations)
npm run docker:down     # stop (your data persists in Docker volumes)
npm run docker:logs     # follow the app logs
```

On a Docker install, run `npm run update` and then `npm run docker:up` — the stack applies
the migrations itself.

## Documentation

The `docs/` folder ships with your project:

- [01-PROJECT-OVERVIEW.md](./docs/01-PROJECT-OVERVIEW.md) — how the pieces fit together
- [03-CMS-AND-EDITOR.md](./docs/03-CMS-AND-EDITOR.md) — the editor and block system
- [04-DATABASE-AND-AUTH.md](./docs/04-DATABASE-AND-AUTH.md) — schema, auth and migrations
- [10-CUSTOM-BLOCKS.md](./docs/10-CUSTOM-BLOCKS.md) — building your own blocks
- [13-STAYING-UP-TO-DATE.md](./docs/13-STAYING-UP-TO-DATE.md) — updating
