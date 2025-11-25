# NextBlock CMS: AI Assistant Onboarding Guide

## 1. High-Level Vision & Strategy

- **Mission:** To deliver the **fastest, best-UX CMS** on the market.
- **Core Technologies:** Next.js 16, Supabase, Tailwind CSS, shadcn/ui, Nx Monorepo.
- **Growth Model:** A **product-led growth** model based on an **open-core** strategy. The powerful core CMS is free to attract a large developer community, which serves as the funnel for premium offerings.
- **Key Strategic Pillars:**
  - **Freemium Core + Premium Extensions**: The core CMS is free (AGPL v3), while advanced modules (like e-commerce) are sold as proprietary add-ons.
  - **Developer-First, Low-Code Friendly**: Provide a powerful SDK for developers alongside an intuitive, block-based editor for non-technical users.
  - **Ecosystem & Marketplace**: Foster a third-party marketplace for blocks, themes, and plugins.

## 2. Monorepo Architecture (`Nx`)

The project uses an Nx monorepo to enforce separation of concerns, manage dependencies, and share code efficiently. (See [`docs/monorepo-architecture.md`](./monorepo-architecture.md))

| Path             | Description                                                          | Import Alias                       | License    |
| :--------------- | :------------------------------------------------------------------- | :--------------------------------- | :--------- |
| `apps/nextblock` | The main Next.js application (the free, open-source CMS).            | N/A                                | AGPL v3    |
| `libs/ui`        | Shared `shadcn/ui` components and global styles.                     | `@nextblock-cms/ui`                | AGPL v3    |
| `libs/utils`     | General-purpose helper functions (e.g., `cn`, i18n, R2 client).      | `@nextblock-cms/utils`             | AGPL v3    |
| `libs/db`        | The dedicated data access layer for all Supabase interactions.       | `@nextblock-cms/db`                | AGPL v3    |
| `libs/sdk`       | The public SDK for third-party developers.                           | `@nextblock-cms/sdk`               | AGPL v3    |
| `libs/ecommerce` | **Premium Module:** A proprietary, closed-source e-commerce library. | `@nextblock-cms/ecommerce-premium` | Commercial |

## 3. Intellectual Property & Monetization

- **Dual-Licensing**:
  - **AGPL v3 (Core CMS)**: A strong copyleft license to prevent closed-source forks.
  - **Commercial EULA (Premium Modules)**: Proprietary license for monetized features.
- **Technical Enforcement**:
  - **Private Package Registry**: Premium modules are distributed via a private npm registry.
  - **License Key System**: The CMS activates premium features upon successful license key verification.
- **Revenue Channels**:
  - **Direct Sales**: Selling first-party premium modules.
  - **Marketplace Commission**: Taking a percentage of sales from third-party developers.
  - **Future Streams**: Managed hosting and an Enterprise Edition.

## 4. Phased Roadmap Summary

- **Phase 1 (Days 1-25): Performance Foundations**: Edge caching, critical CSS, AVIF image optimization.
- **Phase 2 (Days 26-50): Rich Editor & DX**: Advanced block editor, media library, content revisions, developer CLI, and Block SDK.
- **Phase 3 (Days 51-75): Premium Module & Monetization**: E-commerce plugin with Stripe, license key system, and marketplace backend.
- **Phase 4 (Days 76-100): Community & Launch**: Public marketplace, contributor pipeline, and v1.0 launch.

## 5. Key Architectural Patterns

- **Block-Based Content Editor**:
  - **Schema:** A single `blocks` table with a `JSONB` `content` field for flexibility.
  - **Registry:** `apps/nextblock/lib/blocks/blockRegistry.ts` is the single source of truth for all block types.
  - **Editor/Renderer Split:** Strict separation between editor forms (`.../editors/*.tsx`) and public-facing renderers (`.../renderers/*.tsx`).
  - **Optimistic UI:** Instant UI updates with debounced saves for a smooth editing experience.
  - (Source: [`/apps/nextblock/docs/cms-architecture-overview.md`](/apps/nextblock/docs/cms-architecture-overview.md))
- **CMS Application Structure (`apps/nextblock`)**:
  - **Modular Design:** The CMS is organized by feature modules (Pages, Posts, etc.) with a consistent file structure (`page.tsx`, `[id]/edit/page.tsx`, `actions.ts`).
  - **Layout & Auth:** The root CMS layout (`/app/cms/layout.tsx`) handles authentication and UI structure.
  - (Source: [`/apps/nextblock/docs/cms-application-overview.md`](/apps/nextblock/docs/cms-application-overview.md))
- **Performance Optimizations**:
  - **TipTap Dynamic Loading:** The TipTap editor is chunked and loaded dynamically only for `ADMIN` or `WRITER` roles to reduce initial bundle size for other users. (Source: [`/apps/nextblock/docs/tiptap-bundle-optimization-summary.md`](/apps/nextblock/docs/tiptap-bundle-optimization-summary.md))

## 6. Development & Operations

- **Setup:** `git clone`, `npm install`, configure `.env.local`, and run `supabase db push`.
- **Admin User:** The first user must be manually promoted to `ADMIN` in the Supabase `profiles` table.
- **Common Commands:** Use Nx from the root (e.g., `nx serve nextblock`, `nx build nextblock`).
- (Sources: [`/README.md`](/README.md), [`/apps/nextblock/README.md`](/apps/nextblock/README.md))
