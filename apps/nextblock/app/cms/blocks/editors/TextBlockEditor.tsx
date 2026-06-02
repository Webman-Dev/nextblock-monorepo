// app/cms/blocks/editors/TextBlockEditor.tsx
'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Extensions } from '@tiptap/core';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { Label } from '@nextblock-cms/ui';
import { BlockEditorProps } from '../components/BlockEditorModal';
import { resolveMediaUrl } from '../../../../lib/media/resolveMediaUrl';
import { useCortexAiActive } from '../../components/CortexAiActiveContext';
import {
  createDynamicCustomBlockExtensions,
  type DynamicCustomBlockEditorDefinition,
} from '../../../../lib/editor/dynamic-extensions';

// Props expected by NotionEditor
type NotionEditorProps = {
  content: string;
  onChange: (html: string) => void;
  openImagePicker?: () => Promise<{ src: string; alt?: string; width?: number | null; height?: number | null; blurDataURL?: string | null } | null>;
  className?: string;
  showAiPrompt?: boolean;
  dynamicExtensions?: Extensions;
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
  const [dynamicDefinitions, setDynamicDefinitions] = useState<DynamicCustomBlockEditorDefinition[]>([]);
  const [dynamicDefinitionsLoaded, setDynamicDefinitionsLoaded] = useState(false);
  const isCortexAiActive = useCortexAiActive();
  const resolverRef = useRef<null | ((v: any) => void)>(null);
  const openImagePicker = useCallback(() => {
    setPickerOpen(true);
    return new Promise<{ src: string; alt?: string; width?: number | null; height?: number | null; blurDataURL?: string | null } | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);
  const dynamicExtensions = useMemo(
    () => createDynamicCustomBlockExtensions(dynamicDefinitions),
    [dynamicDefinitions]
  );

  useEffect(() => {
    let isActive = true;

    async function loadDynamicDefinitions() {
      try {
        const response = await fetch('/api/custom-blocks/editor-definitions', {
          cache: 'no-store',
          method: 'GET',
        });
        const payload = (await response.json()) as {
          definitions?: DynamicCustomBlockEditorDefinition[];
          error?: string;
        };

        if (!isActive) {
          return;
        }

        if (!response.ok) {
          console.error(
            '[TextBlockEditor] Failed to load custom block editor definitions:',
            payload.error
          );
          setDynamicDefinitions([]);
          return;
        }

        setDynamicDefinitions(payload.definitions ?? []);
      } catch (error) {
        if (isActive) {
          console.error('[TextBlockEditor] Failed to load custom block editor definitions:', error);
          setDynamicDefinitions([]);
        }
      } finally {
        if (isActive) {
          setDynamicDefinitionsLoaded(true);
        }
      }
    }

    void loadDynamicDefinitions();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <Label htmlFor={labelId} className="sr-only">
        Text Content
      </Label>

      <div id={labelId} role="group" aria-labelledby={labelId} className="flex-1 min-h-0 flex flex-col">
        {dynamicDefinitionsLoaded ? (
          <NotionEditor
            key={dynamicDefinitions.map((definition) => definition.id).join('|') || 'static'}
            content={content?.html_content ?? ''}
            dynamicExtensions={dynamicExtensions}
            onChange={(html) => onChange({ html_content: html })}
            openImagePicker={openImagePicker}
            className={className}
            showAiPrompt={isCortexAiActive}
          />
        ) : (
          <div className="flex min-h-[500px] flex-1 items-center justify-center rounded-lg border bg-background text-sm text-muted-foreground">
            Loading editor...
          </div>
        )}

        {/* Hidden controlled MediaPickerDialog for image selection */}
        <div className="sr-only" aria-hidden>
          <MediaPickerDialog
            hideTrigger
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title="Select or Upload Image"
            accept={(m) => !!m.file_type?.startsWith('image/')}
            onSelect={(media) => {
              const src = resolveMediaUrl(media.file_path || media.object_key);
              if (!src) {
                resolverRef.current?.(null);
                resolverRef.current = null;
                setPickerOpen(false);
                return;
              }
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

