// app/cms/blocks/editors/TextBlockEditor.tsx
'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Editor, Extensions } from '@tiptap/core';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { Button, Label } from '@nextblock-cms/ui';
import { BlockEditorProps } from '../components/BlockEditorModal';
import { resolveMediaUrl } from '../../../../lib/media/resolveMediaUrl';
import { useCortexAiActive } from '../../components/CortexAiActiveContext';
import { SeoAuditPanel } from '../../../../components/seo/SeoAuditPanel';
import { usePageSeo } from '../../../../lib/seo/page-audit-context';
import {
  createDynamicCustomBlockExtensions,
  type DynamicCustomBlockEditorDefinition,
} from '../../../../lib/editor/dynamic-extensions';

/**
 * A hand-maintained copy of the real `NotionEditorProps`.
 *
 * `next/dynamic` needs a concrete type argument at the call site, and the real
 * interface lives behind a lazy `import()` that TypeScript will not unwrap for
 * us here. That makes this a second, independent declaration of the same
 * contract: a prop added to `libs/editor/src/lib/NotionEditor.tsx` and not added
 * here is invisible to this file and fails to type-check the moment it is
 * passed. Both `onEditorReady` and `sidePanel` below exist for that reason.
 */
type NotionEditorProps = {
  content: string;
  onChange: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  openImagePicker?: () => Promise<{ src: string; alt?: string; width?: number | null; height?: number | null; blurDataURL?: string | null } | null>;
  className?: string;
  showAiPrompt?: boolean;
  sidePanel?: React.ReactNode;
  dynamicExtensions?: Extensions;
};

/**
 * Where the "is the SEO panel open?" choice is remembered.
 *
 * Per-browser rather than per-user or per-block: it is a workspace preference in
 * the same family as a collapsed sidebar, not content, and round-tripping it
 * through the database would mean a write on every toggle.
 */
const SEO_PANEL_STORAGE_KEY = 'nextblock_seo_audit_panel_open';

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

  /**
   * The live Tiptap instance, published by `NotionEditor` through
   * `onEditorReady`. This is what lets the SEO panel write a Cortex AI fix back
   * into the document; without it the panel still grades the content but shows
   * no fix buttons. Deliberately not `window.__nextblockEditor`, which is a
   * single global slot and therefore wrong as soon as a second editor mounts.
   */
  const [editor, setEditor] = useState<Editor | null>(null);

  /**
   * The focus keyphrase, preferring the page's copy when there is one.
   *
   * A keyphrase is a property of the page, not of a paragraph, so when this
   * editor is opened from a page or post edit screen it reads and writes the
   * shared `PageSeoProvider` value: type it once on the page panel and every
   * block editor opened afterwards is already grading against it, and typing it
   * in a block sends it back the other way. The local state below is the
   * fallback for surfaces with no page-level panel — the product editor — where
   * an ephemeral per-block keyphrase is still better than a dead field.
   */
  const pageSeo = usePageSeo();
  const [localSeoKeyword, setLocalSeoKeyword] = useState('');
  const seoKeyword = pageSeo ? pageSeo.keyword : localSeoKeyword;
  const handleSeoKeywordChange = useCallback(
    (next: string) => {
      if (pageSeo) {
        pageSeo.setKeyword(next);
      } else {
        setLocalSeoKeyword(next);
      }
    },
    [pageSeo]
  );

  // Starts closed for the very first render on the server and on a cold client,
  // then adopts the stored preference in the effect below. Reading storage in
  // the initialiser instead would make the server's HTML and the client's first
  // render disagree for anyone who had opened the panel before.
  const [isSeoPanelOpen, setIsSeoPanelOpen] = useState(false);

  const resolverRef = useRef<null | ((v: any) => void)>(null);

  /**
   * Adopt the remembered preference once, after mount.
   *
   * Every access is wrapped because `localStorage` is not merely empty in a
   * private window or with site data blocked — the property access itself
   * throws, and an uncaught throw here would take the whole block editor down
   * over a panel toggle. Defaulting to open on a first visit is deliberate: the
   * feature is invisible otherwise, and one click hides it for good afterwards.
   */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SEO_PANEL_STORAGE_KEY);
      setIsSeoPanelOpen(stored === null ? true : stored === 'true');
    } catch {
      setIsSeoPanelOpen(true);
    }
  }, []);

  const toggleSeoPanel = useCallback(() => {
    setIsSeoPanelOpen((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(SEO_PANEL_STORAGE_KEY, String(next));
      } catch {
        // The preference is a convenience; losing it is not worth an error.
      }
      return next;
    });
  }, []);

  /**
   * Wrapped rather than passing `setEditor` straight in. A state setter treats a
   * function argument as an updater callback, and while a Tiptap `Editor` is an
   * object today, routing it through an explicit assignment means this cannot
   * quietly break if that ever stops being true.
   */
  const handleEditorReady = useCallback((instance: Editor | null) => {
    setEditor(instance);
  }, []);
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

  // The one string the editor and the audit both read. Deriving it once keeps
  // the panel from ever grading something other than what is on screen.
  const htmlContent = content?.html_content ?? '';

  return (
    <div className="h-full flex flex-col">
      <Label htmlFor={labelId} className="sr-only">
        Text Content
      </Label>

      <div className="mb-2 flex items-center justify-end">
        <Button
          aria-pressed={isSeoPanelOpen}
          className="h-7 text-xs"
          disabled={!dynamicDefinitionsLoaded}
          onClick={toggleSeoPanel}
          size="sm"
          type="button"
          variant="outline"
        >
          {isSeoPanelOpen ? (
            <PanelRightClose className="mr-1.5 h-4 w-4" />
          ) : (
            <PanelRightOpen className="mr-1.5 h-4 w-4" />
          )}
          {isSeoPanelOpen ? 'Hide SEO analysis' : 'Show SEO analysis'}
        </Button>
      </div>

      <div id={labelId} role="group" aria-labelledby={labelId} className="flex-1 min-h-0 flex flex-col">
        {dynamicDefinitionsLoaded ? (
          <NotionEditor
            key={dynamicDefinitions.map((definition) => definition.id).join('|') || 'static'}
            content={htmlContent}
            dynamicExtensions={dynamicExtensions}
            onChange={(html) => onChange({ html_content: html })}
            onEditorReady={handleEditorReady}
            openImagePicker={openImagePicker}
            className={className}
            showAiPrompt={isCortexAiActive}
            /*
             * Passing `undefined` rather than a hidden panel is what keeps the
             * collapsed state honest: `NotionEditor` renders its original
             * single-column tree when `sidePanel` is absent, so hiding the panel
             * gives the prose the full width back instead of leaving an empty
             * column behind it.
             */
            sidePanel={
              isSeoPanelOpen ? (
                /*
                 * Block scope, and this is the fix for the complaint that
                 * started all of this: mounted here the panel can only see one
                 * block, so grading it as a page reported "no H1" and "fewer
                 * than 300 words" for a single paragraph — neither of which a
                 * block can be responsible for. The page-wide checks now live on
                 * the page editor's own panel; what stays here are the checks a
                 * block genuinely owns, plus the one thing this mount has and
                 * the page mount never will: a live editor instance, which is
                 * what makes "Fix with Cortex AI" able to write anything at all.
                 */
                <SeoAuditPanel
                  content={htmlContent}
                  editor={editor}
                  isCortexAiActive={isCortexAiActive}
                  keyword={seoKeyword}
                  onKeywordChange={handleSeoKeywordChange}
                  scope="block"
                />
              ) : undefined
            }
          />
        ) : (
          /*
           * The editor is `ssr: false` and gated behind the custom-block
           * definition fetch, so neither it nor the SEO panel exists on first
           * paint. Saying which pieces are still coming makes the gap read as a
           * load rather than as a panel that failed to appear.
           */
          <div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-1 rounded-lg border bg-background text-sm text-muted-foreground">
            <span>Loading editor...</span>
            <span className="text-xs">Custom blocks and the SEO analysis appear once it is ready.</span>
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

