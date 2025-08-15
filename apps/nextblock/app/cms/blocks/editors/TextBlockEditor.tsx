// app/cms/blocks/editors/TextBlockEditor.tsx
'use client';

import React, { useId } from 'react';
import dynamic from 'next/dynamic';
import { Label } from '@nextblock-monorepo/ui';
import { BlockEditorProps } from '../components/BlockEditorModal';

// Props expected by NotionEditor
type NotionEditorProps = {
  content: string;
  onChange: (html: string) => void;
};

// Use the alias that resolves in your repo; if you mapped @nextblock-monorepo/editor, swap it here.
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

  return (
    <div className="h-full flex flex-col">
      <Label htmlFor={labelId} className="sr-only">
        Text Content
      </Label>

      <div id={labelId} role="group" aria-labelledby={labelId}>
        <NotionEditor
          content={content?.html_content ?? ''}
          onChange={(html) => onChange({ html_content: html })}
        />
      </div>
    </div>
  );
}
