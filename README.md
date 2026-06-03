<div align="center">
 <img src="https://cms.nextblock.ca/_next/image?url=%2Fimages%2Fnextblock-logo-small.webp&w=128&q=75" alt="NextBlock™ CMS Logo" width="200"/>

# NextBlock™ CMS

**The AI-Native, Open-Core CMS for Next.js 16**

  <p align="center">
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16"></a>
    <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase" alt="Supabase"></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS"></a>
    <a href="https://nx.dev"><img src="https://img.shields.io/badge/Nx-Monorepo-blue?style=for-the-badge&logo=nx" alt="Nx"></a>
  </p>

  <p>
    <strong>Speed. Scalability. AI-Readiness (coming soon).</strong>
    <br/>
    Build premium, high-performance websites in minutes, not months.
  </p>

  <p>
    <a href="https://cms.nextblock.ca/" target="_blank"><strong>👉 View Live Demo</strong></a><br />
    Explore the admin dashboard in our public sandbox (resets every 15 minutes).<br/>
    <strong>User:</strong> demo@nextblock.ca • <strong>Pass:</strong> password
  </p>
  
  <br/>

</div>

---

## 🚀 Why NextBlock™?

Tired of slow WordPress sites? Finding headless CMSs too complex? **NextBlock™** is the sweet spot.

We combined the **flexibility of a Block Editor** with the **raw power of Next.js 16 Server Components**. The result is a CMS that feels like a static site but manages like a dynamic platform.

### ✨ Key Features

- **⚡ 100% Lighthouse Performance**: Built-in edge caching, image optimization, and zero layout shift. Speed is not a plugin; it's the default.
- **🤖 Built for AI Agents**: Our codebase is documented and structured specifically to be easily read and extended by AI coding assistants.
- **🛍️ E-Commerce Ready**: Premium commerce package for digital products, checkout providers, currency, tax, and shipping management.
- **🧱 Visual Block Editor**: A reusable Tiptap-powered Notion-style editor that your clients will actually enjoy using.
- **🔓 Open-Core Model**: The core is 100% Free & Open Source (AGPL). Premium features are activated via License Keys.

## 🆚 The NextBlock™ Advantage

| Feature          | NextBlock™ CMS                 | WordPress                 | Payload / Strapi        |
| :--------------- | :----------------------------- | :------------------------ | :---------------------- |
| **Tech Stack**   | Next.js 16 + Supabase          | PHP + MySQL               | React / Node.js         |
| **Architecture** | Nx Monorepo                    | Monolith                  | Monolith / Workspaces   |
| **Performance**  | 🟢 **100/100 (Default)**       | 🔴 Bloated (Plugins)      | 🟡 Spec-dependent       |
| **Security**     | 🔒 Static/Edge First           | 🔓 Plugin vulnerabilities | 🔒 Secure               |
| **DX**           | 💎 **React Server Components** | 📜 Legacy PHP Hooks       | 🧩 Config Heavy         |
| **AI Ready**     | ✅ **Native**                  | ❌ No                     | 🟡 Integration required |

## 🏁 Get Started in 30 Seconds

Stop cloning heavy repos. Start with our CLI and get a production-ready app instantly.

```bash
npm create nextblock@latest
```

This will run the `create-nextblock` CLI which acts as a scaffolding CLI and template sync pipeline, setting you up with the canonical application.

---

## 🏗️ For Contributors: The Factory

> **Note:** You are currently looking at the **Nx Monorepo** (The Factory), not the generated product template.
>
> NextBlock™ is an Nx monorepo for a Next.js 16 CMS backed by Supabase. The repo contains the canonical application, the `create-nextblock` CLI, shared editor and UI packages, the database and migration layer, and the premium ecommerce module.

### 🧩 Main Surfaces

- `apps/nextblock`: canonical public site and CMS application
- `apps/create-nextblock`: scaffolding CLI and template sync pipeline
- `libs/db`: Supabase clients, package activation checks, migrations, and db types
- `libs/editor`: reusable Tiptap editor package
- `libs/ecommerce`: premium commerce package and CMS commerce screens
- `libs/sdk`: typed block extensibility contract
- `libs/ui`, `libs/utils`: shared primitives and helpers

### ⚡ Developer Quickstart

To quickly get the monorepo running locally:

```bash
git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run setup
npx nx serve nextblock
```

The interactive `setup` wizard will help you automatically configure your `.env.local` and seamlessly link your Supabase project instance.

### 🛠️ Useful Commands

- `npx nx serve nextblock` - Start the local development server for the CMS
- `npm run lint` - Lint the monorepo
- `npm run db:types` - Generate Supabase types
- `npm run db:migrate:check` - Preview pending Supabase migrations safely
- `npm run db:migrate` / `npm run db:push` - Apply pending migration files only, without resets or sandbox seeding
- `npm run db:migrate:repair-history:check` - Preview baseline migration-history repair for existing live databases
- `npm run generate:sandbox` - Generate sandbox data
- `npm run sandbox:reset` - Reset the sandbox environment

### 📚 Documentation Index

The root `docs/` folder is the maintained reference set for both contributors and AI agents.

_The template docs are copied from the root docs through the sync pipeline, so this root docs set is the place to maintain first._

| Document                                                                           | Purpose                                                                                  |
| :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| [docs/01-PROJECT-OVERVIEW.md](./docs/01-PROJECT-OVERVIEW.md)                       | Monorepo structure, runtime model, and where each subsystem lives                        |
| [docs/02-ECOMMERCE-CAPABILITIES.md](./docs/02-ECOMMERCE-CAPABILITIES.md)           | Verified commerce features, checkout providers, currency, tax, shipping, and fulfillment |
| [docs/03-CMS-AND-EDITOR.md](./docs/03-CMS-AND-EDITOR.md)                           | Tiptap editor, page builder, widgets, and built-in block system                          |
| [docs/04-DATABASE-AND-AUTH.md](./docs/04-DATABASE-AND-AUTH.md)                     | Supabase clients, auth flow, schema overview, RLS, and migration map                     |
| [docs/05-DEVELOPER-GUIDE.md](./docs/05-DEVELOPER-GUIDE.md)                         | Local setup, scripts, db workflow, sandbox reset, and contributor operations             |
| [docs/06-CLI-AND-SCAFFOLDING.md](./docs/06-CLI-AND-SCAFFOLDING.md)                 | `create-nextblock`, template sync, and generated-project behavior                        |
| [docs/07-BLOCK-SDK-AND-EXTENSIBILITY.md](./docs/07-BLOCK-SDK-AND-EXTENSIBILITY.md) | SDK contract and extensibility model                                                     |
| [docs/08-NEXTBLOCK-CORTEX-AI-ARCHITECTURE.md](./docs/08-NEXTBLOCK-CORTEX-AI-ARCHITECTURE.md) | Premium Cortex AI package: model routing, BYOK, inline editor and global agent tools |
| [docs/09-LIVE-DRAFT-MODE.md](./docs/09-LIVE-DRAFT-MODE.md)                         | Real-time visual editing and non-destructive draft previewing                            |
| [docs/10-CUSTOM-BLOCKS.md](./docs/10-CUSTOM-BLOCKS.md)                             | Data-driven custom blocks: schema, CRUD, dynamic rendering, and import/export            |
| [docs/README.md](./docs/README.md)                                                 | Audience-based docs index                                                                |

> **Under the hood note:** The migration folder under `libs/db/src/supabase/migrations` is the best source of truth for current platform capabilities.

---

## 🌐 Connect With Us

Join the community and stay updated on the latest features.

- **X (Twitter):** [@NextBlockCMS](https://x.com/NextBlockCMS)
- **LinkedIn:** [NextBlock™](https://www.linkedin.com/in/nextblock/)
- **GitHub:** [nextblock-cms/nextblock](https://github.com/nextblock-cms/nextblock)
- **Medium:** [@nextblockcms](https://medium.com/@nextblockcms)
- **Dev.to:** [nextblockcms](https://dev.to/nextblockcms)

---

<p align="center">
  <sub>Built with ❤️ by the NextBlock™ Team. Licensed under AGPLv3.</sub>
</p>
