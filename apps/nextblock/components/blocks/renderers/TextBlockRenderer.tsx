import React from "react";
import { headers } from 'next/headers';
import ClientTextBlockRenderer from "./ClientTextBlockRenderer";

export type TextBlockContent = {
    html_content?: string;
};

interface TextBlockRendererProps {
  content: TextBlockContent;
  languageId: number;
}

function addNonceToInlineScripts(html: string, nonce: string): string {
  if (!html || !nonce) return html || '';
  // Add nonce to <script> tags that do not already have a nonce
  // and do not have a src attribute (inline scripts)
  return html.replace(/<script(?![^>]*\bsrc=)([^>]*)(?<!nonce=["'][^"']*["'])>/gi, (_m, attrs) => {
    return `<script nonce="${nonce}"${attrs}>`;
  });
}

const TextBlockRenderer: React.FC<TextBlockRendererProps> = async ({ content, languageId }) => {
  const hdrs = await headers();
  const nonce = hdrs.get('x-nonce') || '';
  const htmlWithNonce = content.html_content ? addNonceToInlineScripts(content.html_content, nonce) : '';
  const patchedContent = { ...content, html_content: htmlWithNonce };
  return <ClientTextBlockRenderer content={patchedContent} languageId={languageId} />;
};

export default TextBlockRenderer;
