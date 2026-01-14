---
name: nx-operations
description: When you need to run tasks, build projects, or understand the workspace graph using Nx. Use this for all build, lint, and test operations.
---

# Nx Operations & Workspace Management

## 1. General Guidelines

- **Always use Nx:** Run tasks via `nx run`, `nx run-many`, or `nx affected`. Do not use underlying tools (like `tsc` or `vite` directly) unless debugging a specific issue with them.
- **Analyze First:**
  - Use `nx_workspace` to understand the workspace layout.
  - Use `nx_project_details` to analyze specific project dependencies before making changes.
  - Use `nx_docs` if you are unsure about configuration or best practices.

## 2. Common Commands

### Building

- **Build Core App:** `nx build nextblock`
- **Build All Libraries:** `npm run lib-builds` (alias for building ui, utils, db, editor, sdk)
- **Build Specific Lib:** `nx build <lib-name>` (e.g., `nx build ui`)

### Linting

- **Lint Core App:** `nx lint nextblock`
- **Lint All:** `npm run lint`

### Development

- **Serve App:** `nx serve nextblock` (runs the Next.js dev server)

## 3. Troubleshooting

- If `nx start nextblock` fails with "Could not find a production build", ensure you have run `nx build nextblock` first.
- Use `nx reset` if you suspect cache issues.
