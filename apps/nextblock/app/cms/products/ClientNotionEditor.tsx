'use client';

import dynamic from 'next/dynamic';

export interface EditorProps {
  initialContent?: any;
  onUpdate?: (content: any) => void;
  showAiPrompt?: boolean;
}

export const ClientNotionEditor = dynamic<EditorProps>(
  () => import('@nextblock-cms/editor').then((mod) => mod.NotionEditor as any),
  { ssr: false }
);

export default ClientNotionEditor;
