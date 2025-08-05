"use client";

import React from 'react';
import { NotionEditor } from '@nextblock-monorepo/editor';

interface RichTextEditorProps {
  initialContent: string | undefined | null;
  onChange: (htmlContent: string) => void;
  editable?: boolean;
}

export default function RichTextEditor({ initialContent, onChange, editable = true }: RichTextEditorProps) {
  return (
    <div className="h-full flex flex-col border rounded-md">
      <NotionEditor
        content={initialContent || ''}
        onChange={onChange}
      />
    </div>
  );
}
