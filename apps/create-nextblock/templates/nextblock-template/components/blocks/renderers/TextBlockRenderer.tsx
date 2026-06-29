import React from "react";
import { headers } from 'next/headers';
import ClientTextBlockRenderer from "./ClientTextBlockRenderer";
import type { VisualEditAttributes } from "../../../lib/visual-editing/types";
import { substitutePrivacyMergeTags } from "../../../lib/privacy/contact-emails";

export type TextBlockContent = {
    html_content?: string;
};

interface TextBlockRendererProps {
  content: TextBlockContent;
  languageId: number;
  visualEditAttributes?: VisualEditAttributes;
  renderContext?: 'prose' | 'section';
}

function addNonceToInlineScripts(html: string, nonce: string): string {
  if (!html || !nonce) return html || '';
  // Add nonce to <script> tags that do not already have a nonce
  // and do not have a src attribute (inline scripts)
  return html.replace(/<script(?![^>]*\bsrc=)([^>]*)(?<!nonce=["'][^"']*["'])>/gi, (_m, attrs) => {
    return `<script nonce="${nonce}"${attrs}>`;
  });
}

const TextBlockRenderer: React.FC<TextBlockRendererProps> = async ({
  content,
  languageId,
  visualEditAttributes,
  renderContext = 'prose',
}) => {
  const hdrs = await headers();
  const nonce = hdrs.get('x-nonce') || '';
  let html = content.html_content || '';
  if (html.includes('{{')) {
    html = await substitutePrivacyMergeTags(html);
  }
  const htmlWithNonce = html ? addNonceToInlineScripts(html, nonce) : '';
  const patchedContent = { ...content, html_content: htmlWithNonce };
  return (
    <ClientTextBlockRenderer
      content={patchedContent}
      languageId={languageId}
      visualEditAttributes={visualEditAttributes}
      renderContext={renderContext}
    />
  );
};

export default TextBlockRenderer;
