# Next.js 16 & Supabase - Ultra-Fast CMS Template

This project is a starter template for building an ultra-fast, localized, block-based Content Management System (CMS) using Next.js 16 (App Router), Supabase for the backend (PostgreSQL, Auth, Storage via R2), Tailwind CSS for styling, and shadcn/ui for components.

It features:

- Role-Based Access Control (Admin, Writer, User)
- Internationalization (i18n) with client-side language switching on single URLs
- Block-based content editor for Pages and Posts
- Media uploads to Cloudflare R2 with a Media Library
- Static Site Generation (SSG) with Incremental Static Regeneration (ISR) for public-facing content
- On-demand revalidation via Supabase Database Webhooks

## Features Implemented (Phases 1-6)

- **Authentication & Authorization (Phase 1):** User roles (ADMIN, WRITER, USER), profiles table linked to `auth.users`, Row Level Security (RLS) on tables, Next.js middleware for route protection, and client-side auth context.
- **Internationalization (Phase 2):** `languages` table in Supabase, client-side language switching using `LanguageContext` without URL path changes (e.g., `/about-us` serves content based on selected language), and auto-creation of localized placeholder content.
- **CMS Schema & Core CRUD (Phase 3):** Database tables for `pages`, `posts`, `media`, `blocks`, `navigation_items`. CRUD UIs and server actions for managing Pages, Posts, Navigation Items, Users (role changes), and Languages.
- **Block-Based Content Builder (Phase 4):** Dynamic block system for Pages (and Posts), UI for adding, editing (basic forms), deleting, and drag-and-drop reordering of content blocks.
- **Rich Text & Media (Phase 5):** Tiptap rich text editor integrated into "Text" blocks, image insertion from Media Library into Tiptap, and media uploads to Cloudflare R2 with a Media Library UI (upload, view, delete, edit metadata).
- **SSG & Revalidation (Phase 6):** Static generation of public pages/posts (default language), client-side content fetching for language changes, `generateStaticParams`, `generateMetadata`, and on-demand revalidation via Supabase Database Webhooks calling a Next.js API route.

## 🚀 Getting Started

The fastest way to start a new project is with our interactive setup wizard.

```bash
npm create nextblock@latest
```

This command will:

1.  Scaffold a new NextBlock project.
2.  Guide you through Supabase and Cloudflare R2 configuration.
3.  Set up your local environment variables automatically.

### Manual Setup

If you are contributing to the core repo or prefer manual setup:

1.  **Clone the repo:**

    ```bash
    git clone https://github.com/Webman-Dev/nextblock-monorepo.git
    cd nextblock-monorepo
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Setup Environment:**
    Copy `.env.exemple` to `apps/nextblock/.env.local` and fill in your Supabase/R2 credentials.

4.  **Run the Dev Server:**

    ```bash
    nx serve nextblock
    ```

5.  **Initial Admin User Setup:**
    - Sign up for a new user account through the application's sign-up page.
    - After signing up and verifying the email, you'll need to manually update this user's role to `ADMIN` in the Supabase `profiles` table.

6.  **Shadcn/UI Styling (Optional):**
    - This template comes with the default shadcn/ui style initialized. If you want to customize the theme or use a different base color, you can delete `components.json` and re-initialize shadcn/ui following their [official documentation](https://ui.shadcn.com/docs/installation/next).

## Project Structure Highlights

- `app/`: Next.js App Router.
  - `app/(auth-pages)/`: Routes for sign-in, sign-up, etc.
  - `app/cms/`: CMS admin panel routes and layouts.
    - `app/cms/[entity]/`: CRUD pages for different content types (pages, posts, media, users, navigation, languages).
    - `app/cms/blocks/`: Components and actions related to the block editor.
  - `app/[slug]/`: Dynamic route for public "Pages".
  - `app/article/[slug]/`: Dynamic route for public "Articles".
  - `app/api/`: API routes (e.g., for revalidation, R2 pre-signed URLs).
- `components/`: Shared UI components (shadcn/ui based).
  - `components/ui/`: shadcn/ui components.
- `context/`: React Context providers (e.g., `AuthContext`, `LanguageContext`).
- `lib/`: Utility functions and configurations.
  - `lib/cloudflare/`: Client for Cloudflare R2.
- `utils/supabase/`: Supabase client setup, types, and middleware helpers.
- `supabase/migrations/`: SQL database migrations.

## Documentation

For a deeper understanding of the CMS's internal workings, please refer to the detailed documentation:

- **[CMS Application Overview](./docs/cms-application-overview.md):** A high-level guide to the Next.js application structure, core modules, and key functionalities.
- **[Block Editor Architecture](./docs/cms-architecture-overview.md):** A technical deep-dive into the architecture of the block-based content editor.

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/).

1.  Push your code to a GitHub/GitLab/Bitbucket repository.
2.  Import the project into Vercel.
3.  **Configure Environment Variables in Vercel:**
    - Add all the environment variables from your `.env.local` file to your Vercel project settings (Project Settings -> Environment Variables). This includes Supabase keys, R2 keys, `NEXT_PUBLIC_SITE_URL` (set to your production domain), and `REVALIDATE_SECRET_TOKEN`.
4.  Vercel will automatically build and deploy your Next.js application.
5.  Ensure your Supabase Database Webhooks are pointing to your production Next.js API endpoint for revalidation.

## Database Backup

This project includes a simple script to backup your Supabase PostgreSQL database.

**Requirements:**

- You must have the PostgreSQL command-line tools (`pg_dump`) installed and available in your system's PATH.

**Usage:**
To create a backup, run the following command from your project root:

```bash
npm run db:backup
```

This command will generate a timestamped SQL dump file and save it to the `backup/` directory.

## Feedback and Issues

Please file feedback and issues on the GitHub repository for this project.
