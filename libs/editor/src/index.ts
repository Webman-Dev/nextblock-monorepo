// Main editor components
export { Editor } from './lib/editor';
export { Editor as default } from './lib/editor';
export { NotionEditor } from './lib/NotionEditor';

// Menu components
export { EditorBubbleMenu } from './lib/components/menus/BubbleMenu';
export { EditorFloatingMenu } from './lib/components/menus/FloatingMenu';
export { EditorToolbar } from './lib/components/menus/Toolbar';
export { SlashCommandList } from './lib/components/menus/SlashCommandList';

// UI components
export { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator } from './lib/components/ui/Toolbar';

// Extensions
export { editorExtensions } from './lib/kit';
export { SlashCommand } from './lib/extensions/slash-command';
export { TrailingNode } from './lib/extensions/TrailingNode';
export { default as AlertWidget } from './lib/extensions/AlertWidget';
export { default as CtaWidgetNode } from './lib/extensions/CtaWidgetNode';

// Types
export type { CommandItemProps } from './lib/extensions/slash-command';
export type { CommandListRef } from './lib/components/menus/SlashCommandList';

// Note: CSS imports should be handled by the consuming application
