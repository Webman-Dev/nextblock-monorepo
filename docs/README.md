# NextBlock CMS Documentation Index

Use this file as the entry point when priming an AI assistant or onboarding a new contributor. Each section links to a focused document with deeper details.

## Core Context

- [`Architectural-Mandate-and-End-Goal.md`](./Architectural-Mandate-and-End-Goal.md) — **Start Here.** The "Constitution" of the project. Defines the Open-Core business model, the "Bridge" problem, and the strict separation between Monorepo (Factory) and Standalone App (Product).
- [`AI-Dev-Onboarding-Guide.md`](./AI-Dev-Onboarding-Guide.md) — Mission, product strategy, roadmap phases, and why the CMS exists.
- [`monorepo-architecture.md`](./monorepo-architecture.md) — Nx workspace layout, shared library responsibilities, and common Nx commands.
- [`assistant-project-recap.md`](./assistant-project-recap.md) — Rolling log of recent changes, outstanding tasks, and quick references.

## Tooling & Distribution

- [`create-nextblock-cli.md`](./create-nextblock-cli.md) — How the CLI syncs the template, rewrites configs, and gets published to npm.

## Application Architecture

- [`block-editor-analysis.md`](./block-editor-analysis.md) — Deep dive into the block/section layout system, data flow, and registry patterns.
- [`tiptap-v3-editor.md`](./tiptap-v3-editor.md) — Extension list, UI components, dependency map, and QA checklist for the rich-text editor library.
- [`editor-context.md`](./editor-context.md) — CSP workflow, preview sandbox, and custom HTML node strategy.
- You may use context7 MCP to look for tiptap version 3 latest documentations.

## Widget & UI Design Specs

- [`inline-cta-widget-design.md`](./inline-cta-widget-design.md) — CTA widget schema, node view behaviour, and rendering plan.
- [`inline-widget-design.md`](./inline-widget-design.md) — Alert/callout widget specification and implementation notes.

---

### How to Use This Index with AI Assistants

1. **Mandatory Reading:** Start with `Architectural-Mandate-and-End-Goal.md` to understand the constraints of the Open-Core model.
2. **Context:** Read `AI-Dev-Onboarding-Guide.md` for mission and roadmap.
3. **Tooling:** Pull in Tooling & Distribution when working on the CLI or release workflows.
4. **Architecture:** Reference Application Architecture docs for block editor or Tiptap changes.
5. **Specs:** Use the Widget specs when implementing or revising inline components.
6. **External:** You may use context7 MCP at any time to look for latest documentations.

Keep this index up to date as documentation evolves so future threads can load the right context quickly.
