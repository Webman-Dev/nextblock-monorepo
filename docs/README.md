# NextBlock CMS Documentation Index

Use this file as the entry point when priming an AI assistant or onboarding a new contributor. Each section links to a focused document with deeper details.

## Core Context

- [`AI-Dev-Onboarding-Guide.md`](./AI-Dev-Onboarding-Guide.md) — Mission, product strategy, roadmap phases, and why the CMS exists.
- [`monorepo-architecture.md`](./monorepo-architecture.md) — Nx workspace layout, shared library responsibilities, and common Nx commands.
- [`assistant-project-recap.md`](./assistant-project-recap.md) — Rolling log of recent changes, outstanding tasks, and quick references.

## Tooling & Distribution

- [`create-nextblock-cli.md`](./create-nextblock-cli.md) — How the CLI syncs the template, rewrites configs, and gets published to npm.

## Application Architecture

- [`block-editor-analysis.md`](./block-editor-analysis.md) — Deep dive into the block/section layout system, data flow, and registry patterns.
- [`tiptap-v3-editor.md`](./tiptap-v3-editor.md) — Extension list, UI components, dependency map, and QA checklist for the rich-text editor library.
- [`editor-context.md`](./editor-context.md) — CSP workflow, preview sandbox, and custom HTML node strategy.

## Widget & UI Design Specs

- [`inline-cta-widget-design.md`](./inline-cta-widget-design.md) — CTA widget schema, node view behaviour, and rendering plan.
- [`inline-widget-design.md`](./inline-widget-design.md) — Alert/callout widget specification and implementation notes.

---

### How to Use This Index with AI Assistants

1. Start with the Core Context section for mission and workspace orientation.
2. Pull in Tooling & Distribution when working on the CLI or release workflows.
3. Reference Application Architecture docs for block editor or Tiptap changes.
4. Use the Widget specs when implementing or revising inline components.

Keep this index up to date as documentation evolves so future threads can load the right context quickly.
