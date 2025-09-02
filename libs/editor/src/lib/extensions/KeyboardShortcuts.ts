import { Extension } from '@tiptap/core';

export interface KeyboardShortcutsOptions {
  enableAdvancedShortcuts: boolean;
  enableCustomShortcuts: boolean;
  showShortcutHints: boolean;
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: 'keyboardShortcuts',

  addOptions() {
    return {
      enableAdvancedShortcuts: true,
      enableCustomShortcuts: true,
      showShortcutHints: false,
    };
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {};

    if (this.options.enableAdvancedShortcuts) {
      // Enhanced text formatting shortcuts
      shortcuts['Mod-Shift-x'] = () => this.editor.commands.toggleStrike();
      shortcuts['Mod-Shift-h'] = () => this.editor.commands.toggleHighlight();
      shortcuts['Mod-Shift-c'] = () => this.editor.commands.toggleCode();
      
      // Quick heading shortcuts
      shortcuts['Mod-Alt-1'] = () => this.editor.commands.toggleHeading({ level: 1 });
      shortcuts['Mod-Alt-2'] = () => this.editor.commands.toggleHeading({ level: 2 });
      shortcuts['Mod-Alt-3'] = () => this.editor.commands.toggleHeading({ level: 3 });
      shortcuts['Mod-Alt-4'] = () => this.editor.commands.toggleHeading({ level: 4 });
      shortcuts['Mod-Alt-5'] = () => this.editor.commands.toggleHeading({ level: 5 });
      shortcuts['Mod-Alt-6'] = () => this.editor.commands.toggleHeading({ level: 6 });
      shortcuts['Mod-Alt-0'] = () => this.editor.commands.setParagraph();

      // List shortcuts
      shortcuts['Mod-Shift-8'] = () => this.editor.commands.toggleBulletList();
      shortcuts['Mod-Shift-7'] = () => this.editor.commands.toggleOrderedList();
      shortcuts['Mod-Shift-9'] = () => this.editor.commands.toggleTaskList();

      // Block shortcuts
      shortcuts['Mod-Shift-b'] = () => this.editor.commands.toggleBlockquote();
      shortcuts['Mod-Alt-c'] = () => this.editor.commands.toggleCodeBlock();
      shortcuts['Mod-Shift-minus'] = () => this.editor.commands.setHorizontalRule();

      // Text alignment shortcuts
      shortcuts['Mod-Shift-l'] = () => this.editor.commands.setTextAlign('left');
      shortcuts['Mod-Shift-e'] = () => this.editor.commands.setTextAlign('center');
      shortcuts['Mod-Shift-r'] = () => this.editor.commands.setTextAlign('right');
      shortcuts['Mod-Shift-j'] = () => this.editor.commands.setTextAlign('justify');

      // Advanced formatting
      shortcuts['Mod-comma'] = () => this.editor.commands.toggleSubscript();
      shortcuts['Mod-period'] = () => this.editor.commands.toggleSuperscript();

      // Table shortcuts
      shortcuts['Mod-Alt-t'] = () => {
        if (this.editor.can().insertTable()) {
          return this.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
        }
        return false;
      };

      // Navigation shortcuts
      shortcuts['Mod-Home'] = () => this.editor.commands.focus('start');
      shortcuts['Mod-End'] = () => this.editor.commands.focus('end');
      shortcuts['Mod-a'] = () => this.editor.commands.selectAll();

      // Clear formatting
      shortcuts['Mod-\\'] = () => {
        return this.editor.commands.unsetAllMarks() && this.editor.commands.clearNodes();
      };

      // Insert shortcuts
      shortcuts['Mod-k'] = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
          return this.editor.commands.setLink({ href: url });
        }
        return false;
      };

      shortcuts['Mod-Shift-i'] = () => {
        const url = window.prompt('Enter image URL:');
        if (url) {
          return this.editor.commands.setImage({ src: url });
        }
        return false;
      };

      // Advanced navigation
      shortcuts['Alt-ArrowUp'] = () => {
        const { selection } = this.editor.state;
        const { $from } = selection;
        const before = $from.nodeBefore;
        
        if (before) {
          const pos = $from.pos - before.nodeSize;
          return this.editor.commands.setTextSelection(pos);
        }
        return false;
      };

      shortcuts['Alt-ArrowDown'] = () => {
        const { selection } = this.editor.state;
        const { $to } = selection;
        const after = $to.nodeAfter;
        
        if (after) {
          const pos = $to.pos + after.nodeSize;
          return this.editor.commands.setTextSelection(pos);
        }
        return false;
      };

      // Line manipulation
      shortcuts['Mod-Shift-d'] = () => {
        // Duplicate current line/selection
        const { selection } = this.editor.state;
        const { from, to } = selection;
        const text = this.editor.state.doc.textBetween(from, to);
        
        if (text) {
          return this.editor.commands.insertContentAt(to, `\n${text}`);
        }
        return false;
      };

      shortcuts['Mod-Shift-k'] = () => {
        // Delete current line
        const { selection } = this.editor.state;
        const { $from, $to } = selection;
        
        // Find the start and end of the current line
        const start = $from.start();
        const end = $to.end();
        
        return this.editor.commands.deleteRange({ from: start, to: end });
      };

      // Word manipulation
      shortcuts['Mod-Backspace'] = () => {
        // Delete word before cursor
        const { selection } = this.editor.state;
        const { from } = selection;
        const $pos = this.editor.state.doc.resolve(from);
        
        // Find word boundary
        let wordStart = from;
        const text = $pos.parent.textContent;
        const offset = $pos.parentOffset;
        
        for (let i = offset - 1; i >= 0; i--) {
          if (/\s/.test(text[i])) {
            wordStart = from - (offset - i - 1);
            break;
          }
          if (i === 0) {
            wordStart = from - offset;
          }
        }
        
        return this.editor.commands.deleteRange({ from: wordStart, to: from });
      };

      shortcuts['Mod-Delete'] = () => {
        // Delete word after cursor
        const { selection } = this.editor.state;
        const { to } = selection;
        const $pos = this.editor.state.doc.resolve(to);
        
        // Find word boundary
        let wordEnd = to;
        const text = $pos.parent.textContent;
        const offset = $pos.parentOffset;
        
        for (let i = offset; i < text.length; i++) {
          if (/\s/.test(text[i])) {
            wordEnd = to + (i - offset);
            break;
          }
          if (i === text.length - 1) {
            wordEnd = to + (text.length - offset);
          }
        }
        
        return this.editor.commands.deleteRange({ from: to, to: wordEnd });
      };
    }

    if (this.options.enableCustomShortcuts) {
      // Custom widget shortcuts
      shortcuts['Mod-Shift-a'] = () => {
        if (this.editor.can().setAlertWidget()) {
          return this.editor.commands.setAlertWidget();
        }
        return false;
      };

      shortcuts['Mod-Shift-t'] = () => {
        if (this.editor.can().setCtaWidget()) {
          return this.editor.commands.setCtaWidget({
            text: 'Click me',
            url: '#',
            style: 'primary',
            size: 'medium',
            textAlign: 'center',
          });
        }
        return false;
      };

      // Quick formatting combinations
      shortcuts['Mod-Shift-f'] = () => {
        // Toggle focus mode (if available)
        const editorElement = this.editor.view.dom;
        editorElement.classList.toggle('focus-mode');
        return true;
      };

      shortcuts['Mod-Shift-w'] = () => {
        // Toggle writing mode (distraction-free)
        const editorElement = this.editor.view.dom;
        editorElement.classList.toggle('writing-mode');
        return true;
      };

      // Quick text transformations
      shortcuts['Mod-Shift-u'] = () => {
        // Transform to uppercase
        const { selection } = this.editor.state;
        const { from, to } = selection;
        const text = this.editor.state.doc.textBetween(from, to);
        
        if (text) {
          return this.editor.commands.insertContentAt(
            { from, to },
            text.toUpperCase()
          );
        }
        return false;
      };

      shortcuts['Mod-Shift-l'] = () => {
        // Transform to lowercase
        const { selection } = this.editor.state;
        const { from, to } = selection;
        const text = this.editor.state.doc.textBetween(from, to);
        
        if (text) {
          return this.editor.commands.insertContentAt(
            { from, to },
            text.toLowerCase()
          );
        }
        return false;
      };

      shortcuts['Mod-Shift-p'] = () => {
        // Transform to title case
        const { selection } = this.editor.state;
        const { from, to } = selection;
        const text = this.editor.state.doc.textBetween(from, to);
        
        if (text) {
          const titleCase = text.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
          return this.editor.commands.insertContentAt(
            { from, to },
            titleCase
          );
        }
        return false;
      };
    }

    return shortcuts;
  },

  addStorage() {
    return {
      shortcuts: {},
      hints: [],
    };
  },

  onCreate() {
    // Store available shortcuts for hint system
    if (this.options.showShortcutHints) {
      this.storage.shortcuts = {};
      this.storage.hints = [
        { category: 'Text Formatting', shortcuts: [
          { keys: 'Cmd/Ctrl + B', action: 'Bold' },
          { keys: 'Cmd/Ctrl + I', action: 'Italic' },
          { keys: 'Cmd/Ctrl + U', action: 'Underline' },
          { keys: 'Cmd/Ctrl + Shift + X', action: 'Strikethrough' },
          { keys: 'Cmd/Ctrl + Shift + H', action: 'Highlight' },
          { keys: 'Cmd/Ctrl + E', action: 'Inline Code' },
        ]},
        { category: 'Headings', shortcuts: [
          { keys: 'Cmd/Ctrl + Alt + 1-6', action: 'Heading 1-6' },
          { keys: 'Cmd/Ctrl + Alt + 0', action: 'Paragraph' },
        ]},
        { category: 'Lists', shortcuts: [
          { keys: 'Cmd/Ctrl + Shift + 8', action: 'Bullet List' },
          { keys: 'Cmd/Ctrl + Shift + 7', action: 'Numbered List' },
          { keys: 'Cmd/Ctrl + Shift + 9', action: 'Task List' },
        ]},
        { category: 'Blocks', shortcuts: [
          { keys: 'Cmd/Ctrl + Shift + B', action: 'Blockquote' },
          { keys: 'Cmd/Ctrl + Alt + C', action: 'Code Block' },
          { keys: 'Cmd/Ctrl + Alt + T', action: 'Table' },
        ]},
        { category: 'Navigation', shortcuts: [
          { keys: 'Cmd/Ctrl + A', action: 'Select All' },
          { keys: 'Cmd/Ctrl + Home', action: 'Go to Start' },
          { keys: 'Cmd/Ctrl + End', action: 'Go to End' },
        ]},
        { category: 'Advanced', shortcuts: [
          { keys: 'Cmd/Ctrl + K', action: 'Insert Link' },
          { keys: 'Cmd/Ctrl + Shift + I', action: 'Insert Image' },
          { keys: 'Cmd/Ctrl + \\', action: 'Clear Formatting' },
        ]},
      ];
    }
  },
});