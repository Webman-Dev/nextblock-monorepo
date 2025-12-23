# 🛠️ NextBlock CMS: Contributor Guide (The Factory)

**Welcome, Engineer.** You have chosen the red pill.

This guide is for developers who want to work on the **core platform**, build **premium extensions**, or understand the **monorepo architecture**. If you just want to build a website, go to the [User Quickstart](./tutorial-user-quickstart.md).

---

## 🏗️ The "Factory" Architecture

We use **Nx** to manage a monorepo that contains both the "Product" (what users get) and the "Factory" (tools to build/distribute it).

- `apps/nextblock`: A "dev workbench" app. It imports libraries via local paths (`libs/*`), not npm. We use this to develop features.
- `libs/ui`: The shared design system. Published as `@nextblock-cms/ui`.
- `libs/editor`: The Tiptap block editor. Published as `@nextblock-cms/editor`.
- `apps/create-nextblock`: The CLI tool.

**Your Goal**: Make changes in `libs/` or `apps/nextblock`, and ensure they work in the standalone template.

---

## Step 1: Local Setup

### 1. Clone & Install

```bash
git clone https://github.com/Webman-Dev/nextblock-monorepo.git
cd nextblock-monorepo
npm install
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.exemple .env.local
```

You need a **Supabase Project** for local development.

> **Note:** You can technically run Supabase locally via Docker (`npm supabase start`), but we recommend connecting to a cloud "Dev" project to save resources and easily share data with the team.

Fill in `.env.local` with your Dev project keys (same process as the User Tutorial).

---

## Step 2: Running the Stack

To start the development environment:

```bash
nx serve nextblock
```

This boots up the Next.js app at `http://localhost:4200` (Nx default port) or `3000`.

### Database Migrations

We use Supabase migrations to manage the schema.

**To create a new migration:**

```bash
# Creates a new SQL file in libs/db/src/supabase/migrations
npm supabase migration new my_new_feature
```

**To apply migrations to your remote Dev database:**

```bash
npm run db:push
```

**To generate TypeScript definitions:**

```bash
npm run db:types
```

---

## Step 3: Making Changes

### Modifying the Core (UI/Editor)

If you edit files in `libs/ui` or `libs/editor`, the `apps/nextblock` dev server will hot-reload automatically.

**Warning**: Do not import `apps/nextblock` code _into_ a library. Dependencies must flow ONE WAY: `App -> Lib`.

### Working on the CLI

If you are changing the `create-nextblock` CLI or the `nextblock-template`:

1.  Make changes in `apps/create-nextblock`.
2.  Test it by running the local binary:
    ```bash
    node apps/create-nextblock/bin/create-nextblock.js my-test-site
    ```

---

## Step 4: Submitting a Pull Request

1.  Run the linter:
    ```bash
    nx run-many -t lint
    ```
2.  Verify the build:
    ```bash
    nx build nextblock
    ```
3.  Push your branch and open a PR.

## Step 5: Deploying Your Fork (Optional)

If you want to deploy your own instance of the monorepo to Vercel:

1.  **Vercel Settings**:
    - Add all required Environment Variables (including `SUPABASE_ACCESS_TOKEN`).
    - Set `NEXT_PUBLIC_URL` to your Vercel domain.

2.  **Build Command**:
    Override the default build command to sync Supabase config:

    ```bash
    npx nx build nextblock && npm run deploy:supabase
    ```

    > **Note:** This step ensures **Auth Verification Emails** redirect to your live URL. It is strictly for production; local development handles this automatically.

---

**Thank you for building the future of web content!**
