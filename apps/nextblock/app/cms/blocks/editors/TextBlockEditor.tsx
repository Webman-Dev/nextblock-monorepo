// app/cms/blocks/editors/TextBlockEditor.tsx
"use client";

import React from 'react'; // Ensure React is imported for JSX
import { Label } from "@nextblock-monorepo/ui";
import { BlockEditorProps } from '../components/BlockEditorModal';
import dynamic from 'next/dynamic';

const NotionEditor = dynamic(() => import('@nextblock-monorepo/editor').then(mod => mod.NotionEditor), { ssr: false });

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
      <NotionEditor
        content={content.html_content || ''}
        onChange={handleContentChange}
      />
    </div>
  );
}