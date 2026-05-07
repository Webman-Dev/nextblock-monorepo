---
name: project-architecture
description: When you need to understand the directory structure, open-core model, or where to add new code.
---

# Project Architecture & Monorepo Structure

## 1. High-Level Layout

| Path                    | Type        | Purpose                                                  | Import Alias               |
| ----------------------- | ----------- | -------------------------------------------------------- | -------------------------- |
| `apps/nextblock`        | Application | **Primary Prod App** (Admin + Public).                   | —                          |
| `apps/create-nextblock` | Application | CLI Scaffolder.                                          | —                          |
| `libs/ui`               | Library     | Shared UI components.                                    | `@nextblock-cms/ui`        |
| `libs/utils`            | Library     | Core utilities.                                          | `@nextblock-cms/utils`     |
| `libs/db`               | Library     | Database layer (Supabase).                               | `@nextblock-cms/db`        |
| `libs/editor`           | Library     | Tiptap editor package.                                   | `@nextblock-cms/editor`    |
| `libs/sdk`              | Library     | Public developer SDK surface.                            | `@nextblock-cms/sdk`       |
| `libs/ecommerce`        | Library     | **Premium E-Commerce**. Source-available, license-gated. | `@nextblock-cms/ecommerce` |

## 2. Core Rules

### Open-Core Model

- **Core:** The monorepo is Open Source (AGPL).
- **Premium:** Extensions like `libs/ecommerce` are present but require a License Key to activate.

### Code Placement Decisions

- **New UI Component:** Go to `libs/ui`.
- **New Helper Function:** Go to `libs/utils`.
- **New Database Query:** Go to `libs/db`.
- **New Page/Route:** Go to `apps/nextblock/app`.
- **CLI Logic:** Go to `apps/create-nextblock`.

## 3. Dependency Graph Rules

- `libs/*` can depend on other `libs/*` (e.g., `ui` depends on `utils`).
- `apps/*` depend on `libs/*`.
- **Crucial:** `libs/ui` MUST NOT depend on `apps/nextblock`. This creates a circular dependency and breaks the build.

## 4. Template Syncing

- `apps/create-nextblock/templates/nextblock-template` is **generated code**.
- **Do not edit it directly.**
- Edit `apps/nextblock` instead, then run `npm run sync:create-nextblock` to update the template.

## 5. Architectural Reference (NotebookLM)

For questions about the _intent_ behind the architecture, monetization strategy, or future roadmap that aren't clear from the directory structure itself:

**Use the NotebookLM MCP tool:**

```
mcp_notebooklm_ask_question({ question: "Why did we choose this architecture?" })
```

This queries the "NextBlock CMS: Roadmap and Monetization Strategy" notebook for high-level vision context.
