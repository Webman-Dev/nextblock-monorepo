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

Inside the monorepo, CLI release work is still tied to the source workspace:

- library builds and publishes happen from the workspace
- template sync happens before CLI packaging
- the CLI package itself is versioned in `apps/create-nextblock/package.json`

If a generated project looks stale, check the sync script and template output
before assuming the source app is missing the feature.
