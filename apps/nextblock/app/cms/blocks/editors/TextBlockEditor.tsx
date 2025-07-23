// app/cms/blocks/editors/TextBlockEditor.tsx
"use client";

import React from 'react'; // Ensure React is imported for JSX
import { Label } from "@nextblock-monorepo/ui";
import RoleAwareRichTextEditor from "../components/RoleAwareRichTextEditor"; // Import the role-aware Tiptap editor
import { BlockEditorProps } from '../components/BlockEditorModal';

export type TextBlockContent = {
    html_content?: string;
};
export default function TextBlockEditor({ content, onChange }: BlockEditorProps<Partial<TextBlockContent>>) {
  const handleContentChange = (htmlString: string) => {
    onChange({ html_content: htmlString });
  };

  return (
    <div className="h-full flex flex-col">
      <Label htmlFor={`text-block-editor-tiptap-${Math.random()}`} className="sr-only">Text Content</Label>
      <RoleAwareRichTextEditor
        initialContent={content.html_content || "<p></p>"} // Start with an empty paragraph if no content
        onChange={handleContentChange}
      />
    </div>
  );
}