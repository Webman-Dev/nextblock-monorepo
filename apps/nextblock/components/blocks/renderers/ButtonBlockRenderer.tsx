import React from "react";
import Link from "next/link";
import { Button } from "@nextblock-cms/ui";

export type ButtonBlockContent = {
    text?: string;
    url?: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg';
};

interface ButtonBlockRendererProps {
  content: ButtonBlockContent;
  languageId: number; // This prop seems unused
}

const ButtonBlockRenderer: React.FC<ButtonBlockRendererProps> = ({
  content,
  // languageId, // Unused
}) => {
  const isExternal =
    content.url?.startsWith("http") ||
    content.url?.startsWith("mailto:") ||
    content.url?.startsWith("tel:");
  const isAnchor = content.url?.startsWith("#");

  const buttonText = content.text || "Button";
  const buttonVariant = content.variant || "default";
  const buttonSize = content.size || "default";

  return (
    <div className="my-6 text-center">
      {/* Case 1: Internal link (not external, not anchor, has URL) */}
      {!isExternal && !isAnchor && !!content.url ? (
        <Button
          asChild
          variant={buttonVariant}
          size={buttonSize}
        >
          <Link href={content.url}>
            {buttonText}
          </Link>
        </Button>
      ) : /* Case 2: External or Anchor link (has URL) */
      (isExternal || isAnchor) && !!content.url ? (
        <Button
          asChild
          variant={buttonVariant}
          size={buttonSize}
        >
          <a
            href={content.url} // content.url is guaranteed by the condition
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
          >
            {buttonText}
          </a>
        </Button>
      ) : (
        /* Case 3: No URL or other edge cases - render a plain or disabled button */
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={!content.url} // Disable if no URL
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
};

export default ButtonBlockRenderer;