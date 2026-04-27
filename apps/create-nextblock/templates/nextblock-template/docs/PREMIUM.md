# 💎 NextBlock™ Premium Access Guide

## Overview

NextBlock™ uses a **Self-Hosted License Key** system. The core CMS is open-source, but specific premium features (like E-Commerce) are gated behind a license check.

This guide explains how to purchase, install, and activate these premium "Packages".

---

## 1. Buying a Package

We use **Freemius** as our Merchant of Record.

1.  Visit the [NextBlock™ Pricing Page](https://nextblock.ca/pricing).
2.  Choose the package you want (e.g., **E-Commerce Pro**).
3.  Complete the checkout.
4.  You will receive a **License Key** via email (e.g., `5D4F-2X3C-...`).

---

## 2. Activating Your License

Once you have your key, you need to bind it to your CMS instance.

1.  Log into your **NextBlock™ CMS Admin Dashboard**.
2.  Navigate to **Settings** -> **Packages** (`/cms/settings/packages`).
3.  Find the package you purchased in the list (e.g., "E-Commerce Pro").
4.  Enter your **License Key** in the input field.
5.  Click **Activate**.

### What Happens Next?

- 🟢 **Status turns Green:** The system validates your key with our servers.
- 🔓 **Features Unlock:** Premium menus (like "Orders", "Products") will instantly appear in the sidebar.
- 💾 **Database Update:** The activation is stored locally in your `package_activations` table.

> [!NOTE]
> Your license key is bound to your **domain** (e.g., `my-shop.com`). Localhost (`localhost:3000`) is always allowed for development.

---

## 3. For Developers: How It Works

### The "Open Core" Model

Unlike our previous model (private GitHub repos), the code for premium packages is **source-available** within the monorepo but **functionally locked** by default.

- **Source Code:** You can see the code in `libs/ecommerce` (or similar).
- **The Gatekeeper:** Critical functions check `verifyPackageOnline('ecommerce')` before executing.
- **UI Hiding:** The sidebar and buttons rely on the `isPackageActive` helper to show/hide themselves.

For a deep dive into the technical architecture, read the [Licensing Architecture](./LICENSING.md) document.
