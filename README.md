<table style="border:2px solid #dc2626;border-radius:6px;background:#fee2e2;padding:12px;">
  <tr>
    <td>
      <strong>Warning:</strong> This project is not ready to be tested locally. I'm still working on a database seed to help people start with a basic template.
    </td>
  </tr>
</table>

# NextBlock CMS Monorepo

This project is a starter template for building an ultra-fast, localized, block-based Content Management System (CMS). It is structured as an [Nx](https://nx.dev) monorepo to facilitate seamless code sharing and streamline dependency management.

The stack includes:
- **Framework:** Next.js 15 (App Router)
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Styling:** Tailwind CSS & shadcn/ui
- **Workspace:** Nx (Monorepo)

The CMS features Role-Based Access Control, internationalization (i18n), a dynamic block-based content editor, and on-demand revalidation for statically generated pages.

## Monorepo Architecture

The project is organized into `apps` (deployable units) and `libs` (reusable packages). This structure supports the long-term vision of building a platform with premium extensions and a developer SDK.

### Monorepo Blueprint

| Path             | Type        | Description                                                          | Alias / Import Path           |
| ---------------- | ----------- | -------------------------------------------------------------------- | ----------------------------- |
| `apps/nextblock`   | Application | The main Next.js CMS application, admin panel, and public pages.     | N/A                           |
| `libs/ui`          | Library     | Houses all shared `shadcn/ui` components, custom UI elements, and global styles. | `@nextblock-cms/ui`      |
| `libs/utils`       | Library     | Contains general-purpose utility functions, constants, and shared type definitions. | `@nextblock-cms/utils`   |
| `libs/db`          | Library     | The single source of truth for all Supabase client logic and database interactions. | `@nextblock-cms/db`      |
| `libs/ecommerce`   | Library     | Placeholder for the future premium e-commerce module.         | `@nextblock-cms/ecommerce-premium`|
| `libs/sdk`         | Library     | Placeholder for the future public SDK for third-party developers. | `@nextblock-cms/sdk`              |

---

## Getting Started: From Clone to Running App

Follow these steps to set up and run the project locally.

### Step 1: Clone Repository

```bash
git clone https://github.com/Webman-Dev/nextblock-monorepo.git
cd nextblock-monorepo
```

### Step 2: Install Dependencies

All dependencies are managed at the monorepo root.

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Step 3: Set Up Environment Variables

You need to create a local environment file for the `nextblock` application.

1.  Copy the example file:
    ```bash
    cp .env.exemple apps/nextblock/.env.local
    ```
2.  Open `apps/nextblock/.env.local` and fill in the required keys. You will need credentials for your Supabase project and your Cloudflare R2 bucket.

    ```env
    # Supabase Project Connection (from your Supabase project's API settings)
    NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    SUPABASE_PROJECT_ID=your-supabase-project-id

    # Cloudflare R2 Storage
    NEXT_PUBLIC_R2_BASE_URL=https://your-r2-public-url.r2.dev/your-bucket-name
    R2_ACCOUNT_ID=your_cloudflare_account_id
    R2_ACCESS_KEY_ID=your_r2_access_key_id
    R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
    R2_BUCKET_NAME=your_r2_bucket_name
    R2_S3_ENDPOINT=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
    R2_REGION=auto

    # Next.js Site Configuration
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    REVALIDATE_SECRET_TOKEN=generate_a_strong_random_string_here
    ```

### Step 4: Apply Supabase Migrations

Ensure you have the Supabase CLI installed and are logged in (`supabase login`).

1.  Link your local project to your Supabase project (run from the monorepo root):
    ```bash
    supabase link --project-ref your-project-ref
    ```
2.  Apply all database migrations:
    ```bash
    supabase db push
    ```
    This will create all necessary tables, roles, RLS policies, and helper functions.

### Step 5: Configure Supabase Webhooks

To enable on-demand revalidation for static pages, you must set up Database Webhooks to call a Next.js API endpoint.

1.  Go to your Supabase Project Dashboard -> Database -> Webhooks.
2.  Click "Create a new webhook".

**For the `pages` Table:**
*   **Name:** `Next.js Revalidate Pages`
*   **Table:** Select `pages` (from the `public` schema).
*   **Events:** Check `INSERT`, `UPDATE`, `DELETE`.
*   **Webhook Type:** `HTTP Request`
*   **HTTP URL:** Your Next.js application's revalidation API endpoint (e.g., `https://your-app-name.vercel.app/api/revalidate`). For local development, use a tunneling service like ngrok.
*   **HTTP Method:** `POST`
*   **HTTP Headers:**
    *   `x-revalidate-secret`: The same `REVALIDATE_SECRET_TOKEN` from your `.env.local`.
    *   `Content-Type`: `application/json`

Create a similar webhook for the `posts` table.

### Step 6: Run the Development Server

Use the Nx `serve` command from the monorepo root:

```bash
nx serve nextblock
```

The application should now be running at [http://localhost:3000](http://localhost:3000/).

### Step 7: Initial Admin User Setup

1.  Sign up for a new user account through the application's sign-up page.
2.  After verifying your email, you must manually promote this user to `ADMIN`.
3.  Go to the Supabase Studio (Table Editor -> `profiles` table).
4.  Find your user's row and change the `role` column value from `USER` to `ADMIN`.

---

## Development and Commands

Development is managed through a set of Nx commands run from the monorepo root.

| Command      | Description                                              | Example Usage                                      |
| ------------ | -------------------------------------------------------- | -------------------------------------------------- |
| `nx serve`     | Serves an application for development with hot-reloading.  | `nx serve nextblock`                               |
| `nx build`     | Builds an application or library for production.         | `nx build nextblock`                               |
| `nx lint`      | Runs the linter on a specific project or the entire workspace. | `nx lint ui`                                       |
| `nx generate`  | Scaffolds new applications, libraries, or components.     | `nx g @nx/react:component MyButton --project=ui` |
| `nx graph`     | Visualizes the dependency graph of the entire workspace. | `nx graph`                                         |

---

## Further Documentation

For a deeper dive into the project's architecture and application structure, please refer to the following documents:

*   [`docs/monorepo-archetecture.md`](docs/monorepo-archetecture.md)
*   [`apps/nextblock/docs/cms-application-overview.md`](apps/nextblock/docs/cms-application-overview.md)
*   [`apps/nextblock/docs/cms-architecture-overview.md`](apps/nextblock/docs/cms-architecture-overview.md)
