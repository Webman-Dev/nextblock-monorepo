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

This runs the `create-nextblock` CLI, which scaffolds the canonical application. The CLI no longer asks for credentials in the terminal — once the project is created, start it and finish setup in your browser:

```bash
npm run dev   # then open http://localhost:4200/setup
```

The **First-Boot Setup Wizard** at `/setup` walks you through connecting Supabase, configuring storage / email, and creating the first administrator. Every fresh instance redirects there automatically until an admin exists.

### ☁️ Deploy to the cloud in one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnextblock-cms%2Fnextblock&project-name=nextblock&repository-name=nextblock&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)

> **Tip — keep the new repo public.** When Vercel asks, leave **"Create private Git
> Repository" unchecked**. On the free (Hobby) plan, automatic upstream updates only deploy
> from a **public** repo — Hobby blocks bot-authored deploys on private repos — and public
> also makes update checks fully tokenless. You can change visibility later in the repo's
> GitHub settings if you change your mind. Details: [docs/13](./docs/13-STAYING-UP-TO-DATE.md).

During import, Vercel's native **Supabase Marketplace integration** (the `stores`
button parameter) prompts you to create a Supabase database (name + region), then
**provisions it, connects it to the project, and injects its keys before the first
build** — you never copy a value, and there are **no environment variables to fill in**
(the site URL defaults to your `*.vercel.app` URL and the app secrets are derived
automatically). The app boots with the database already connected: the wizard
auto-skips the connection step, applies the schema for you, uses the connected Supabase
project for media storage, and leaves just "create your admin." Full walkthrough:
[docs/12-VERCEL-DEPLOYMENT.md](./docs/12-VERCEL-DEPLOYMENT.md).

> **Want a fully local, zero-config sandbox?** Use **Local Self-Hosted Docker Mode** — one command spins up the entire stack (Supabase engines + S3 storage + the app) on your own machine, with **no cloud accounts**. The app boots straight into the `/setup` wizard with MinIO storage pre-filled. See [docs/11-SELF-HOSTED-DOCKER.md](./docs/11-SELF-HOSTED-DOCKER.md).

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

**Prerequisites** — create these three things first; `npm run setup` will ask for their keys:

1. **Supabase project** ([dashboard](https://supabase.com/dashboard)) — you'll need the **Reference ID** (Project Settings → General), the **connection string** (Connect → Direct connection → URI), the **anon** + **service_role** keys (Project Settings → API Keys), and a **Personal Access Token** (Account → Access Tokens → Generate new token).
2. **Cloudflare R2 bucket** ([dashboard](https://dash.cloudflare.com) → R2) — create a bucket, enable its **Public Development URL** (Bucket → Settings → General), then create an **Account API token** (R2 → Manage API Tokens) with _Object Read & Write_. Copy the **Access Key ID** and **Secret Access Key** — the secret is shown only once.
3. **SMTP credentials** ([SMTP2GO](https://www.smtp2go.com) works very well) — required so Supabase can email the confirmation link your first admin needs to sign in.

Then run:

```bash
git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run setup
npx nx serve nextblock
```

The interactive `setup` wizard writes your `.env.local` (Supabase, R2, SMTP, and auto-generated secrets), links the Supabase CLI, and applies the database schema.

**First login:** the dev server runs at **http://localhost:4200**. Open `/sign-up` and create your account — the **first** account to register automatically becomes the **ADMIN**. Click the confirmation email (or confirm the user in Supabase → Authentication → Users), then sign in to reach the CMS at `/cms/dashboard`.

#### 🐳 Or: one-click local stack (no cloud accounts)

Prefer to run everything on your machine? With **Docker Desktop** running:

```bash
git clone https://github.com/nextblock-cms/nextblock.git
cd nextblock
npm install
npm run docker:setup     # or: npm run setup → pick "Local Self-Hosted Docker Mode"
```

This builds and boots the full self-hosted stack (Postgres + GoTrue + PostgREST + Kong, MinIO for media, and the app) and applies migrations automatically — the only prompts are optional Turnstile and SMTP. The app runs at **http://localhost:3000** and the first sign-up becomes ADMIN (auto-confirmed, no email step). Manage it with `npm run docker:up` / `docker:down` / `docker:logs`. Full guide: [docs/11-SELF-HOSTED-DOCKER.md](./docs/11-SELF-HOSTED-DOCKER.md).

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
| [docs/11-SELF-HOSTED-DOCKER.md](./docs/11-SELF-HOSTED-DOCKER.md)                   | One-click local self-hosted Docker stack: Supabase engines, MinIO storage, migration runner, and how it maps to cloud |
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
