# NextBlock™ CMS: Architectural Vision & Master Context

> **NOTICE TO AI ASSISTANTS (Copilot/Cursor/Claude):**
> This document is the **Primary Source of Truth** for the architectural goals, constraints, and business logic of the NextBlock™ CMS monorepo. All code generation and refactoring suggestions MUST align with the Open-Core model and Distribution Strategy outlined below.

---

## 1. The Grand Vision: Open-Core & Scalability

NextBlock™ CMS is **not** just a simple website template. It is a scalable, extensible platform designed under an **Open-Core Business Model**.

### The Business Mandate

- **Core Platform (Open Source):** The base CMS (Next.js 16 + Supabase), including the Editor, Database layer, and UI system, is free and open-source (AGPL).
- **Premium Packages (Source-Available, License-Gated):** Advanced modules (e.g., E-Commerce Pro, AI Agents) are included in the monorepo but are **gated by a License Key System**. They are NOT private libraries; they are visible to the user but require activation to function.

### The "Product" vs. The "Factory"

- **The Factory (This Monorepo):** Where we build the core libraries and the CLI tool.
- **The Product (User's App):** What the user gets when they run `npm create nextblock`. It is a standalone Next.js app that consumes our libraries from NPM.

---

## 2. Key Strategic Pillars (The "Why")

1.  **Freemium Core + Premium Extensions:** We attract a large developer community with a powerful free tier, which serves as the funnel for premium offerings.
2.  **Developer-First, Low-Code Friendly:** We provide a powerful SDK for developers alongside an intuitive, block-based editor for non-technical users.
3.  **Ecosystem & Marketplace:** We are building a foundation for a third-party marketplace for blocks, themes, and plugins.

---

## 3. Monorepo Architecture (`Nx`)

The project uses an Nx monorepo to enforce separation of concerns.

| Path                      | Type    | Package Name            | Responsibility                                                                                   |
| :------------------------ | :------ | :---------------------- | :----------------------------------------------------------------------------------------------- |
| **apps/nextblock**        | App     | `nextblock`             | The "Dev" instance. Used for developing and testing libraries locally.                           |
| **apps/create-nextblock** | App/CLI | `create-nextblock`      | The CLI tool. Contains the `templates/nextblock-template` folder which is the _actual_ product.  |
| **libs/db**               | Lib     | `@nextblock-cms/db`     | **Supabase Layer.** Contains client, server clients, and Migrations (`src/supabase/migrations`). |
| **libs/ui**               | Lib     | `@nextblock-cms/ui`     | **Design System.** Shadcn/UI components, Tailwind tokens.                                        |
| **libs/editor**           | Lib     | `@nextblock-cms/editor` | **Tiptap Editor.** The block-based rich text editor logic.                                       |
| **libs/ecommerce**        | Lib     | `@nextblock-cms/ecom..` | **Premium Package.** included in the repo but requires `verifyPackageOnline()` to work.          |

---

## 4. Monetization & Licensing Architecture

We use a **"Defense in Depth"** strategy for premium features.

1.  **Source Available:** The code is in the user's `node_modules`. We do not obfuscate it.
2.  **License Key Gate:** The user buys a key from Lemon Squeezy (MoR) and activates it in the CMS Admin.
3.  **The "Gatekeeper":** Critical functions (like `createCheckoutSession`) call `verifyPackageOnline('ecommerce')` and throw if the license is invalid.
4.  **UI Hiding:** The Admin Sidebar checks `isPackageActive` to show/hide premium menus.

---

## 5. Development Guidelines for AI

### Code Generation Rules

1.  **Strict Strictness:** Always adhere to `strict: true` in TypeScript.
2.  **Unidirectional Data Flow:** `libs/ui` cannot depend on `apps/nextblock`. Logic must flow downwards.
3.  **Packaging First:** When modifying a library, ask: "How will this export look when built via Vite/Rollup?"
4.  **Supabase RLS:** Adhere to RLS policies. Do not bypass RLS in client-side code (`useSupabaseBrowser`). Only internal Server Actions may use the Service Role.
5.  **Tailwind:** Use `tailwind.config.js` presets if sharing config between the Lib and the App.

### Critical Anti-Patterns (DO NOT DO THIS)

x **DO NOT** suggest users "Git clone" the monorepo to start a project. Always use `npm create nextblock`.
x **DO NOT** use private NPM registries anymore. We are fully public on NPM.
x **DO NOT** put business logic in `libs/ui`. Keep components dumb.

---

## 6. Phased Roadmap

- **Phase 1: Performance Foundations** (Completed) - Edge caching, critical CSS.
- **Phase 2: Rich Editor & DX** (Completed) - Tiptap v3, Media Library.
- **Phase 3: Premium Module** (Current) - E-commerce, License Key System.
- **Phase 4: Launch** (Next) - Public launch, v1.0 release.

---

## 7. Core Application Internals (`nextblock`)

This section details the internal structure of the main Next.js application (`apps/nextblock`).

### 7.1 CMS Root Layout (`app/cms/layout.tsx`)

The file [`app/cms/layout.tsx`](app/cms/layout.tsx) is the foundational component for the entire CMS interface, wrapping all pages under the `/cms` path.

#### Key Responsibilities:

- **Authentication and Access Control**: Uses `useAuth` to protect CMS routes.
- **UI Structure**: Renders the Sidebar, Main Content Area, and Dynamic Header.
- **Dynamic Page Title**: Detemines title via `usePathname`.

### 7.2 Core CMS Modules (`app/cms/*`)

The CMS is organized into modular feature directories:

- **Dashboard (`app/cms/dashboard/`)**: Landing page with stats.
- **Pages (`app/cms/pages/`)**: Static page management.
- **Posts (`app/cms/posts/`)**: Blog/Article management.
- **Media (`app/cms/media/`)**: Asset library.
- **Navigation (`app/cms/navigation/`)**: Menu builder.
- **Users (`app/cms/users/`)**: User/Role management (Admin only).
- **Settings (`app/cms/settings/`)**: Site-wide settings (Languages, Logos).

### 7.3 Common Module Pattern

Each module follows a consistent structure:

- `page.tsx`: List view (Table/Grid).
- `[id]/edit/page.tsx`: Edit form.
- `new/page.tsx`: Creation form.
- `actions.ts`: Server Actions (`create`, `update`, `delete`).
- `components/`: Module-specific components.
