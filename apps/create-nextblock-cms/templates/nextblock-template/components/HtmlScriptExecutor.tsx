"use client";

import React, { useEffect, useRef } from "react";

interface HtmlScriptExecutorProps {
  html: string; // should contain one or more <script> tags
}

// Executes inline scripts in a string by converting them to blob URLs
// Requires CSP: script-src includes blob:
export const HtmlScriptExecutor: React.FC<HtmlScriptExecutorProps> = ({ html }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = html;

    const created: string[] = [];
    const scripts = Array.from(root.querySelectorAll("script"));

    scripts.forEach((old) => {
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
      if (old.src) {
        s.src = old.src;
      } else {
        const blob = new Blob([old.textContent || ""], { type: old.type || "text/javascript" });
        const url = URL.createObjectURL(blob);
        s.src = url;
        s.async = false;
        created.push(url);
      }
      old.parentNode?.insertBefore(s, old);
      old.remove();
    });

    return () => {
      created.forEach((u) => { try { URL.revokeObjectURL(u); } catch (error) { console.error('Failed to revoke blob URL:', error); } });
    };
  }, [html]);

  return <div ref={ref} style={{ display: 'none' }} />;
};

export default HtmlScriptExecutor;

