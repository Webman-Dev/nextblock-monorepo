"use client";

import React, { useEffect, useRef } from "react";

export interface HtmlContentProps {
  html: string;
  className?: string;
}

// Client-only renderer that executes scripts in an HTML string
// without requiring a CSP nonce by externalizing inline scripts
// to blob URLs. Requires CSP: script-src to include blob:.
export const HtmlContent: React.FC<HtmlContentProps> = ({ html, className }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Write HTML
    root.innerHTML = html;

    // Replace inline scripts with blob-backed scripts
    const createdUrls: string[] = [];
    const scripts = Array.from(root.querySelectorAll("script"));

    scripts.forEach((orig) => {
      const s = document.createElement("script");

      // copy attributes
      for (const attr of Array.from(orig.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }

      if (orig.src) {
        s.src = orig.src;
      } else {
        const code = orig.textContent || "";
        const blob = new Blob([code], { type: s.type || "text/javascript" });
        const url = URL.createObjectURL(blob);
        s.src = url;
        s.async = false;
        createdUrls.push(url);
      }

      // Ensure the new script replaces the old one in place
      orig.parentNode?.insertBefore(s, orig);
      orig.remove();
    });

    return () => {
      // Cleanup blob URLs on unmount/update
      createdUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Failed to revoke object URL", u, error);
          }
        }
      });
    };
  }, [html]);

  return <div ref={ref} className={className} />;
};

export default HtmlContent;
