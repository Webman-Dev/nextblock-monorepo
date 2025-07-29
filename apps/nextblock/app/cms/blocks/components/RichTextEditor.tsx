// User needs to run: npm install @tiptap/extension-color @tiptap/extension-text-style
"use client";

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';

// Custom Tiptap extensions are now imported
import { FontSizeMark } from './tiptap-extensions/FontSizeMark';
import { StyleTagNode } from './tiptap-extensions/StyleTagNode';
import { DivNode } from './tiptap-extensions/DivNode';
import { PreserveAllAttributesExtension } from './tiptap-extensions/PreserveAllAttributesExtension';
import AlertWidgetNode from './tiptap-extensions/AlertWidgetNode';
import CtaWidgetNode from './tiptap-extensions/CtaWidgetNode';

// UI Components are now imported
import { MenuBar } from './MenuBar';
// Note: MediaLibraryModal is used within MenuBar.tsx
// Note: R2_BASE_URL is now within MediaLibraryModal.tsx
// Note: fontSizes constant is now within MenuBar.tsx
// type Media and createClient are now within MediaLibraryModal.tsx


interface RichTextEditorProps {
  initialContent: string;
  onChange: (htmlContent: string) => void;
  editable?: boolean;
}






export default function RichTextEditor({ initialContent, onChange, editable = true }: RichTextEditorProps) {
  const [isSourceView, setIsSourceView] = useState(false);
  const [htmlSource, setHtmlSource] = useState(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        // Ensure other StarterKit defaults are suitable.
        // If StarterKit's paragraph or other nodes conflict with DivNode's 'div' parsing,
        // you might need to disable them or adjust DivNode's priority.
      }),
      ImageExtension.configure({
        inline: false, // Allow images to be block elements
        allowBase64: true, // If you need to support base64 images
        HTMLAttributes: {
            class: 'max-w-full h-auto rounded-md border my-4',
          },
      }),
      TextStyle.configure(), // Explicitly adding TextStyle before Color
      Color.configure({ types: ['textStyle'] }), // Color depends on TextStyle
      FontSizeMark.configure({}), // Add our custom FontSizeMark
      AlertWidgetNode.configure(),
      CtaWidgetNode.configure(),
      DivNode.configure({}), // Add the new DivNode
      PreserveAllAttributesExtension.configure(), // Ensure this is configured
      StyleTagNode.configure(), // Ensure this is configured
    ],
    content: initialContent, // Use initialContent directly, will be synced by useEffect
    editable: editable && !isSourceView, // Editor not editable in source view
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // This fires when changes are made *within* the Tiptap rich text view.
      const currentTiptapHtml = editor.getHTML();
      setHtmlSource(currentTiptapHtml);
      onChange(currentTiptapHtml);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none h-full focus:outline-none',
      },
    },
  });

  useEffect(() => {
    // When initialContent prop changes:
    setHtmlSource(initialContent);
    if (editor && !isSourceView) {
      if (initialContent !== editor.getHTML()) {
        editor.commands.setContent(initialContent, false);
      }
    }
    // If isSourceView is true, the textarea will automatically pick up the new htmlSource.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent, editor]); // editor.setEditable is handled by useEditor's editable prop

  const toggleSourceView = () => {
    if (!editor) return;
    const newIsSourceView = !isSourceView;

    if (newIsSourceView) {
      // Switching FROM Rich Text TO Source View
      // htmlSource should already be up-to-date. The textarea will display it.
      // DO NOT call setHtmlSource(editor.getHTML()) here.
    } else {
      // Switching FROM Source View TO Rich Text View
      editor.commands.setContent(htmlSource, false);
    }
    setIsSourceView(newIsSourceView); // Set state after logic
  };

  const handleSourceChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSource = event.target.value;
    setHtmlSource(newSource);
    onChange(newSource);
    if (editor) {
      editor.commands.setContent(newSource, false);
    }
  };

  return (
    <div className="h-full flex flex-col border rounded-md">
      {editable && <MenuBar editor={editor} toggleSourceView={toggleSourceView} isSourceView={isSourceView} />}
      {isSourceView && editable ? (
        <textarea
          value={htmlSource}
          onChange={handleSourceChange}
          className="w-full min-h-[150px] p-3 font-mono text-sm border-t focus:outline-none bg-background text-foreground flex-grow"
          disabled={!editable}
        />
      ) : (
        <EditorContent editor={editor} className="flex-1 overflow-y-auto p-2" />
      )}
    </div>
  );
}
