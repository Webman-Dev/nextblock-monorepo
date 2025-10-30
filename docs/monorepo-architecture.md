# NextBlock CMS Monorepo Architecture Guide

This guide summarizes how the NextBlock CMS workspace is organized, how shared code is packaged, and which conventions keep the monorepo maintainable.

## 1. High-Level Layout

The repository follows the standard Nx model: deployable applications live in `apps/`, reusable code in `libs/`.

| Path | Type | Purpose | Import Alias |
| --- | --- | --- | --- |
| `apps/nextblock` | Application | Production Next.js CMS (admin + public site). | — |
| `apps/create-nextblock` | Application | CLI scaffolder published as `create-nextblock`. | — |
| `libs/ui` | Library | Shared shadcn/ui components, design tokens, global styles. | `@nextblock-cms/ui` |
| `libs/utils` | Library | Cross-cutting helpers (className utils, translations, R2 helpers, env checks). | `@nextblock-cms/utils` |
| `libs/db` | Library | Supabase clients, database helpers, migrations. | `@nextblock-cms/db` |
| `libs/editor` | Library | Tiptap v3 editor package consumed by the app and CLI template. | `@nextblock-cms/editor` |
| `libs/sdk` | Library | Public developer SDK surface (roadmap). | `@nextblock-cms/sdk` |
| `libs/ecommerce` | Library | Reserved for future commercial module. | `@nextblock-cms/ecommerce-premium` |

## 2. Shared Libraries

### 2.1 `libs/ui`

- Houses every shared component; exported from `src/index.ts`.
- `src/styles/globals.css` defines Tailwind layers and CSS variables.
- Consumers must import via `import { Button } from '@nextblock-cms/ui';` to keep the public API stable.

### 2.2 `libs/utils`

- Collects non-visual helpers: `cn`, translation/context utilities, R2 client setup, environment validation, etc.
- Server-only helpers are exported through `src/server.ts` and guard against usage in client bundles.

### 2.3 `libs/db`

- The single source of truth for Supabase interaction.
- Provides `createClient` variants for browser, server, middleware, and scripts.
- Includes migration files under `src/supabase/`.

### 2.4 `libs/editor`

- Publishable Tiptap v3 integration shared by the CMS and the scaffold template.
- Exposes the editor component, toolbar, custom nodes, and CSS via `@nextblock-cms/editor` and `@nextblock-cms/editor/styles/*`.

## 3. Applications

### `apps/nextblock`

- Organised by feature areas (`app/cms/pages`, `app/cms/posts`, etc.).
- Server actions live under `app/actions` and start with `"use server"` to encapsulate Node-only logic.
- Block editor registry is located at `lib/blocks/blockRegistry.ts`.

### `apps/create-nextblock`

- Node-based CLI (`bin/create-nextblock.js`) that syncs the template from `apps/nextblock`, rewrites config files, and installs dependencies for generated projects.
- Registered as an Nx project for linting, but excluded from aggregate builds.

## 4. Workspace Configuration

- **Root `package.json`** controls dependency versions for the whole repo.
- **`tsconfig.base.json`** defines path aliases for every library.
- **`components.json`** points the shadcn/ui CLI at `libs/ui`.
- **Tailwind** uses a two-level setup:
  - Root `tailwind.config.js` contains the shared theme and content globs.
  - App-specific configs (e.g. `apps/nextblock/tailwind.config.js`) extend the root via `presets`.

## 5. Common Nx Commands

| Command | Description | Example |
| --- | --- | --- |
| `nx serve <project>` | Run a project in dev mode. | `nx serve nextblock` |
| `nx build <project>` | Production build for apps or libs. | `nx build editor` |
| `nx lint <project>` | ESLint with Nx caching. | `nx lint ui` |
| `nx run-many -t <target>` | Execute a target across multiple projects. | `nx run-many -t build --all` |
| `nx graph` | Visualize dependency graph. | `nx graph` |

## 6. TypeScript & Project Hygiene

- Avoid naming conflicts such as `module.ts` and `module.tsx` in the same folder to prevent resolver ambiguity.
- Shared libraries should publish through `dist/libs/<name>`; public API is managed in each library’s `src/index.ts`.
- Use Nx generators (`nx g`) to scaffold new components, ensuring typings and lint configs stay consistent.
