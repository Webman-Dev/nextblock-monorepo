# create-nextblock CLI Overview

The `create-nextblock` package is the primary onboarding surface for developers. It scaffolds a runnable NextBlock CMS project in minutes and showcases the platform’s developer experience.

## Goals and Positioning

- **Growth engine:** A polished CLI is the first impression for potential adopters. Fast setup and a working project feed the product-led growth loop and downstream marketplace plans.
- **Single source of truth:** The scaffolded project mirrors the production `apps/nextblock` app, keeping features in sync via the template workflow.
- **Package-first distribution:** Generated projects consume published libraries (`@nextblock-cms/ui`, `@nextblock-cms/editor`, etc.) rather than reading from the monorepo directly.

## Workspace Layout

- CLI app root: `apps/create-nextblock`
- Executable entry: `apps/create-nextblock/bin/create-nextblock.js`
- Template source: `apps/create-nextblock/templates/nextblock-template`
- Nx config: minimal `project.json` with a lint target (bin + scripts). The project is excluded from aggregate builds but linted via `npm nx lint create-nextblock --skip-nx-cache`.
- Template is **not** part of the Nx graph. `docs/.nxignore` excludes the path, and the sync script deletes any stray `project.json` in the template after copying.

## Template Sync Workflow

`npm run sync:create-nextblock` performs the following:

1. Copies the latest `apps/nextblock` files into `templates/nextblock-template` while skipping `node_modules`, `.next`, backups, etc.
2. Applies post-copy adjustments:
   - Merges `.env.example` into the template.
   - Rewrites imports to use published packages.
   - Removes placeholder globals/editor CSS files in favour of package styles.
   - Creates UI proxy modules so generated projects can import `@nextblock-cms/ui` subpaths if needed.
   - Deletes `templates/nextblock-template/project.json`.

Shims such as `apps/create-nextblock/tsconfig.base.json` and `apps/create-nextblock/libs/**/tsconfig*.json` exist solely to keep VS Code happy when editing the template; they all extend the workspace configs.

## Scaffolding Flow

When a developer runs `npm create nextblock@latest`:

1. CLI prompts for project name and package manager preference.
2. Template files are copied into a new directory.
3. `package.json` is rewritten:
   - Name is updated.

- `@nextblock-cms/*` dependencies are converted from `workspace:*` to published versions.
- Nx-specific scripts are replaced with standard Next.js scripts (`dev`, `build`, `start`, `lint`).

4. `.env.example` is copied to `.env.local` with guidance for required variables (Supabase, R2, SMTP).
5. Dependency installation runs via the chosen package manager.
6. Success message highlights next steps (`cd`, `npm run dev`, configure env keys).

## Publishing Workflow

1. **Build libraries:** `npm run all-builds` (or individual `nx build <lib>`). Verify bundles contain `'use client';` directives for UI/editor before publishing.
2. **Publish packages:** From `dist/libs/<name>` run `npm publish --access public` for each package that changed.
3. **Update version references:** Ensure the template `package.json` references the newly published versions; rerun `npm run sync:create-nextblock` if necessary.
4. **Release CLI:** Bump the version in `apps/create-nextblock/package.json`, rebuild any generated assets if needed, and run `npm publish` from `apps/create-nextblock`.
5. **Smoke test:** `npm run test-create -- <demo-name>` generates a project locally. Run `npm run dev` inside the scaffold to confirm `/cms/dashboard` and other routes operate normally.

## Troubleshooting Checklist

- **Missing `'use client'` in packages:** Rebuild `libs/ui` and `libs/editor`; the Vite configs inject the directive into `index.js`/`index.mjs`.
- **Template shows in Nx graph:** Re-run `npm run sync:create-nextblock` to remove `project.json`, and confirm `.nxignore` lists the template path.
- **CLI linting fails:** Run `npm nx lint create-nextblock --skip-nx-cache` and fix issues in `bin/` or `scripts/`.
- **Generated project fails to resolve packages:** Verify published versions exist on npm and that `package.json` no longer contains `workspace:*` specifiers.

## Related References

- `docs/assistant-project-recap.md` — latest workspace adjustments and open tasks.
- `docs/AI-Dev-Onboarding-Guide.md` — vision, roadmap, and business context.
- `apps/create-nextblock/scripts/sync-template.js` — authoritative source for the sync pipeline.
