// app/cms/blocks/editors/TextBlockEditor.tsx
'use client';

import React, { useId } from 'react';
import dynamic from 'next/dynamic';
import { Label } from '@nextblock-monorepo/ui';
import { BlockEditorProps } from '../components/BlockEditorModal';

// Type the props the lazy component expects
type NotionEditorProps = {
  content: string;
  onChange: (html: string) => void;
};

// Import the actual named export from your editor package
const NotionEditor = dynamic<NotionEditorProps>(
  () => import('@nextblock/editor').then((m) => m.NotionEditor),
  { ssr: false }
);

export type TextBlockContent = {
  html_content?: string;
};

export default function TextBlockEditor({
  content,
  onChange,
}: BlockEditorProps<Partial<TextBlockContent>>) {
  const labelId = useId();

  const handleContentChange = (htmlString: string) => {
    onChange({ html_content: htmlString });
  };

  return (
    <div className="h-full flex flex-col">
      <Label htmlFor={labelId} className="sr-only">
        Text Content
      </Label>

      <div id={labelId} role="group" aria-labelledby={labelId}>
        <NotionEditor
          content={content?.html_content ?? ''}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
