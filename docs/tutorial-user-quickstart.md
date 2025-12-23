# 🚀 NextBlock CMS: User Quickstart Guide

**Welcome to NextBlock!** This guide will take you from zero to a fully deployed, high-performance website in about 15 minutes.

You will learn how to:

1.  Set up your cloud infrastructure (Supabase & Cloudflare).
2.  Use the `npm create nextblock` command.
3.  Deploy your site to production.

---

## ✅ Prerequisites

Before you start, ensure you have the following free accounts:

1.  **[Supabase Account](https://supabase.com)** (Database & Auth)
2.  **[Cloudflare Account](https://dash.cloudflare.com/sign-up)** (Image Storage)
3.  **[Vercel Account](https://vercel.com)** (Hosting)
4.  **Node.js 18+** installed on your computer.

---

## Step 1: Prepare Your Cloud Services

The CLI will ask you for specific keys during setup. Let's get them ready first so you don't get stuck.

### 1.1 Supabase (Database)

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Click **"New Project"**.
3.  **Name**: `my-nextblock-site` (or whatever you like).
4.  **Password**: Generata a strong password and **Save it**! You will need this later.
5.  **Region**: Choose the one closest to your users.
6.  Wait for the project to provision (takes ~1-2 mins).

### 1.2 Cloudflare R2 (Image Storage)

NextBlock uses Cloudflare R2 because it's cheaper and faster than AWS S3.

1.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  On the sidebar, go to **R2**.
3.  (First time only) You may need to enter payment info to enable R2, but the free tier is huge (10GB/month free).
4.  Click **"Create Bucket"**.
5.  **Name**: `nextblock-media` (must be unique globally, so try `nextblock-media-YOURNAME`).
6.  **Location**: Automatic.
7.  Click **"Create Bucket"**.
8.  **IMPORTANT:** Once created, go to the **Settings** tab of your new bucket.
    - Find **Public Access**.
    - Click **"Connect Domain"** or **"Allow Access"** to get a `Public R2.dev URL` (e.g., `https://pub-xxxx.r2.dev`). **Copy this URL.**

### 1.3 Get Your API Keys

Keep these tabs open. You will need to copy-paste these values into the terminal:

| Key Name in CLI           | Where to find it                                                                           |
| :------------------------ | :----------------------------------------------------------------------------------------- |
| **Supabase Project Ref**  | Dashboard > Settings > General > **Reference ID**                                          |
| **Connection String**     | Dashboard > Connect (Top Right) > Transaction Pooler > **URI Mode**                        |
| **Anon Key**              | Dashboard > Settings > API > **Project API Keys**                                          |
| **Service Role Key**      | Dashboard > Settings > API > **Project API Keys**                                          |
| **Supabase Access Token** | Profile (Top Right) > Access Tokens > **Generate New Token** (Name it "NextBlock CLI")     |
| **R2 Account ID**         | R2 Dashboard > **Account ID** (Right Sidebar)                                              |
| **R2 Access/Secret Key**  | R2 Dashboard > Manage R2 API Tokens > **Create Token** > **Admin Read/Write** permissions. |

---

## Step 2: Run the Installer

Open your terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
npm create nextblock my-website
```

The wizard will guide you through the process. Here is what to expect:

1.  **Project Creation**: It will clone the template.
2.  **Supabase Setup**:
    - It will ask you to login to Supabase via the browser.
    - It will ask for the keys you gathered in Step 1.
    - It will automatically push the database structure (tables) for you.
3.  **Cloudflare R2 Setup (Optional)**:
    - Select "Yes" to configure media storage.
    - Enter your `Bucket Name`, `Account ID`, `Access Key`, `Secret Key`, and `Public R2 URL`.
4.  **SMTP Setup (Optional)**:
    - If you have an SMTP provider (like SMTP2GO or Resend), enter those details now. If not, you can skip and add them to `.env` later.

Once finished, enter your new folder:

```bash
cd my-website
npm run dev
```

OPEN `http://localhost:3000`. 🎉 You have a running CMS!

---

## Step 3: Deployment (Vercel)

Now let's put it on the internet.

1.  **Push to GitHub**:

    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    # Create a new repo on GitHub and follow the instructions to push
    git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
    git push -u origin main
    ```

2.  **Deploy to Vercel**:
    - Go to [Vercel Dashboard](https://vercel.com/dashboard) > **Add New...** > **Project**.
    - Import your GitHub repository.
    - **Environment Variables**:
      - Copy the **ENTIRE content** of your local `.env` file.
      - Paste it into the Vercel Environment Variables configuration.
      - **Verify**: Ensure `SUPABASE_ACCESS_TOKEN` is included (required for auto-configuration).
      - **Update**: Change `NEXT_PUBLIC_URL` to your actual Vercel domain (e.g., `https://my-website.vercel.app`).
    - **Build Command**:
      - Expand "Build & Development Settings".
      - Override **Build Command** to: `npm run build && npm run deploy:supabase`
    - Click **Deploy**.

    > **Why the custom build command?**
    > It syncs your Supabase "Site URL" to your production domain. **This is critical for Auth Verification Emails** (Sign Up / Forgot Password) to redirect users back to your live site instead of `localhost`. This step is not needed for local development.

## Troubleshooting

- **Database Password**: If the CLI fails to push migrations, verify your database password in the connection string.
- **Images not loading**: Check your R2 Public URL in the `.env` file. It must start with `https://`.
- **"Relation not found"**: This means the migrations didn't run. Run `npm supabase db push` locally to fix it.

---

Need more help? Join our [Discord Community](https://discord.gg/nextblock) or open an issue on GitHub.
