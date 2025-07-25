# Inline Widget Design Specification: Call-to-Action (CTA)

This document outlines the technical design for implementing an inline "Call-to-Action" (CTA) widget within the Tiptap rich-text editor.

## 1. Tiptap Extension

A new Tiptap Node will be created to represent the CTA widget. It will be a block-level, self-closing node that renders as a button.

*   **Node Name:** `ctaWidget`
*   **Type:** Block Node
*   **Self-closing:** Yes

### Schema and Attributes

The node will have the following attributes:

*   `text`: (string, default: 'Click Here') - The text displayed on the button.
*   `url`: (string, default: '#') - The destination URL for the button.
*   `style`: (string, default: 'primary') - The visual style of the button. Can be `'primary'` or `'secondary'`.
*   `align`: (string, default: 'left') - The alignment of the CTA. Can be `'left'`, `'center'`, or `'right'`.
*   `size`: (string, default: 'fit-content') - The size of the CTA. Can be `'fit-content'` or `'full-width'`.
*   `textAlign`: (string, default: 'left') - The text alignment within the CTA. Can be `'left'`, `'center'`, or `'right'`.

### Tiptap Node Definition (`CtaWidgetNode.ts`)

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CtaWidgetComponent from './components/CtaWidgetComponent'; // To be created

export default Node.create({
  name: 'ctaWidget',
  group: 'block',
  atom: true, // self-closing

  addAttributes() {
    return {
      text: {
        default: 'Click Here',
        parseHTML: element => element.getAttribute('data-text'),
        renderHTML: attributes => ({ 'data-text': attributes.text }),
      },
      url: {
        default: '#',
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => ({ 'data-url': attributes.url }),
      },
      style: {
        default: 'primary',
        parseHTML: element => element.getAttribute('data-style'),
        renderHTML: attributes => ({ 'data-style': attributes.style }),
      },
      align: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
      size: {
        default: 'fit-content',
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => ({ 'data-size': attributes.size }),
      },
      textAlign: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-text-align'),
        renderHTML: attributes => ({ 'data-text-align': attributes.textAlign }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-cta-widget]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-cta-widget': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaWidgetComponent);
  },
});
```

## 2. Data Storage

The widget's data will be stored directly within the Tiptap JSON output, which is saved in the `JSONB` `content` field of the `blocks` table.

Example JSON:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Check out our new feature: " },
        {
          "type": "ctaWidget",
          "attrs": {
            "text": "Learn More",
            "url": "/features/new",
            "style": "primary",
            "align": "left",
            "size": "fit-content",
            "textAlign": "left"
          }
        }
      ]
    }
  ]
}
```

## 3. User Interface (UI/UX)

### Adding a Widget

A user will add a CTA widget via a new button in the `MenuBar`.

1.  User clicks the "Add CTA" button in the Tiptap editor's menu bar.
2.  This inserts a new CTA widget at the cursor position with default attributes.

### Editing a Widget

1.  Clicking on the rendered `CtaWidgetComponent` within the editor will reveal a popover.
2.  The popover will contain a form with:
    *   A text input for the `text`.
    *   A text input for the `url`.
    *   A dropdown/select to change the `style` ('primary', 'secondary').
    *   A dropdown/select to change the `align` ('left', 'center', 'right').
    *   A dropdown/select to change the `size` ('fit-content', 'full-width').
    *   A dropdown/select to change the `textAlign` ('left', 'center', 'right').
3.  Changes will update the node's attributes in real-time.

## 4. Front-end Rendering

A new renderer component will be created to display the CTA on the public-facing website.

*   **Component:** `CtaWidgetRenderer.tsx`
*   **Logic:** This component will receive the `text`, `url`, and `style` attributes as props and render a styled link/button.

The `TextBlockRenderer.tsx` will be updated to use this new renderer when it encounters a node of type `ctaWidget`.

## 5. File Structure

```
apps/nextblock/
├── app/
│   └── cms/
│       └── blocks/
│           └── components/
│               ├── tiptap-extensions/
│               │   ├── CtaWidgetNode.ts         # <-- New Tiptap Node
│               │   └── components/
│               │       └── CtaWidgetComponent.tsx # <-- New React Node View
│               └── MenuBar.tsx                  # <-- Update to add CTA button
└── components/
    └── blocks/
        └── renderers/
            ├── inline/
            │   └── CtaWidgetRenderer.tsx    # <-- New renderer for live site
            └── TextBlockRenderer.tsx          # <-- Update to use the new renderer