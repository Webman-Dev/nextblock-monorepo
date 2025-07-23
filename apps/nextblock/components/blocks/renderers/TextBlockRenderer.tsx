import React from "react";

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
    <div
      className="my-4 prose dark:prose-invert container mx-auto"
      dangerouslySetInnerHTML={{
        __html: content.html_content || "",
      }}
    />
  );
};

export default TextBlockRenderer;