---
name: component-development
description: When you are creating or modifying UI components. Use this skill to ensure consistency with the design system and shadcn/ui.
---

# Component Development

## 1. Core Principles

- **Library First:** Shared components live in `libs/ui`.
- **Strict Separation:** `libs/ui` CANNOT depend on `apps/nextblock`. It must remain publishable as a standalone package.
- **Tech Stack:** React, Tailwind CSS, Radix UI, Lucide React.

## 2. Directory Structure (`libs/ui`)

- `src/components/ui`: Base Shadcn/UI components (Button, Input, etc.).
- `src/components`: Custom complex components.
- `src/styles/globals.css`: Tailwind configuration and global styles.

## 3. Workflow

### Creating a new component

1.  **Shared Component:**
    - Create in `libs/ui/src/components/<Name>/<Name>.tsx`.
    - Export from `libs/ui/src/index.ts`.
    - Use `nx lint ui` to verify.
2.  **App-Specific Component:**
    - Create in `apps/nextblock/components/`.
    - Only do this if the component is **tightly coupled** to Next.js features (like cookies, headers, or specific app logic).

### Styling

- Use `className` with Tailwind utility classes.
- Use `cn()` utility from `@nextblock-cms/utils` for conditional class merging.
- **Do not** use CSS modules or styled-components unless absolutely necessary.

## 4. Best Practices

- **Client Components:** Add `'use client'` at the top if using hooks (`useState`, `useEffect`) or event listeners.
- **Accessibility:** Use Radix UI primitives where possible to ensure a11y compliance.
