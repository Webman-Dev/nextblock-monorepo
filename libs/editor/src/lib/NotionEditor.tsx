// libs/editor/src/lib/NotionEditor.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import type { Editor, Extensions } from '@tiptap/core';
import { Loader2, Sparkles } from 'lucide-react';
import { editorExtensions } from './kit';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';
import { EditorFloatingMenu } from './components/menus/FloatingMenu';
import { ImageToolbar } from './components/menus/ImageToolbar';
import { TableToolbar } from './components/menus/TableToolbar';
import { EditorToolbar } from './components/menus/Toolbar';
import { cn } from '@nextblock-cms/utils';
import '../styles/drag-handle.css';
import '../styles/editor.css';
import type { OpenImagePicker } from './utils/mediaPicker';
import { setOpenImagePicker } from './utils/mediaPicker';

export interface NotionEditorProps {
  content?: string | JSONContent;
  initialContent?: string | JSONContent;
  onChange?: (content: string) => void;
  /**
   * Hands the live Tiptap instance to the host application.
   *
   * The editor is otherwise completely sealed: `useEditor` owns the instance,
   * nothing forwards a ref, and there is no context provider, so a sibling of
   * this component has historically had exactly one way to reach the editor —
   * the `window.__nextblockEditor` global assigned further down this file. That
   * global is a genuine race as soon as two editors are mounted at once (a
   * block editor modal opened over a page that already renders one), because
   * the last mount silently wins and the loser's unmount can delete the
   * winner's entry. Anything that needs *this* editor rather than *an* editor
   * should take it from here instead; the global stays in place because other
   * code still reads it.
   *
   * Called with the instance once `useEditor` has produced one, and with `null`
   * on unmount so the host can drop its reference rather than hold a detached
   * ProseMirror view alive. The callback is read through a ref internally, so
   * an inline arrow function is safe to pass: a new identity on every parent
   * render will not re-fire the effect and produce a null/instance flapping
   * sequence.
   */
  onEditorReady?: (editor: Editor | null) => void;
  onUpdate?: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
  showToolbar?: boolean;
  showAiPrompt?: boolean;
  showCharacterCount?: boolean;
  /**
   * Optional companion UI rendered beside the writing surface — the CMS uses it
   * for the live SEO audit, which has to sit next to the prose it is grading
   * rather than in a dialog the author has to leave the document to open.
   *
   * This library cannot import anything application-specific (it declares no
   * dependencies, ships as a client bundle, and must not reach into
   * `apps/nextblock`), so the panel is injected as a node rather than
   * configured through a flag — the same idiom as `openImagePicker`.
   *
   * When omitted the component renders exactly the tree it always has: no extra
   * wrapper element, no changed class list on the root, and therefore no layout
   * shift for the callers that never pass it. The two-column layout only comes
   * into existence when there is something to put in the second column.
   */
  sidePanel?: React.ReactNode;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  openImagePicker?: OpenImagePicker;
  extensions?: Extensions;
  dynamicExtensions?: Extensions;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({
  content,
  initialContent,
  onChange,
  onEditorReady,
  onUpdate,
  placeholder,
  editable = true,
  showToolbar = true,
  showAiPrompt = true,
  showCharacterCount = true,
  sidePanel,
  className,
  onFocus,
  onBlur,
  openImagePicker,
  extensions,
  dynamicExtensions,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGeneratingAiContent, setIsGeneratingAiContent] = useState(false);

  const getParsedContent = (val: string | JSONContent | undefined) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed) as JSONContent;
        } catch {
          // ignore, fallback to string
        }
      }
    }
    return val;
  };

  const initialParsedContent = getParsedContent(content || initialContent);
  const configuredExtensions = useMemo(
    () =>
      extensions ??
      (dynamicExtensions && dynamicExtensions.length > 0
        ? [...editorExtensions, ...dynamicExtensions]
        : editorExtensions),
    [dynamicExtensions, extensions]
  );

  const editor = useEditor({
    extensions: configuredExtensions,
    content: initialParsedContent,
    editable,
    immediatelyRender: false, // Next.js hydration safety
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl',
          'mx-auto focus:outline-none min-h-[500px] w-full',
          // Space for drag handle gutter
          'pl-14 pr-4 py-4',
          'prose-headings:scroll-mt-[80px] prose-headings:font-semibold',
          'prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
          'prose-p:leading-7 prose-li:leading-7',
          'prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4',
          'prose-table:border-collapse prose-table:border prose-table:border-border',
          'prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2',
          'prose-td:border prose-td:border-border prose-td:p-2',
          'prose-img:rounded-lg prose-img:shadow-sm'
        ),
      },
    },
  });

  // Register event listeners
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
       onChange?.(editor.getHTML());
       onUpdate?.(editor.getJSON());
    };
    const focusHandler = () => {
       onFocus?.();
    };
    const blurHandler = () => {
       onBlur?.();
    };

    editor.on('update', updateHandler);
    editor.on('focus', focusHandler);
    editor.on('blur', blurHandler);

    return () => {
      editor.off('update', updateHandler);
      editor.off('focus', focusHandler);
      editor.off('blur', blurHandler);
    };
  }, [editor, onChange, onFocus, onBlur, onUpdate]);

  // Bridge the openImagePicker into editor.storage so menus/extensions can access it
  useEffect(() => {
    if (!editor) return;
    setOpenImagePicker(editor, openImagePicker);
    return () => setOpenImagePicker(editor, undefined);
  }, [editor, openImagePicker]);

  // Sync editable state
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Ref to track the content we've ostensibly "seen" or "generated"
  // This prevents the "echo" effect where the parent passes back what we just sent
  const lastContentRef = useRef(content);

  // Keep ref in sync with editor state
  useEffect(() => {
    if (!editor) return;
    const updateHandler = () => {
      lastContentRef.current = editor.getHTML();
    };
    editor.on('update', updateHandler);
    return () => {
      editor.off('update', updateHandler);
    };
  }, [editor]);


  // Sync content prop changes
  useEffect(() => {
    if (!editor || content === undefined) return;

    // 1. If content matches what we last knew about (either we typed it, or we just synced it),
    // then ignore. This filters out the "parent echo" updates.
    if (content === lastContentRef.current) return;

    const currentHTML = editor.getHTML();
    const parsed = getParsedContent(content);
    if (parsed === undefined) return;
 
    if (typeof parsed === 'string') {
       if (parsed === currentHTML) return;
       if (editor.isEmpty && (parsed === '' || parsed === '<p></p>')) {
          lastContentRef.current = content;
          return;
       }
       const { from, to } = editor.state.selection;
       editor.commands.setContent(parsed, { emitUpdate: false });
       editor.commands.setTextSelection({ from, to });
       lastContentRef.current = content;
    } else {
       // JSON content comparison is strictly reference based or we assume if it changed it's new
       // For a proper implementation we might need deep comparison, but for now assuming new reference = new content
       // This might cause loop if parent creates new object every render.
       // Ideally parent should memoize.
       // We can skip check if we assume JSON usage is mostly uncontrolled or careful.
       // But let's basic check.
       // Simplify: just set content.
       const { from, to } = editor.state.selection;
       editor.commands.setContent(parsed, { emitUpdate: false });
       editor.commands.setTextSelection({ from, to });
       lastContentRef.current = content;
    }

  }, [content, editor]);

  // Publish the instance to the host through `onEditorReady`.
  //
  // The callback is stashed in a ref and the effect depends on `editor` alone so
  // that a caller passing an inline arrow function — the overwhelmingly common
  // case — does not re-run this on every parent render. If the effect depended
  // on the callback identity, each render would first tear down (calling back
  // with `null`) and then re-publish, which any consumer holding the editor in
  // state would see as the editor briefly disappearing.
  const onEditorReadyRef = useRef(onEditorReady);
  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);

  useEffect(() => {
    if (!editor) return;

    onEditorReadyRef.current?.(editor);

    return () => {
      onEditorReadyRef.current?.(null);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;

    (window as any).__nextblockEditor = editor;

    return () => {
      if ((window as any).__nextblockEditor === editor) {
        delete (window as any).__nextblockEditor;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;

    const ensureHandleAttachment = () => {
      const handle = (window as any).__dragHandleElement as HTMLElement | null;
      if (!handle) return;

      const wrapper = handle.parentElement;
      const parent = editor.view.dom.parentElement ?? editor.view.dom;

      if (wrapper && parent && !wrapper.isConnected) {
        parent.appendChild(wrapper);
      }
    };

    const handler = () => ensureHandleAttachment();

    ensureHandleAttachment();
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    editor.on('focus', handler);

    const intervalId = window.setInterval(ensureHandleAttachment, 2000);

    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
      editor.off('focus', handler);
      window.clearInterval(intervalId);
    };
  }, [editor]);

  // Ensure dragging state class is cleaned up when the editor unmounts
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dragging');
      }
    };
  }, []);

  if (!editor) return null;

  const characterCount = editor.storage?.characterCount;
  const characters = characterCount?.characters?.() ?? 0;
  const words = characterCount?.words?.() ?? 0;

  const scrollEditorToBottom = () => {
    window.requestAnimationFrame(() => {
      const scrollContainer = wrapperRef.current?.querySelector(
        '[data-editor-scroll-area="true"]'
      ) as HTMLElement | null;

      scrollContainer?.scrollTo({
        behavior: 'smooth',
        top: scrollContainer.scrollHeight,
      });
    });
  };

  const buildAiEditorContext = (params: {
    insertionMode: 'append-to-end' | 'replace-empty-document' | 'replace-selection';
    selectedText: string;
  }) => {
    if (params.insertionMode === 'replace-empty-document') {
      return 'Insertion target: empty editor. Create the initial content for this document.';
    }

    const currentText = editor.getText().trim();
    const contextParts = [
      `Insertion target: ${params.insertionMode}.`,
      params.insertionMode === 'append-to-end'
        ? 'Continue after the existing content. Do not repeat existing headings, paragraphs, or lists unless the user explicitly asks for a rewrite.'
        : 'Replace only the selected content. Keep surrounding editor content in mind for continuity.',
      params.selectedText
        ? `Selected text:\n${params.selectedText.slice(0, 600)}`
        : null,
      currentText
        ? `Existing editor text:\n${currentText.slice(-1400)}`
        : null,
    ];

    return contextParts.filter(Boolean).join('\n\n').slice(0, 2000);
  };

  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();

    if (!prompt || isGeneratingAiContent) {
      return;
    }

    setAiError(null);
    setIsGeneratingAiContent(true);

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), 150_000);
    const wasEditorEmpty = editor.isEmpty;
    const selectionBeforeGeneration = editor.state.selection;
    const hasSelection = !selectionBeforeGeneration.empty;
    const selectedText = hasSelection
      ? editor.state.doc.textBetween(
          selectionBeforeGeneration.from,
          selectionBeforeGeneration.to,
          ' '
        ).trim()
      : '';
    const insertionMode = wasEditorEmpty
      ? 'replace-empty-document'
      : hasSelection
        ? 'replace-selection'
        : 'append-to-end';

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };

      if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
        const sandboxKey = window.localStorage.getItem('cortex_ai_sandbox_openrouter_api_key');
        const sandboxModel = window.localStorage.getItem('cortex_ai_sandbox_openrouter_model_selection');
        if (sandboxKey) {
          headers['x-sandbox-openrouter-key'] = sandboxKey;
        }
        if (sandboxModel) {
          headers['x-sandbox-openrouter-model'] = sandboxModel;
        }
      }

      const context = buildAiEditorContext({
        insertionMode,
        selectedText,
      });
      const response = await fetch('/api/ai/generate-blocks', {
        body: JSON.stringify({ context, prompt }),
        headers,
        method: 'POST',
        signal: abortController.signal,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Cortex AI could not generate content.');
      }

      if (!payload || typeof payload.html !== 'string' || !payload.html.trim()) {
        throw new Error('Cortex AI returned an invalid HTML fragment.');
      }

      if (wasEditorEmpty || editor.isEmpty) {
        editor.commands.setContent(payload.html);
      } else if (hasSelection) {
        const docEnd = editor.state.doc.content.size;
        const from = Math.min(selectionBeforeGeneration.from, docEnd);
        const to = Math.min(selectionBeforeGeneration.to, docEnd);

        editor.chain().focus().insertContentAt({ from, to }, payload.html).run();
      } else {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, payload.html).run();
        scrollEditorToBottom();
      }

      setAiPrompt('');
    } catch (error) {
      setAiError(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Cortex AI took too long to generate content. Please try again with a shorter prompt.'
          : error instanceof Error
            ? error.message
            : 'Cortex AI could not generate content.'
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsGeneratingAiContent(false);
    }
  };

  const handleAiPromptKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void handleAiGenerate();
  };

  /**
   * The writing surface itself, hoisted out of the return so it can be dropped
   * into either the historical single-column root or the two-column root
   * without being written twice. A fragment adds no DOM node, so the markup
   * these children produce is identical in both branches.
   */
  const editorColumn = (
    <>
      {showToolbar && <EditorToolbar editor={editor} />}

      {showAiPrompt && editable && (
        <div
          role="group"
          aria-label="Cortex AI content generation"
          className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2"
        >
          <label htmlFor="cortex-ai-editor-prompt" className="sr-only">
            Cortex AI prompt
          </label>
          <input
            id="cortex-ai-editor-prompt"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            onKeyDown={handleAiPromptKeyDown}
            disabled={isGeneratingAiContent}
            placeholder="Ask Cortex AI"
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handleAiGenerate()}
            disabled={!aiPrompt.trim() || isGeneratingAiContent}
            title="Generate rich text"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingAiContent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {aiError && (
        <div className="border-b bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {aiError}
        </div>
      )}

      <EditorBubbleMenu editor={editor} />
      <EditorFloatingMenu editor={editor} />
      <ImageToolbar editor={editor} />
      <TableToolbar editor={editor} />

      <div className="flex-1 min-h-0 overflow-y-auto" data-editor-scroll-area="true">
        <EditorContent editor={editor} />
      </div>

      {showCharacterCount && characterCount && (
        <div className="absolute bottom-2 right-2 text-xs z-10 text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border">
          {characters} characters / {words} words
        </div>
      )}
    </>
  );

  // No companion panel: render precisely the tree this component has always
  // rendered. Callers that never opt in must not pay for the feature with an
  // extra wrapper element, a changed root class list, or a reflow.
  if (!sidePanel) {
    return (
      <div
        ref={wrapperRef}
        className={cn(
          'relative w-full rounded-lg border bg-background shadow-sm',
          // Make wrapper a flex column that can host an internal scroll area
          'flex flex-col h-full min-h-0',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          className
        )}
      >
        {editorColumn}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative w-full rounded-lg border bg-background shadow-sm',
        // Stacked on small screens, side by side from `lg` up. Going straight to
        // a row at every width would squeeze the prose into a column too narrow
        // to write in on a tablet, and hiding the panel outright below the
        // breakpoint would make it unreachable there — so it moves underneath
        // the editor instead, capped in height so it never buries the text.
        'flex flex-col h-full min-h-0 lg:flex-row',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      {/* `relative` moves with the column so the character counter, which is
          absolutely positioned against its nearest positioned ancestor, keeps
          anchoring to the bottom-right of the prose rather than drifting over
          the panel. */}
      <div className="relative flex min-h-0 flex-1 flex-col">{editorColumn}</div>

      <aside
        className={cn(
          'flex w-full shrink-0 flex-col overflow-y-auto border-t bg-muted/20',
          'max-h-[45vh] lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 xl:w-96'
        )}
      >
        {sidePanel}
      </aside>
    </div>
  );
};

export default NotionEditor;
