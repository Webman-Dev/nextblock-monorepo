'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './kit';
import { EditorBubbleMenu } from './components/menus/BubbleMenu';
import { EditorFloatingMenu } from './components/menus/FloatingMenu';
import { EnhancedFloatingMenu } from './components/menus/EnhancedFloatingMenu';
import { EditorToolbar } from './components/menus/Toolbar';
import { MobileToolbar } from './components/mobile/MobileToolbar';
import { Button } from '@nextblock-cms/ui/button';
import { Search, X, Replace } from 'lucide-react';
import { Input } from '@nextblock-cms/ui/input';
import { cn } from '@nextblock-cms/utils';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  showToolbar?: boolean;
  showCharacterCount?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  // Advanced features
  useEnhancedFloatingMenu?: boolean;
  showMobileToolbar?: boolean;
  enableAdvancedPlaceholders?: boolean;
  enableFocusMode?: boolean;
  showKeyboardShortcuts?: boolean;
}

interface SearchReplaceState {
  isOpen: boolean;
  searchTerm: string;
  replaceTerm: string;
  currentMatch: number;
  totalMatches: number;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  onChange,
  placeholder,
  editable = true,
  showToolbar = true,
  showCharacterCount = true,
  className,
  onFocus,
  onBlur,
  // Advanced features
  useEnhancedFloatingMenu = true,
  showMobileToolbar = true,
  enableAdvancedPlaceholders = true,
  enableFocusMode = false,
  showKeyboardShortcuts = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [searchReplace, setSearchReplace] = useState<SearchReplaceState>({
    isOpen: false,
    searchTerm: '',
    replaceTerm: '',
    currentMatch: 0,
    totalMatches: 0,
    caseSensitive: false,
    wholeWord: false,
  });

  const editor = useEditor({
    extensions: editorExtensions,
    content,
    editable,
    immediatelyRender: false, // ✅ v3 + Next.js hydration safety
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl',
          'mx-auto focus:outline-none p-4 min-h-[500px] w-full',
          'prose-headings:scroll-mt-[80px] prose-headings:font-semibold',
          'prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
          'prose-p:leading-7 prose-li:leading-7',
          'prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4',
          'prose-table:border-collapse prose-table:border prose-table:border-border',
          'prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2',
          'prose-td:border prose-td:border-border prose-td:p-2',
          'prose-img:rounded-lg prose-img:shadow-sm',
          className
        ),
      },
      handleKeyDown: (view, event) => {
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'f':
              event.preventDefault();
              setSearchReplace(prev => ({ ...prev, isOpen: !prev.isOpen }));
              return true;
            case 's':
              event.preventDefault();
              // Save functionality could be added here
              return true;
            default:
              return false;
          }
        }
        return false;
      },
    },
  });

  // Sync content when prop changes
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false });
      editor.commands.setTextSelection({ from, to });
    }
  }, [content, editor]);

  // Search functionality
  const performSearch = (term: string) => {
    if (!editor || !term) {
      setSearchReplace(prev => ({ ...prev, totalMatches: 0, currentMatch: 0 }));
      return;
    }

    // This is a simplified search - in a real implementation, you'd want to use
    // a proper search extension or implement more sophisticated search logic
    const text = editor.getText();
    const flags = searchReplace.caseSensitive ? 'g' : 'gi';
    const pattern = searchReplace.wholeWord ? `\\b${term}\\b` : term;
    const regex = new RegExp(pattern, flags);
    const matches = text.match(regex);
    
    setSearchReplace(prev => ({
      ...prev,
      totalMatches: matches ? matches.length : 0,
      currentMatch: matches ? 1 : 0,
    }));
  };

  const replaceAll = () => {
    if (!editor || !searchReplace.searchTerm) return;
    
    const content = editor.getHTML();
    const flags = searchReplace.caseSensitive ? 'g' : 'gi';
    const pattern = searchReplace.wholeWord 
      ? `\\b${searchReplace.searchTerm}\\b` 
      : searchReplace.searchTerm;
    const regex = new RegExp(pattern, flags);
    
    const newContent = content.replace(regex, searchReplace.replaceTerm);
    editor.commands.setContent(newContent);
    
    setSearchReplace(prev => ({ ...prev, totalMatches: 0, currentMatch: 0 }));
  };

  if (!editor) return null;

  const characterCount = editor.storage?.characterCount;
  const characters = characterCount?.characters?.() ?? 0;
  const words = characterCount?.words?.() ?? 0;

  return (
    <div 
      ref={wrapperRef} 
      className={cn(
        "relative w-full rounded-lg border shadow-sm",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        // Default to bg-background if no background class is provided, or rely on caller to set it.
        // For backwards compatibility, we add bg-background by default, but allow override.
        "bg-background", 
        className
      )}
    >
      
      {/* Toolbar */}
      {showToolbar && <EditorToolbar editor={editor} />}

      {/* Search and Replace Panel */}
      {searchReplace.isOpen && (
        <div className="border-b bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchReplace.searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const term = e.target.value;
                  setSearchReplace(prev => ({ ...prev, searchTerm: term }));
                  performSearch(term);
                }}
                className="h-8"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {searchReplace.totalMatches > 0 
                  ? `${searchReplace.currentMatch}/${searchReplace.totalMatches}`
                  : 'No matches'
                }
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchReplace(prev => ({ ...prev, isOpen: false }))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Replace className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Replace with..."
              value={searchReplace.replaceTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchReplace(prev => ({ ...prev, replaceTerm: e.target.value }))}
              className="h-8 flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={replaceAll}
              disabled={!searchReplace.searchTerm || searchReplace.totalMatches === 0}
            >
              Replace All
            </Button>
          </div>
        </div>
      )}

      {/* Editor Menus */}
      <EditorBubbleMenu editor={editor} />
      {useEnhancedFloatingMenu ? (
        <EnhancedFloatingMenu editor={editor} wrapperRef={wrapperRef} />
      ) : (
        <EditorFloatingMenu editor={editor} />
      )}
      
      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Character Count */}
      {showCharacterCount && characterCount && (
        <div className="absolute bottom-2 right-2 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border">
          {characters} characters / {words} words
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardShortcuts && (
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 border opacity-0 hover:opacity-100 transition-opacity">
          <div>Ctrl+F: Search</div>
          <div>Ctrl+S: Save</div>
          <div>/: Commands</div>
          <div>Ctrl+K: Insert Link</div>
          <div>Ctrl+Shift+H: Highlight</div>
          <div>Ctrl+Alt+1-6: Headings</div>
        </div>
      )}

      {/* Mobile Toolbar */}
      {showMobileToolbar && <MobileToolbar editor={editor} />}
    </div>
  );
};

export default Editor;
