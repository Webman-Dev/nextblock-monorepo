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

**Option B: Manual Setup**
Create an `.npmrc` file in the root of your project:

```ini
@nextblock-cms:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

---

## 🤖 For AI Developers: Architecture & Implementation

**Context for Future Development Phases**

### The Commercial Model: "Invite Only"

We use the **"Invite Model"** for distribution.

- **Trigger:** Stripe Webhook runs on successful payment.
- **Action:** Server calls GitHub API (`POST /orgs/:org/teams/:team_slug/memberships/:username`).
- **Access:** User is added to a read-only team that has access to the private `@nextblock-cms/*` repositories.
- **Revocation:** On subscription cancel/refund, the webhook removes the user from the GitHub team, immediately revoking access to future updates.

### The Release Strategy: "Twin Packages"

We handle distribution using a **Twin Package** strategy to prevent unauthorized public access while maintaining ease of use.

| Component        | Registry                    | Description                                                                                                                                     |
| :--------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ghost Module** | `npmjs.org` (Public)        | Contains only types and a runtime warning (`console.warn`). Anyone can install it, but it does nothing. Prevents "dependency not found" errors. |
| **Real Module**  | `GitHub Packages` (Private) | Contains the actual source code and compiled assets. Only visible to users with a valid PAT (invited customers).                                |

### Development Rules

1.  **Strict Registry Enforcement:** Release scripts (`release-lib.js`) MUST explicitly force `registry.npmjs.org` for the Ghost module and `npm.pkg.github.com` for the Real module to prevent cross-contamination.
2.  **Versioning:** Both the Ghost and Real modules must always be on the exact same version number (e.g., `0.0.9`) to ensure users get the correct code when their registry configuration switches.
3.  **Local Testing:** Use `tsconfig.base.json` path mappings to test local changes. Do not try to `npm install` the package inside the monorepo itself.
