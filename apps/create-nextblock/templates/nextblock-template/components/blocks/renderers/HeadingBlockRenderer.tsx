import React from "react";
import type { HeadingBlockContent } from '../../../lib/blocks/blockRegistry';
import { resolveTextAlign, resolveTextColor } from '../../../lib/blocks/blockColors';
import type { VisualEditAttributes } from "../../../lib/visual-editing/types";

interface HeadingBlockRendererProps {
  content: HeadingBlockContent;
  languageId: number;
  visualEditAttributes?: VisualEditAttributes;
}

const HeadingBlockRenderer: React.FC<HeadingBlockRendererProps> = ({
  content,
  languageId,
  visualEditAttributes,
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
  
  const alignmentClass = resolveTextAlign(content.textAlign);
  const { className: colorClass, style: colorStyle } = resolveTextColor(content.textColor);

  const combinedClasses = ["my-6 font-bold container mx-auto", alignmentClass, colorClass]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={combinedClasses} style={colorStyle} {...visualEditAttributes}>
      {content.text_content}
    </Tag>
  );
};

export default HeadingBlockRenderer;
