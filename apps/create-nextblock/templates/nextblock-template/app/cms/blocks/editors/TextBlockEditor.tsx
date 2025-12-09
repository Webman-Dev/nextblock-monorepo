// app/cms/blocks/editors/TextBlockEditor.tsx
'use client';

import React, { useId, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MediaPickerDialog from '@/app/cms/media/components/MediaPickerDialog';
import { Label } from '@nextblock-cms/ui';
import { BlockEditorProps } from '../components/BlockEditorModal';

// Props expected by NotionEditor
type NotionEditorProps = {
  content: string;
  onChange: (html: string) => void;
  openImagePicker?: () => Promise<{ src: string; alt?: string; width?: number | null; height?: number | null; blurDataURL?: string | null } | null>;
  className?: string;
};

// Use the alias that resolves in your repo; if you mapped @nextblock-cms/editor, swap it here.
const NotionEditor = dynamic<NotionEditorProps>(
  () => import('@nextblock-cms/editor').then((m) => m.NotionEditor),
  { ssr: false }
);

export type TextBlockContent = {
  html_content?: string;
};

export default function TextBlockEditor({
  content,
  onChange,
  className,
}: BlockEditorProps<Partial<TextBlockContent>>) {
  const labelId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const resolverRef = useRef<null | ((v: any) => void)>(null);
  const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';
  const openImagePicker = useCallback(() => {
    setPickerOpen(true);
    return new Promise<{ src: string; alt?: string; width?: number | null; height?: number | null; blurDataURL?: string | null } | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Label htmlFor={labelId} className="sr-only">
        Text Content
      </Label>

      <div id={labelId} role="group" aria-labelledby={labelId} className="flex-1 min-h-0 flex flex-col">
        <NotionEditor
          content={content?.html_content ?? ''}
          onChange={(html) => onChange({ html_content: html })}
          openImagePicker={openImagePicker}
          className={className}
        />

        {/* Hidden controlled MediaPickerDialog for image selection */}
        <div className="sr-only" aria-hidden>
          <MediaPickerDialog
            hideTrigger
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title="Select or Upload Image"
            accept={(m) => !!m.file_type?.startsWith('image/')}
            onSelect={(media) => {
              const src = `${R2_BASE_URL}/${media.object_key}`;
              resolverRef.current?.({
                src,
                alt: media.description || media.file_name || undefined,
                width: media.width ?? null,
                height: media.height ?? null,
                blurDataURL: media.blur_data_url ?? null,
              });
              resolverRef.current = null;
              setPickerOpen(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

