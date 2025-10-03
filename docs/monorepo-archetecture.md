# NextBlock CMS: Monorepo Architecture & Development Guide

This document provides a comprehensive overview of the NextBlock CMS project, which is structured as an Nx monorepo. [cite_start]Its purpose is to serve as a contextual guide for AI assistants and an onboarding document for developers to understand the project's structure, conventions, and architectural decisions. [cite: 859]

## 1. High-Level Architecture

[cite_start]The project is organized into a monorepo to facilitate seamless code sharing, streamline dependency management, and support the long-term vision of building a platform with premium extensions and a developer SDK. [cite: 863] [cite_start]The structure is divided into `apps` (deployable units) and `libs` (reusable packages). [cite: 875]

### 1.1. Monorepo Blueprint

| Path             | Type        | Description                                                          | Alias / Import Path           |
| ---------------- | ----------- | -------------------------------------------------------------------- | ----------------------------- |
| `apps/nextblock`   | Application | The main Next.js CMS application, admin panel, and public pages.     | N/A                           |
| `libs/ui`          | Library     | Houses all shared `shadcn/ui` components, custom UI elements, and global styles. | `@nextblock-cms/ui`      |
| `libs/utils`       | Library     | Contains general-purpose utility functions, constants, and shared type definitions. | `@nextblock-cms/utils`   |
| `libs/db`          | Library     | The single source of truth for all Supabase client logic and database interactions. | `@nextblock-cms/db`      |
| `libs/ecommerce`   | Library     | [cite_start]Placeholder for the future premium e-commerce module. [cite: 879]         | `@nextblock-cms/ecommerce-premium`|
| `libs/sdk`         | Library     | [cite_start]Placeholder for the future public SDK for third-party developers. [cite: 1078] | `@nextblock-cms/sdk`              |

---
## 2. Shared Libraries (`libs/`)

### 2.1. UI Library (`libs/ui`)

* [cite_start]**Purpose**: Houses all shared React components, primarily from `shadcn/ui`, to ensure a consistent look and feel. [cite: 980]
* **Location**: `libs/ui/`
* **Key Files**:
    * [cite_start]`libs/ui/src/lib/`: Contains individual component source files (e.g., `button.tsx`, `card.tsx`). [cite: 989]
    * [cite_start]`libs/ui/src/index.ts`: The public API for the library, which exports all components from a single entry point. [cite: 991]
    * [cite_start]`libs/ui/src/styles/globals.css`: The main global stylesheet containing Tailwind directives and CSS variables for theming. [cite: 990]
* [cite_start]**Import Convention**: All components must be imported from the root of the library alias. [cite: 1044]
    ```typescript
    // Correct
    import { Button, Card } from '@nextblock-cms/ui';

    // Incorrect
    import { Button } from '@nextblock-cms/ui/lib/button';
    ```

### 2.2. Utilities Library (`libs/utils`)

* [cite_start]**Purpose**: Centralizes all general-purpose, non-UI, non-database helper functions. [cite: 1015]
* **Location**: `libs/utils/`
* [cite_start]**Contents**: Includes core helper functions like `cn` for class names[cite: 1020], utilities for internationalization (`translations.ts`), object storage (`r2-client.ts`), and environment variable validation (`check-env-vars.ts`).
* **Import Convention**:
    ```typescript
    import { cn, checkEnvVars } from '@nextblock-cms/utils';
    ```

### 2.3. Database Library (`libs/db`)

* [cite_start]**Purpose**: Completely isolates all database-related logic to create a dedicated data access layer. [cite: 1026] [cite_start]This is the single source of truth for interacting with Supabase and is designed to be consumed by both the main app and future modules like e-commerce. [cite: 1029]
* **Location**: `libs/db/`
* **Contents**:
    * `libs/db/src/lib/supabase/`: Contains the various Supabase client initializations for different contexts (client-side, server-side, middleware).
    * `libs/db/src/supabase/`: Contains the actual Supabase migrations and the `config.toml` file.
* **Import Convention**:
    ```typescript
    import { createClient } from '@nextblock-cms/db';
    ```

---
## 3. Application (`apps/nextblock`)

* [cite_start]**Purpose**: The primary Next.js application that consumes the shared `libs`. [cite: 1038]
* **Location**: `apps/nextblock/`
* **Key Architectural Principles**:
    * **Server Actions**: To prevent server-side modules (like `fs` or `nodemailer`) from being incorrectly bundled on the client, logic that requires Node.js APIs is strictly isolated in Server Action files within `apps/nextblock/app/actions/` and marked with `"use server";`.
    * **Application-Specific Logic**: Code that is not intended to be shared, such as the `blockRegistry.ts`, remains within the application's own `lib` directory.

---
## 4. Key Configurations & Development

* [cite_start]**`package.json`**: Located at the monorepo root, this single file manages all `npm` dependencies for the entire workspace to ensure version consistency. [cite: 929]
* [cite_start]**`tsconfig.base.json`**: Located at the monorepo root, this file defines the global TypeScript path aliases (`@nextblock-cms/*`) that allow for clean, non-relative imports between libraries and applications. [cite: 934]
* [cite_start]**`components.json`**: Located at the monorepo root, this file configures the `shadcn/ui` CLI with the correct monorepo-aware paths for adding new components to the `libs/ui` library. [cite: 994, 996]
* **`tailwind.config.ts` (Two-File Structure)**:
    * [cite_start]**Root Config** (`./tailwind.config.ts`): The main configuration holding the entire shared theme, plugins, and a `content` array that scans all `apps` and `libs`. [cite: 1008, 1009]
    * [cite_start]**App Config** (`./apps/nextblock/tailwind.config.ts`): A small, app-specific config that uses `presets` to inherit all settings from the root config, ensuring consistency. [cite: 1011]

### 4.1. Common Nx Commands

[cite_start]Development is managed through a set of Nx commands run from the monorepo root. [cite: 1100]

| Command      | Description                                              | Example Usage                                      |
| ------------ | -------------------------------------------------------- | -------------------------------------------------- |
| `nx serve`     | Serves an application for development with hot-reloading.  | `nx serve nextblock`                               |
| `nx build`     | Builds an application or library for production.         | `nx build nextblock`                               |
| `nx lint`      | Runs the linter on a specific project or the entire workspace. | `nx lint ui`                                       |
| `nx generate`  | Scaffolds new applications, libraries, or components.     | `nx g @nx/react:component MyButton --project=ui` |
| `nx graph`     | Visualizes the dependency graph of the entire workspace. | `nx graph`                                         |
### 4.2. TypeScript Development Notes

*   **Module Resolution Ambiguity:** To prevent subtle build errors (like `ts(6307)`), avoid creating files with the same base name but different extensions (e.g., `feature.ts` and `feature.tsx`) within the same directory. This can cause ambiguity in the build system's module resolution process. Always ensure component files (`.tsx`) have a unique name that is distinct from any corresponding logic files (`.ts`).