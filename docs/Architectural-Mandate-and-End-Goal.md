# **NextBlock CMS: Architectural Vision & AI Context Guide**

NOTICE TO AI ASSISTANTS (Copilot/Codex):  
This document serves as the primary source of truth for the architectural goals, constraints, and business logic of the NextBlock CMS monorepo. All code generation and refactoring suggestions MUST align with the Open-Core model and Distribution Strategy outlined below.

## **1\. The Grand Vision: Open-Core & Scalability**

NextBlock CMS is **not** just a simple website template. It is a scalable, extensible platform designed under an **Open-Core Business Model**.

### **The Business Mandate**

- **Core** Platform **(Open Source):** The base CMS, including the Editor, Database layer, and UI system, is free and open-source (AGPL).
- **Premium Extensions (Monetized):** Future modules (e.g., Advanced E-commerce, Enterprise SSO, Multi-tenancy) will be developed as **private libraries** within this same monorepo but will **not** be published to the public NPM registry. They will be sold as add-ons.

### **The Architectural Consequence**

To support this model, we utilize an **Nx Monorepo**. This allows us to:

1. **Isolate Code:** Keep open-source core libraries separate from future closed-source premium libraries.
2. **Shared Dependencies:** Manage versions (React, Next.js, Tailwind) centrally across all apps and libraries.
3. **Publish Individually:** We must be able to publish libs/ui and libs/db as standalone NPM packages (@nextblock-cms/ui, @nextblock-cms/db) so they can be consumed by end-users without exposing the entire monorepo source code.

## **2\. The Distribution Strategy: create-nextblock**

**The End Goal:** A user runs npm create nextblock my-app and gets a clean, standalone Next.js application.

### **❌ The Anti-Pattern (DO NOT DO THIS)**

**Do** NOT suggest or implement a strategy where the user simply "Git clones" the entire monorepo to start their project.

- **Reason 1:** It exposes future private/premium code.
- **Reason 2:** It forces the end-user to inherit our heavy dev tooling (Nx, linting rules, CI scripts) which they do not need.
- **Reason 3:** It breaks the versioning model required for stable releases.

### **✅ The Mandate (Current Architecture)**

We use a custom CLI (apps/create-nextblock) that:

1. Copies a streamlined **Template** (apps/create-nextblock/templates/nextblock-template).
2. Installs the Core Libraries (@nextblock-cms/db, @nextblock-cms/ui) as **dependencies** from NPM (or a local registry during dev).
3. This ensures the user gets a "finished product" experience, similar to create-next-app.

## **3\. Monorepo Structure & Responsibilities**

AI must understand where specific logic resides to prevent circular dependencies and ensure correct packaging.

| Directory                 | Type    | Package Name          | Responsibility                                                                                              |
| :------------------------ | :------ | :-------------------- | :---------------------------------------------------------------------------------------------------------- |
| **apps/nextblock**        | App     | nextblock             | The "Dev" instance of the CMS. Used for developing and testing libraries locally.                           |
| **apps/create-nextblock** | App/CLI | create-nextblock      | The CLI tool. Contains the templates/nextblock-template folder which is the _actual_ product users receive. |
| **libs/db**               | Lib     | @nextblock-cms/db     | **Supabase Layer.** Contains the client, server clients, and **Migrations** (src/supabase/migrations).      |
| **libs/ui**               | Lib     | @nextblock-cms/ui     | **Design System.** Shadcn/UI components, Tailwind configurations, and reusable UI elements.                 |
| **libs/editor**           | Lib     | @nextblock-cms/editor | **Tiptap Editor.** The block-based rich text editor logic.                                                  |
| **libs/sdk**              | Lib     | @nextblock-cms/sdk    | **Developer SDK.** For building 3rd party blocks/extensions.                                                |
| **libs/utils**            | Lib     | @nextblock-cms/utils  | Shared helpers (cn, formatting, etc).                                                                       |

## **4\. The Current Engineering Challenge: " The Bridge"**

We are currently bridging the gap between **Local Development** and **Production Packaging**.

### **The Problem**

- **In Monorepo (Dev):** apps/nextblock imports libs/ui via **TypeScript Path Aliases** (defined in tsconfig.base.json).
  - _Example:_ import { Button } from '@nextblock-cms/ui' \-\> resolves to libs/ui/src/index.ts.
- **In Production (User):** The user's app imports libs/ui via **node_modules**.
  - _Example:_ import { Button } from '@nextblock-cms/ui' \-\> resolves to node_modules/@nextblock-cms/ui/dist/index.js.

### **Known Friction Points (Debugging Focus)**

We are currently debugging the packaging process. The AI should focus on these areas:

#### **1\. Database Migrations (libs/db)**

- **Issue:** When installed as an NPM package, the file paths to SQL migrations inside node_modules/@nextblock-cms/db are different than in the monorepo.
- **Goal:** Ensure the DB package exports a utility or script that allows the consuming app to run migrations successfully, locating the .sql files correctly within node_modules.

#### **2\. UI & Tailwind (libs/ui)**

- **Issue:** Styles missing in the consumer app.
- **Goal:** Ensure libs/ui is transpiled correctly. The consumer app's tailwind.config.js must effectively scan node_modules/@nextblock-cms/ui/\*\*/\* to generate CSS classes.

## **5\. Guidelines for Code Generation**

1. **Strict Strictness:** Always adhere to strict: true in TypeScript.
2. **No Circular Refs:** libs/ui cannot depend on apps/nextblock. Logic must flow downwards.
3. **Packaging First:** When modifying a library, consider: "How will this export look when built via Vite/Rollup?"
4. **Supabase & Auth:** Follow the RLS policies defined in libs/db/src/supabase/migrations. Do not bypass RLS in client-side code.
5. **Tailwind:** Use tailwind.config.js presets if sharing config between the Lib and the App.

## **6\. Summary**

We are building a product factory, not just a website.  
The Monorepo is the factory. create-nextblock is the delivery truck. The User Appte
