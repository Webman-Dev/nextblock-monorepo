# 06 CLI and Scaffolding

## Purpose

`apps/create-nextblock` is the onboarding surface for developers who want a
standalone NextBlock project without cloning the full monorepo.

The CLI does two main jobs:

- scaffold a package-based project from the current app template
- activate premium ecommerce routes and dependencies in generated projects

## Source Application vs Template Output

The canonical application is still `apps/nextblock`.

The scaffold template under
`apps/create-nextblock/templates/nextblock-template` is copied output, not the
authoritative source. The sync pipeline refreshes that template by copying the
source app and applying a series of post-copy adjustments.

That means contributor workflow should be:

1. change the source app or shared libraries
2. update root docs and README entrypoints
3. run the template sync when you want the generated project to catch up

## CLI Entry Points

`apps/create-nextblock/bin/create-nextblock.js` currently defines:

- `create [project-directory]`
- `activate [module]`

The default create flow is what powers:

```bash
npm create nextblock@latest
```

## What the Create Flow Actually Does

When the CLI creates a project it currently:

1. prompts for a project name unless `--yes` is used
2. copies `templates/nextblock-template` into the new directory
3. removes backup artifacts
4. applies client component and provider adjustments
5. normalizes block-editor and UI imports
6. generates UI proxy modules
7. copies editor utility shims when needed
8. ensures `.gitignore`, `.env.example`, layout files, and config files are in
   the expected generated-project shape
9. rewrites `package.json` away from workspace dependencies and toward published
   packages
10. writes a project-level `.npmrc` for public package resolution
11. optionally installs dependencies
12. optionally runs the generated-project setup wizard
13. initializes git

## Package Version Sources

The CLI resolves published package versions from the local monorepo package
metadata for:

- `@nextblock-cms/ui`
- `@nextblock-cms/utils`
- `@nextblock-cms/db`
- `@nextblock-cms/editor`
- `@nextblock-cms/sdk`

The ecommerce module is special because activation installs the alias:

```bash
@nextblock-cms/ecommerce@npm:@nextblock-cms/ecom@latest
```

That alias matches the current package-name discrepancy documented elsewhere.

## Template Sync Workflow

`apps/create-nextblock/scripts/sync-template.js` is the authoritative source for
template generation inside the monorepo.

It currently:

- copies `apps/nextblock` into `templates/nextblock-template`
- skips `node_modules`, `.next`, backups, and other generated folders
- copies the root `docs/` folder into the template docs directory
- copies `.env.example` or `.env.exemple`
- rewrites imports for packaged library consumption
- removes the copied `project.json`
- syncs package versions
- normalizes global styles and UI proxy files

This is why the root docs and root/app README surfaces matter first: the
template inherits from them later through the sync step.

## Premium Ecommerce Activation

The `activate ecommerce` command does more than add a dependency. It also
injects route wrappers and supporting files into the generated project so the
premium module appears as a coherent extension rather than a bare npm install.

The injected surfaces include wrappers for routes such as:

- `/cms/orders`
- `/cms/products`
- `/cms/payments`
- `/checkout/success`
- `/api/checkout`

Those wrappers use `verifyPackageOnline()` so premium routes stay aligned with
package activation state.

## Publishing and Release Notes

A generated project installs the libraries from **npm**, so a feature only reaches
scaffolds after the libs are republished. (The monorepo's own Vercel deploy builds the
libs from source, so it sees changes immediately — only `npm create` scaffolds need a
republish.)

### Release commands

- `npm run release:all -- <version>` — build **and publish every package** at one
  synchronized version, in dependency order: `utils → ui → sdk → db → editor → ecom`,
  then `release-cli.js` (which stamps the root + template + `create-nextblock`, re-syncs
  the template, and publishes the CLI). Pass an explicit semver (e.g. `0.10.2`);
  `--dry-run` prints the plan only.
- `npm run build:<lib>` (`build:utils|ui|db|editor|sdk|ecom`) and
  `node tools/scripts/release-lib.js <lib> <version>` — build + publish a **single** lib
  (`<lib>` is the nx project name, so use `ecommerce`, which maps to the published
  `@nextblock-cms/ecom`). `npx nx build <lib>` only *compiles*, it does not publish.

### npm 2FA / OTP (and capturing a log)

Publishing requires a one-time password if the npm account has 2FA. **Piping the command
output breaks the interactive OTP prompt** — `npm run release:all -- … 2>&1 | Tee-Object …`
(or `| tee`) fails with `npm error code EOTP` because npm no longer has a TTY. Either:

- set an npm **Automation** token (`npm config set //registry.npmjs.org/:_authToken …`),
  which bypasses 2FA — then piping to a log file is fine; or
- capture with PowerShell `Start-Transcript -Path release.log; npm run release:all -- … ;
  Stop-Transcript`, which records the session while npm keeps its terminal.

`release:all` has no "already published" guard: if it dies partway, re-running the same
version re-publishes from the top and 403s on the first already-published lib. Finish a
partial release by running the **remaining** libs individually
(`node tools/scripts/release-lib.js <lib> <version>` … then `release-cli.js <version>`),
or bump to a fresh version and re-run the whole thing.

### Library build gotchas (dts / tsconfig)

Each lib emits its `.d.ts` via `vite-plugin-dts` running tsc on `tsconfig.lib.json`. When a
lib imports a sibling (`ui`/`db` import `utils`; `ecom` imports all), how you wire the
tsconfig decides whether the build log is clean:

- A **composite** lib (`ui`, `db` — `db` inherits it) must **list the imported sibling's
  sources in `include`** (e.g. `"../utils/src/**/*.ts"`) and keep `"references": []`.
  Mirror `libs/editor`, which always built clean this way. A composite project
  `reference` to the sibling triggers `TS6305` ("output not built" — vite never produces
  the `tsc -b` out-tsc output); empty `references` *without* the `include` triggers
  `TS6307` ("file not listed"). Both are non-fatal log noise but should stay at zero.
- A **non-composite** lib (`ecom`, which extends `tsconfig.base.json`) just needs
  `"references": []` — no `include` of siblings.
- A **strict** lib (`db`/`sdk` set `noPropertyAccessFromIndexSignature`) compiles the
  sibling's *source* under its strict rules, so `libs/utils` must stay strict-clean
  (bracket-access undeclared keys, e.g. `process.env['R2_BUCKET_NAME']`).

`vite-plugin-dts` `entryRoot: 'src'` keeps emission to the lib's own `src`, so listing
sibling sources does **not** leak their `.d.ts` into the tarball. The published `bin` path
in `apps/create-nextblock/package.json` should have **no leading `./`** (`bin/…`, not
`./bin/…`) or npm "auto-corrects" it with a publish warning.

If a generated project looks stale, check the sync script and template output (and whether
the libs were actually republished) before assuming the source app is missing the feature.
