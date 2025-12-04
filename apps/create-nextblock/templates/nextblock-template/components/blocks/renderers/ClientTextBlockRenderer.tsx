"use client";

import React from "react";
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';
import AlertWidgetRenderer from "./inline/AlertWidgetRenderer";
import CtaWidgetRenderer from "./inline/CtaWidgetRenderer";
import type { TextBlockContent } from "./TextBlockRenderer";

interface ClientTextBlockRendererProps {
  content: TextBlockContent;
  languageId: number;
}

const ClientTextBlockRenderer: React.FC<ClientTextBlockRendererProps> = ({ content, languageId }) => {
  void languageId;
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element && domNode.attribs) {
        if (domNode.attribs['fetchpriority']) {
          domNode.attribs['fetchPriority'] = domNode.attribs['fetchpriority'];
          delete domNode.attribs['fetchpriority'];
        }

        if (domNode.attribs['data-alert-widget'] !== undefined) {
          const {
            'data-type': type,
            'data-title': title,
            'data-message': message,
            'data-align': align,
            'data-size': size,
            'data-text-align': textAlign,
          } = domNode.attribs;
          return (
            <AlertWidgetRenderer
              type={type as any}
              title={title}
              message={message}
              align={align as any}
              size={size as any}
              textAlign={textAlign as any}
            />
          );
        }

        if (domNode.attribs['data-cta-widget'] !== undefined) {
          const {
            'data-text': text,
            'data-url': url,
            'data-style': style,
            'data-size': size,
            'data-text-align': textAlign,
          } = domNode.attribs;
          return (
            <CtaWidgetRenderer
              text={text}
              url={url}
              style={style as any}
              size={size as any}
              textAlign={textAlign as any}
            />
          );
        }
      }
    },
  };

  return (
    <div className="my-4 prose dark:prose-invert container mx-auto">
      {parse(content.html_content || "", options)}
    </div>
  );
};

export default ClientTextBlockRenderer;
