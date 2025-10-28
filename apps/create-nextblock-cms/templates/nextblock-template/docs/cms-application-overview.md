# CMS Application: Overview

This document provides a high-level overview of the main Next.js application for the CMS, detailing its structure, core modules, and key functionalities. It serves as a guide for understanding how the different parts of the CMS are organized and interact.

## 1. CMS Root Layout (`app/cms/layout.tsx`)

The file [`app/cms/layout.tsx`](app/cms/layout.tsx) is the foundational component for the entire CMS interface, wrapping all pages under the `/cms` path.

### Key Responsibilities:

*   **Authentication and Access Control**: The layout uses the `useAuth` hook from `AuthContext` to get the current user's status and role (`isAdmin`, `isWriter`). It contains a `useEffect` hook that protects the CMS routes by redirecting unauthenticated users to the sign-in page and users with insufficient permissions to an "unauthorized" page.

*   **UI Structure**: It renders the primary user interface shell, which consists of:
    *   A **responsive sidebar** for navigation, which is permanently visible on desktop screens and can be toggled on mobile.
    *   A **main content area** that displays the specific page component for the current route.
    *   A **dynamic header** within the main content area that displays the title of the current page.

*   **Dynamic Page Title**: The header's title is not static. It's dynamically determined by inspecting the current URL's `pathname` using the `usePathname` hook. A series of `if/else if` statements map URL patterns (e.g., `/cms/pages`, `/cms/pages/new`) to user-friendly titles (e.g., "Pages", "New Page").

*   **User Profile & Logout**: The sidebar includes a section at the bottom displaying the logged-in user's avatar, name, and role, along with a button to sign out.

## 2. Core CMS Modules

The CMS is organized into several modules, each corresponding to a specific content type or area of management. These modules are located in subdirectories within `app/cms/`. They follow a consistent file structure pattern.

### Common File Structure:

*   `page.tsx`: The main entry point for the module, typically displaying a list or grid of the items (e.g., a table of pages, a grid of media).
*   `[id]/edit/page.tsx`: The page for editing a single, existing item, identified by its ID in the URL.
*   `new/page.tsx`: The page for creating a new item.
*   `actions.ts`: A file containing all the server actions for the module (e.g., `createPage`, `updatePage`, `deletePage`).
*   `components/`: A directory for React components that are specific to this module, such as forms or client-side components that invoke server actions (e.g., `DeletePageButtonClient.tsx`).

### Module Breakdown:

*   **Dashboard (`app/cms/dashboard/`)**: The main landing page after logging into the CMS.
    *   `page.tsx`: Displays welcome information and summary statistics.

*   **Pages (`app/cms/pages/`)**: Manages the static pages of the public-facing website.
    *   Key files: `page.tsx`, `[id]/edit/page.tsx`, `new/page.tsx`, `actions.ts`, `components/PageForm.tsx`, `components/DeletePageButtonClient.tsx`.

*   **Posts (`app/cms/posts/`)**: Manages blog posts or articles.
    *   Key files: `page.tsx`, `[id]/edit/page.tsx`, `new/page.tsx`, `actions.ts`, `components/PostForm.tsx`, `components/DeletePostButtonClient.tsx`.

*   **Media (`app/cms/media/`)**: Manages the website's media library (images, documents, etc.).
    *   Key files: `page.tsx`, `[id]/edit/page.tsx`, `actions.ts`, `components/MediaUploadForm.tsx`, `components/MediaGridClient.tsx`, `components/MediaEditForm.tsx`.

*   **Navigation (`app/cms/navigation/`)**: Manages the site's navigation menus.
    *   Key files: `page.tsx`, `[id]/edit/page.tsx`, `new/page.tsx`, `actions.ts`, `components/NavigationMenuDnd.tsx`, `components/NavigationItemForm.tsx`.

*   **Users (`app/cms/users/`)**: (Admin only) Manages user accounts and roles.
    *   Key files: `page.tsx`, `[id]/edit/page.tsx`, `actions.ts`, `components/UserForm.tsx`, `components/DeleteUserButton.tsx`.

*   **Settings (`app/cms/settings/`)**: Manages site-wide settings. This module contains sub-modules for different settings areas.
    *   **Languages (`app/cms/settings/languages/`)**: (Admin only) Manages available content languages.
        *   Key files: `page.tsx`, `[id]/edit/page.tsx`, `new/page.tsx`, `actions.ts`, `components/LanguageForm.tsx`.