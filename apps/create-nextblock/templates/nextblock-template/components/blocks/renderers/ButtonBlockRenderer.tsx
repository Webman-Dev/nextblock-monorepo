import React from "react";
import Link from "next/link";
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
  const baseClasses =
    "inline-flex items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const variantClasses: Record<string, string> = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    outline:
      "border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary:
      "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  const sizeClasses: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
  };

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
        <Link
          href={content.url}
          className={[
            baseClasses,
            variantClasses[buttonVariant],
            sizeClasses[buttonSize],
          ].join(" ")}
        >
          {buttonText}
        </Link>
      ) : /* Case 2: External or Anchor link (has URL) */
      (isExternal || isAnchor) && !!content.url ? (
        <a
          href={content.url} // content.url is guaranteed by the condition
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className={[
            baseClasses,
            variantClasses[buttonVariant],
            sizeClasses[buttonSize],
          ].join(" ")}
        >
          {buttonText}
        </a>
      ) : (
        /* Case 3: No URL or other edge cases - render a plain or disabled button */
        <button
          type="button"
          className={[
            baseClasses,
            variantClasses[buttonVariant],
            sizeClasses[buttonSize],
          ].join(" ")}
          disabled={!content.url}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
};

export default ButtonBlockRenderer;
