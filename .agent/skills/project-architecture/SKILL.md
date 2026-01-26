---
name: project-architecture
description: When you need to understand the directory structure, open-core model, or where to add new code.
---

# Project Architecture & Monorepo Structure

## 1. High-Level Layout

| Path                    | Type        | Purpose                                | Import Alias            |
| ----------------------- | ----------- | -------------------------------------- | ----------------------- |
| `apps/nextblock`        | Application | **Primary Prod App** (Admin + Public). | —                       |
| `apps/create-nextblock` | Application | CLI Scaffolder.                        | —                       |
| `libs/ui`               | Library     | Shared UI components.                  | `@nextblock-cms/ui`     |
| `libs/utils`            | Library     | Core utilities.                        | `@nextblock-cms/utils`  |
| `libs/db`               | Library     | Database layer (Supabase).             | `@nextblock-cms/db`     |
| `libs/editor`           | Library     | Tiptap editor package.                 | `@nextblock-cms/editor` |

## 2. Core Rules

### Open-Core Model

- **Core:** Everything in this repo is Open Source (MIT), except `libs/ecommerce` (if present).
- **Premium:** Private extensions live in `libs/ecommerce`.

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

**Use the specialized notebook:**

```bash
python scripts/run.py ask_question.py --notebook-id nextblock-cms-roadmap-and-mone --question "Why did we choose this architecture?"
```

This notebook ("NextBlock CMS: Roadmap and Monetization Strategy") contains the high-level vision documents.
