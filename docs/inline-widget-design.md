# Inline Widget Design Specification: Alert/Callout

This document outlines the technical design for implementing an inline "Alert" widget within the Tiptap rich-text editor.

## 1. Tiptap Extension

A new Tiptap Node will be created to represent the alert widget. It will be a block-level, self-closing node.

*   **Node Name:** `alertWidget`
*   **Type:** Block Node
*   **Self-closing:** Yes

### Schema and Attributes

The node will have the following attributes:

*   `type`: (string, default: 'info') - The type of alert. Can be `'info'`, `'warning'`, `'notification'`, or `'danger'`.
*   `title`: (string, default: 'Info') - The title of the alert.
*   `message`: (string, default: '') - The text content of the alert.
*   `align`: (string, default: 'left') - The alignment of the alert. Can be `'left'`, `'center'`, or `'right'`.
*   `size`: (string, default: 'fit-content') - The size of the alert. Can be `'fit-content'` or `'full-width'`.
*   `textAlign`: (string, default: 'left') - The text alignment within the alert. Can be `'left'`, `'center'`, or `'right'`.

### Tiptap Node Definition (`AlertWidgetNode.ts`)

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AlertWidgetComponent from './components/AlertWidgetComponent'; // To be created

export default Node.create({
  name: 'alertWidget',
  group: 'block',
  atom: true, // self-closing

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({ 'data-type': attributes.type }),
      },
      title: {
        default: 'Info',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
      },
      message: {
        default: '',
        parseHTML: element => element.getAttribute('data-message'),
        renderHTML: attributes => ({ 'data-message': attributes.message }),
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
    return [{ tag: 'div[data-alert-widget]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-alert-widget': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AlertWidgetComponent);
  },
});
```

### Editor Rendering (Node View)

A React Node View will be used to provide a rich editing experience.

*   **Component:** `AlertWidgetComponent.tsx`
*   **Functionality:**
    *   It will display the alert message and style it based on the `type` attribute.
    *   Clicking the component will open a small popover/modal to edit the `type` and `message`.

## 2. Data Storage

The widget's data will be stored directly within the Tiptap JSON output, which is saved in the `JSONB` `content` field of the `blocks` table. No database schema changes are needed.

When a user adds an alert widget, the Tiptap JSON will look like this:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Here is some text, and then an alert: " },
        {
          "type": "alertWidget",
          "attrs": {
            "type": "warning",
            "title": "Warning",
            "message": "This is an important warning!",
            "align": "left",
            "size": "fit-content",
            "textAlign": "left"
          }
        },
        { "type": "text", "text": " and the text continues." }
      ]
    }
  ]
}
```

## 3. User Interface (UI/UX)

### Adding a Widget

A user will add an alert widget via a floating bubble menu that appears on text selection.

1.  User selects some text in the Tiptap editor.
2.  A bubble menu appears with standard formatting options (Bold, Italic) and a new "Add Alert" button.
3.  Clicking "Add Alert" will either:
    *   Convert the selected text into the `message` of a new alert widget, replacing the selection.
    *   If no text is selected, insert a new alert widget at the cursor position with a default message.

### Editing a Widget

1.  Clicking on the rendered `AlertWidgetComponent` within the editor will reveal a small popover.
2.  The popover will contain a form with:
    *   A text input to edit the `title`.
    *   A dropdown/select field to change the `type` ('info', 'warning', 'notification', 'danger').
    *   A text input to edit the `message`.
    *   A dropdown/select to change the `align` ('left', 'center', 'right').
    *   A dropdown/select to change the `size` ('fit-content', 'full-width').
    *   A dropdown/select to change the `textAlign` ('left', 'center', 'right').
3.  Changes in the form will update the node's attributes in real-time via the `updateAttributes` function provided by the Node View.

## 4. Front-end Rendering

A new renderer component will be created to handle the display of the `alertWidget` on the public-facing website.

*   **Component:** `AlertWidgetRenderer.tsx`
*   **Logic:** This component will receive the `type` and `message` attributes as props and render the appropriate styled alert box.

The main `TextBlockRenderer.tsx` will need to be updated to correctly process Tiptap's JSON output and use the new `AlertWidgetRenderer` when it encounters a node of type `alertWidget`. This will likely involve using a library like `html-react-parser` with a replacement rule for our custom node type.

## 5. File Structure

The new files will be placed in the following locations to maintain consistency with the existing project structure:

```
apps/nextblock/
├── app/
│   └── cms/
│       └── blocks/
│           └── components/
│               ├── tiptap-extensions/
│               │   ├── AlertWidgetNode.ts       # <-- Tiptap Node definition
│               │   └── components/
│               │       └── AlertWidgetComponent.tsx # <-- React Node View for the editor
│               └── RichTextEditor.tsx           # <-- Update to include the new extension and bubble menu
└── components/
    └── blocks/
        └── renderers/
            ├── inline/
            │   └── AlertWidgetRenderer.tsx  # <-- New renderer for the live site
            └── TextBlockRenderer.tsx        # <-- Update to use the new renderer
```

## 6. Workflow Diagram

```mermaid
graph TD
    subgraph Editor Experience
        A[User selects text] --> B{Bubble Menu};
        B -- Clicks 'Add Alert' --> C[Insert 'alertWidget' Node];
        C --> D[Render AlertWidgetComponent];
        D -- User clicks widget --> E{Editing Popover};
        E -- User edits --> F[Update Node Attributes];
    end

    subgraph Data Flow
        F --> G[Tiptap JSON is updated];
        G --> H[Save to DB `content` field];
    end

    subgraph Frontend Rendering
        I[Live Page fetches content] --> J[TextBlockRenderer processes JSON];
        J -- Encounters 'alertWidget' --> K[Use AlertWidgetRenderer];
        K --> L[Display styled alert];
    end