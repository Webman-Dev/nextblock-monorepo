import React from "react";
import Link from "next/link";
import { Button } from "@nextblock-cms/ui";
import { cn } from "@nextblock-cms/utils";

export type ButtonBlockContent = {
    text?: string;
    url?: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'full';
    position?: 'left' | 'center' | 'right';
};

interface ButtonBlockRendererProps {
  content: ButtonBlockContent;
  languageId: number; // This prop seems unused
}

const ButtonBlockRenderer: React.FC<ButtonBlockRendererProps> = ({
  content,
}) => {
  const isExternal =
    content.url?.startsWith("http") ||
    content.url?.startsWith("mailto:") ||
    content.url?.startsWith("tel:");
  const isAnchor = content.url?.startsWith("#");

  const buttonText = content.text || "Button";
  const buttonVariant = content.variant || "default";
  const buttonSize = content.size || "default";
  const buttonPosition = content.position || "left";

  const alignmentClasses = {
      left: "justify-start text-left",
      center: "justify-center text-center",
      right: "justify-end text-right",
  };

  return (
    <div className={cn("my-6 flex w-full", alignmentClasses[buttonPosition])}>
      {/* Case 1: Internal link (not external, not anchor, has URL) */}
      {!isExternal && !isAnchor && !!content.url ? (
        <Button
            asChild
            variant={buttonVariant}
            size={buttonSize}
            className={cn(content.variant === 'outline' && "text-foreground")}
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
            className={cn(content.variant === 'outline' && "text-foreground")}
        >
            <a
            href={content.url}
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
            disabled={!content.url}
            className={cn(content.variant === 'outline' && "text-foreground")}
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
};

export default ButtonBlockRenderer;
