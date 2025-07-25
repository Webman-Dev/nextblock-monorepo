import React from "react";
import ClientTextBlockRenderer from "./ClientTextBlockRenderer";

export type TextBlockContent = {
    html_content?: string;
};

interface TextBlockRendererProps {
  content: TextBlockContent;
  languageId: number;
}

const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({
  content,
  languageId,
}) => {
  return (
    <ClientTextBlockRenderer content={content} languageId={languageId} />
  );
};

export default TextBlockRenderer;