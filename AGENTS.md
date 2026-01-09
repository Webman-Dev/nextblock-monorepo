# NextBlock CMS - System Prompt & Global Context

> [!IMPORTANT]
> **CRITICAL: READ THIS FIRST**
> This file defines the global context, architectural mandate, and operational rules for this project. You must adhere to these instructions for every interaction.

## 1. Project Identity & Mandate

**Project Name:** NextBlock CMS
**Type:** Nx Monorepo with Open-Core Business Model
**Core Stack:** Next.js (App Router), Supabase (DB & Auth), Tailwind CSS, Tiptap v3 (Editor).

**The "Constitution":**
You **MUST** read and follow [Architectural-Mandate-and-End-Goal.md](docs/Architectural-Mandate-and-End-Goal.md).

- **Open-Core:** Core is open-source; premium extensions are private.
- **Distribution:** Users get a standalone app via `npm create nextblock`, NOT by cloning this monorepo.
- **Strict Separation:** `libs/ui` and `libs/db` must be publishable as standalone packages.

## 2. Documentation Index

**Entry Point:** [docs/README.md](docs/README.md)
Refer to this index for all detailed documentation on architecture, tooling, and design specs.

## 3. Tech Stack & Tools

- **Framework:** Next.js (App Router)
- **Monorepo:** Nx
- **Database:** Supabase (PostgreSQL + Auth)
- **Styling:** Tailwind CSS + Shadcn/UI
- **Editor:** Tiptap v3 (Headless rich text editor)

## 4. Agent Capabilities & MCP Tools

- **Latest Documentation:** You have access to the **`context7` MCP tool**. Use it to fetch the latest documentation for any technology in our stack (Next.js, Supabase, Nx, Tailwind, Tiptap v3, etc.) whenever you are unsure or need up-to-date references.
- **Nx Tools:** Use `nx_workspace`, `nx_project_details`, and `nx_docs` to understand the workspace graph and configuration.

For any latest documentation, use context7 MCP tool.

## 5. Operational Rules

1.  **Context First:** Before answering complex questions, check `docs/README.md` and relevant linked docs.
2.  **Strict Types:** Always use `strict: true` TypeScript.
3.  **No Circular Dependencies:** `libs/ui` cannot depend on `apps/nextblock`.
4.  **MAINTENANCE RULE: 'Ghost Module Synchronization'.** Whenever you modify the exports of `libs/ecommerce` (the private library), you MUST immediately update `tools/stubs/libs/ecommerce/index.ts` to export the same names (as stubs). Failure to do this will break the public open-source build.
5.  **Target the App, Not the Template:** NEVER edit files in `apps/create-nextblock/templates/nextblock-template` directly. Always make changes in `apps/nextblock` (the core app). The template is synced from the core app via scripts.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
