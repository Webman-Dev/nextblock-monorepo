# Next.js 15 & Supabase - Ultra-Fast CMS Template

This project is a starter template for building an ultra-fast, localized, block-based Content Management System (CMS) using Next.js 15 (App Router), Supabase for the backend (PostgreSQL, Auth, Storage via R2), Tailwind CSS for styling, and shadcn/ui for components.

It features:
- Role-Based Access Control (Admin, Writer, User)
- Internationalization (i18n) with client-side language switching on single URLs
- Block-based content editor for Pages and Posts
- Media uploads to Cloudflare R2 with a Media Library
- Static Site Generation (SSG) with Incremental Static Regeneration (ISR) for public-facing content
- On-demand revalidation via Supabase Database Webhooks

## Features Implemented (Phases 1-6)

* **Authentication & Authorization (Phase 1):** User roles (ADMIN, WRITER, USER), profiles table linked to `auth.users`, Row Level Security (RLS) on tables, Next.js middleware for route protection, and client-side auth context.
* **Internationalization (Phase 2):** `languages` table in Supabase, client-side language switching using `LanguageContext` without URL path changes (e.g., `/about-us` serves content based on selected language), and auto-creation of localized placeholder content.
* **CMS Schema & Core CRUD (Phase 3):** Database tables for `pages`, `posts`, `media`, `blocks`, `navigation_items`. CRUD UIs and server actions for managing Pages, Posts, Navigation Items, Users (role changes), and Languages.
* **Block-Based Content Builder (Phase 4):** Dynamic block system for Pages (and Posts), UI for adding, editing (basic forms), deleting, and drag-and-drop reordering of content blocks.
* **Rich Text & Media (Phase 5):** Tiptap rich text editor integrated into "Text" blocks, image insertion from Media Library into Tiptap, and media uploads to Cloudflare R2 with a Media Library UI (upload, view, delete, edit metadata).
* **SSG & Revalidation (Phase 6):** Static generation of public pages/posts (default language), client-side content fetching for language changes, `generateStaticParams`, `generateMetadata`, and on-demand revalidation via Supabase Database Webhooks calling a Next.js API route.

## Clone and Run Locally

1.  **Create a Supabase Project:**
    * Go to the [Supabase dashboard](https://database.new) and create a new project.

2.  **Clone This Repository:**
    ```bash
    git clone <your-repository-url> your-cms-app
    cd your-cms-app
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

4.  **Set Up Environment Variables:**
    * Rename `.env.example` to `.env.local`.
    * Update the following variables in `.env.local` with your Supabase project details and other configurations:

        ```env
        # Supabase Project Connection (from your Supabase project's API settings)
        NEXT_PUBLIC_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
        SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Found in API settings, needed for admin actions like deleting users
        SUPABASE_PROJECT_ID=your-supabase-project-id # Used by the Supabase CLI (e.g., in supabase/config.toml)

        # Cloudflare R2 Storage (from your Cloudflare R2 bucket settings & API token)
        NEXT_PUBLIC_R2_BASE_URL=[https://your-r2-public-url.r2.dev/your-bucket-name](https://your-r2-public-url.r2.dev/your-bucket-name) # Or your custom domain for R2
        R2_ACCOUNT_ID=your_cloudflare_account_id
        R2_ACCESS_KEY_ID=your_r2_access_key_id
        R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
        R2_BUCKET_NAME=your_r2_bucket_name
        R2_S3_ENDPOINT=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com # e.g., [https://abcdef12345.r2.cloudflarestorage.com](https://abcdef12345.r2.cloudflarestorage.com)
        R2_REGION=auto # Typically 'auto' for R2

        # Next.js Site Configuration
        NEXT_PUBLIC_SITE_URL=http://localhost:3000 # For local dev; update for production (e.g., [https://www.yourdomain.com](https://www.yourdomain.com))
        REVALIDATE_SECRET_TOKEN=generate_a_strong_random_string_here # Used to secure the on-demand revalidation API endpoint
        ```
    * `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in your Supabase project's API settings.
    * `SUPABASE_SERVICE_ROLE_KEY` is also in API settings (typically hidden by default, click "Reveal").
    * Generate a strong, unique string for `REVALIDATE_SECRET_TOKEN`.

5.  **Apply Supabase Migrations:**
    * Ensure you have the Supabase CLI installed and are logged in (`supabase login`).
    * Link your local project to your Supabase project:
        ```bash
        supabase link --project-ref your-project-ref
        ```
    * Apply all database migrations:
        ```bash
        supabase db push
        ```
        Alternatively, if you prefer to run migrations individually (e.g., for a fresh setup or to ensure order):
        ```bash
        supabase migration up
        ```
    * This will create all necessary tables (`profiles`, `languages`, `pages`, `posts`, `media`, `blocks`, `navigation_items`), roles, RLS policies, and helper functions.

6.  **Configure Supabase Database Webhooks for On-Demand Revalidation:**
    Since this project avoids using Supabase Edge Functions (and their Docker dependency) for revalidation, you need to manually set up Database Webhooks to call your Next.js API endpoint directly.

    * Go to your Supabase Project Dashboard -> Database -> Webhooks.
    * Click "Create a new webhook".

    * **For the `pages` Table:**
        * **Name:** `Next.js Revalidate Pages` (or similar)
        * **Table:** Select `pages` (from the `public` schema).
        * **Events:** Check `INSERT`, `UPDATE`, `DELETE`.
        * **Webhook Type:** `HTTP Request`
        * **HTTP URL:** Your Next.js application's revalidation API endpoint.
            * For local development (if using a tunneling service like ngrok to expose localhost): `http://your-ngrok-url.ngrok.io/api/revalidate`
            * For production (e.g., Vercel): `https://your-app-name.vercel.app/api/revalidate`
        * **HTTP Method:** `POST`
        * **HTTP Headers:**
            * Click "Add header".
                * Header name: `x-revalidate-secret`
                * Header value: The same `REVALIDATE_SECRET_TOKEN` you set in your `.env.local`.
            * Click "Add header" again.
                * Header name: `Content-Type`
                * Header value: `application/json`
        * Click "Create webhook".

    * **For the `posts` Table:**
        * Create another webhook with similar settings:
            * **Name:** `Next.js Revalidate Posts`
            * **Table:** `posts`
            * **Events:** `INSERT`, `UPDATE`, `DELETE`.
            * **HTTP URL:** Same as above.
            * **HTTP Method:** `POST`
            * **HTTP Headers:**
                * `x-revalidate-secret`: Your `REVALIDATE_SECRET_TOKEN`
                * `Content-Type`: `application/json`
            * Click "Create webhook".

7.  **Run the Next.js Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    The application should now be running on [http://localhost:3000](http://localhost:3000/).

8.  **Initial Admin User Setup:**
    * Sign up for a new user account through the application's sign-up page.
    * After signing up and verifying the email, you'll need to manually update this user's role to `ADMIN` in the Supabase `profiles` table. You can do this via the Supabase Studio (Table Editor -> `profiles` table).
        * Find your user's row (by their ID, which matches `auth.users.id`).
        * Change the `role` column value from `USER` to `ADMIN`.

9.  **Shadcn/UI Styling (Optional):**
    * This template comes with the default shadcn/ui style initialized. If you want to customize the theme or use a different base color, you can delete `components.json` and re-initialize shadcn/ui following their [official documentation](https://ui.shadcn.com/docs/installation/next).

## Project Structure Highlights

* `app/`: Next.js App Router.
    * `app/(auth-pages)/`: Routes for sign-in, sign-up, etc.
    * `app/cms/`: CMS admin panel routes and layouts.
        * `app/cms/[entity]/`: CRUD pages for different content types (pages, posts, media, users, navigation, languages).
        * `app/cms/blocks/`: Components and actions related to the block editor.
    * `app/[slug]/`: Dynamic route for public "Pages".
    * `app/blog/[slug]/`: Dynamic route for public "Posts".
    * `app/api/`: API routes (e.g., for revalidation, R2 pre-signed URLs).
* `components/`: Shared UI components (shadcn/ui based).
    * `components/ui/`: shadcn/ui components.
* `context/`: React Context providers (e.g., `AuthContext`, `LanguageContext`).
* `lib/`: Utility functions and configurations.
    * `lib/cloudflare/`: Client for Cloudflare R2.
* `utils/supabase/`: Supabase client setup, types, and middleware helpers.
* `supabase/migrations/`: SQL database migrations.

## Documentation

For a deeper understanding of the CMS's internal workings, please refer to the detailed documentation:

*   **[CMS Application Overview](./docs/cms-application-overview.md):** A high-level guide to the Next.js application structure, core modules, and key functionalities.
*   **[Block Editor Architecture](./docs/cms-architecture-overview.md):** A technical deep-dive into the architecture of the block-based content editor.

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/).

1.  Push your code to a GitHub/GitLab/Bitbucket repository.
2.  Import the project into Vercel.
3.  **Configure Environment Variables in Vercel:**
    * Add all the environment variables from your `.env.local` file to your Vercel project settings (Project Settings -> Environment Variables). This includes Supabase keys, R2 keys, `NEXT_PUBLIC_SITE_URL` (set to your production domain), and `REVALIDATE_SECRET_TOKEN`.
4.  Vercel will automatically build and deploy your Next.js application.
5.  Ensure your Supabase Database Webhooks are pointing to your production Next.js API endpoint for revalidation.

## Database Backup

This project includes a simple script to backup your Supabase PostgreSQL database.

**Requirements:**
*   You must have the PostgreSQL command-line tools (`pg_dump`) installed and available in your system's PATH.

**Usage:**
To create a backup, run the following command from your project root:

```bash
npm run db:backup
```

This command will generate a timestamped SQL dump file and save it to the `backup/` directory.
## Feedback and Issues

Please file feedback and issues on the GitHub repository for this project.
