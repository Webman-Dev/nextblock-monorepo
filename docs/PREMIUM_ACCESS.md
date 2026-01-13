# 💎 NextBlock Premium Access Guide

## For Customers: How to Access Your Purchase

Thank you for purchasing **NextBlock Premium**! Here is how to unlock your premium modules (like `@nextblock-cms/ecom`).

### 1. Purchase & Invite

- **Step 1:** Purchase the "Pro" or "Business" plan on our website.
- **Step 2:** during checkout, you will be asked for your **GitHub Username**.
- **Step 3:** Our system will automatically invite you to the `nextblock-customers` team on GitHub.
- **Step 4:** Accept the invitation in your email or on your GitHub Dashboard.

### 2. Generate Your Access Key (PAT)

To install the premium packages, you need a **Personal Access Token (PAT)**. This is your "license key".

1.  Go to **GitHub Settings** -> **Developer settings**.
2.  Select **Personal access tokens** -> **Tokens (classic)**.
3.  Click **Generate new token (classic)**.
4.  **Note:** Give it a name like "NextBlock License".
5.  **Scopes:** Check the box for `read:packages`.
6.  **Generate** and **Copy** the token. (You won't see it again!).

### 3. Configure Your Project

You have two ways to use your key:

**Option A: The Easy Way (CLI)**
When creating a new project, our wizard will ask for your PAT:

```bash
npx create-nextblock my-app
```

Paste your PAT when prompted.

**Option B: Manual Setup (For existing projects)**

1.  Create an `.npmrc` file in the root of your project:

    ```ini
    @nextblock-cms:registry=[https://npm.pkg.github.com](https://npm.pkg.github.com)
    //[npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT](https://npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT)
    ```

2.  **Install the Package:**
    Now that your project knows where to look, simply install the package. It will automatically pull the premium version from GitHub.

    ```bash
    npm install @nextblock-cms/ecom
    ```

    _Note: If you previously installed the free version, you may need to delete `node_modules` and `package-lock.json` first to ensure the new premium version is fetched._

---

## 🤖 For AI Developers: Architecture & Implementation

**Context for Future Development Phases**

### The Commercial Model: "Invite Only"

We use the **"Invite Model"** for distribution.

- **Trigger:** Stripe Webhook runs on successful payment.
- **Action:** Server calls GitHub API (`POST /orgs/:org/teams/:team_slug/memberships/:username`).
- **Access:** User is added to a read-only team (`nextblock-customers`) in the `nextblock-cms` organization.
- **Revocation:** On subscription cancel/refund, the webhook removes the user from the GitHub team.

### The Release Strategy: "Twin Packages" & "Bucket Repo"

We use a specific architecture to decouple **Source Code** (Personal Repo) from **Distribution** (Organization Repo). This allows us to use GitHub Organization Team permissions while keeping the source code on a Personal Vercel plan.

| Component        | Location / Registry                | Description                                                                                                                                      |
| :--------------- | :--------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source Code**  | `Webman-Dev/nextblock-premium`     | Where we write code. Connected to Vercel.                                                                                                        |
| **Ghost Module** | `npmjs.org` (Public)               | The stub. Prevents dependency errors for non-pro users.                                                                                          |
| **Real Module**  | `nextblock-cms/packages` (Private) | **The Bucket.** We publish the compiled code here. This repo is empty; it exists ONLY to host the packages and manage Customer Team permissions. |

### Development Rules (CRITICAL)

1.  **Strict Registry Enforcement:** Release scripts (`release-lib.js`) MUST explicitly force `registry.npmjs.org` for the Ghost module and `npm.pkg.github.com` for the Real module.
2.  **The "Teleport" Configuration:** In the `package.json` of any premium library (like `libs/ecommerce`), the `repository` field **MUST** point to the Organization Bucket, not the source repo. This ensures the package is attached to the Organization where customers have access.
    ```json
    "repository": {
      "type": "git",
      "url": "git+[https://github.com/nextblock-cms/packages.git](https://github.com/nextblock-cms/packages.git)"
    }
    ```
3.  **Versioning:** Both the Ghost and Real modules must always be on the exact same version number (e.g., `0.0.9`) to ensure users get the correct code when their registry configuration switches.
4.  **Local Testing:** Use `tsconfig.base.json` path mappings to test local changes. Do not try to `npm install` the package inside the monorepo itself.
