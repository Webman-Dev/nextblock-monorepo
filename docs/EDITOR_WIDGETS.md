# Editor Widgets: CTA & Alert

This document outlines the technical specs for custom Tiptap nodes: **CTA Widget** and **Alert Widget**.

## 1. Local Storage Strategy

These widgets are **Inline Nodes** stored directly in the Tiptap JSON content. They do NOT require separate database tables.

---

## 2. Call-to-Action (CTA) Widget

A self-closing block node rendering a styled button.

### Attributes

| Attribute | Default      | Options                   |
| :-------- | :----------- | :------------------------ |
| `text`    | "Click Here" | Any string                |
| `url`     | "#"          | Any URL                   |
| `style`   | "primary"    | `primary`, `secondary`    |
| `align`   | "left"       | `left`, `center`, `right` |

### Implementation

- **Node:** `CtaWidgetNode.ts` (Parses `div[data-cta-widget]`)
- **Editor UI:** `CtaWidgetComponent.tsx` (React Node View with Popover form)
- **Renderer:** `CtaWidgetRenderer.tsx` (Renders `<a>` tag with Tailwind classes)

---

## 3. Alert / Callout Widget

A block node for highlighting information.

### Attributes

| Attribute | Default | Options                                |
| :-------- | :------ | :------------------------------------- |
| `type`    | "info"  | `info`, `warning`, `danger`, `success` |
| `title`   | "Info"  | Any string                             |
| `message` | ""      | Rich text or string                    |

### Implementation

- **Node:** `AlertWidgetNode.ts` (Parses `div[data-alert-widget]`)
- **Editor UI:** `AlertWidgetComponent.tsx` (React Node View)
- **Renderer:** `AlertWidgetRenderer.tsx` (Renders styled `div`)

---

## 4. Workflow

1.  **Insert:** User clicks "Add CTA" or "Add Alert" in the Toolbar/Slash Menu.
2.  **Edit:** Clicking the rendered node in the editor opens a Popover form.
3.  **Save:** Attributes are serialized to JSON/HTML.
4.  **Render:** Live site inflates the attributes into the final React component.
