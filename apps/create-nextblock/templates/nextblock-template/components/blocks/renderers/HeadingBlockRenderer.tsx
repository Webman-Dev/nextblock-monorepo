import React from "react";
import type { HeadingBlockContent } from "@/lib/blocks/blockRegistry";

interface HeadingBlockRendererProps {
  content: HeadingBlockContent;
  languageId: number;
}

const HeadingBlockRenderer: React.FC<HeadingBlockRendererProps> = ({
  content,
  languageId,
}) => {
  void languageId;
  // Ensure level is between 1 and 6, default to 2
  const level =
    typeof content.level === "number" &&
    content.level >= 1 &&
    content.level <= 6
      ? content.level
      : 2;
  const Tag: React.ElementType = `h${level}`;
  
  let alignmentClass = "";
  if (content.textAlign) {
    alignmentClass = `text-${content.textAlign}`;
  }

  let colorClass = "";
  if (content.textColor) {
    colorClass = `text-${content.textColor}`;
  }

  const combinedClasses = `my-6 font-bold container mx-auto ${alignmentClass} ${colorClass}`.trim();
  return (
    <Tag className={combinedClasses}>
      {content.text_content}
    </Tag>
  );
};

export default HeadingBlockRenderer;
