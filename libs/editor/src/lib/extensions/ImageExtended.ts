import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ResizableImageView from "./ResizableImageView";

const ImageExtended = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...( (this as any).parent?.() || {}),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes: any) => {
          const out: Record<string, any> = {};
          if (typeof attributes.width === "number") out.width = attributes.width;
          else if (typeof attributes.width === "string" && attributes.width.trim().length > 0) out.style = `width: ${attributes.width};`;
          return out;
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("height") || element.style.height || null,
        renderHTML: (attributes: any) => {
          const out: Record<string, any> = {};
          if (typeof attributes.height === "number") out.height = attributes.height;
          else if (typeof attributes.height === "string" && attributes.height.trim().length > 0) {
            const style = `height: ${attributes.height};`;
            out.style = out.style ? `${out.style} ${style}` : style;
          }
          return out;
        },
      },
      blurDataURL: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-blur") || null,
        renderHTML: (attributes: any) => (attributes.blurDataURL ? { "data-blur": attributes.blurDataURL } : {}),
      },
      lockAspect: {
        default: true,
        parseHTML: (el: HTMLElement) => (el.getAttribute("data-lock-aspect") === "false" ? false : true),
        renderHTML: (attrs: any) => ({ "data-lock-aspect": String(attrs.lockAspect) }),
      },
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align"),
        renderHTML: (attrs: any) => (attrs.align ? { "data-align": attrs.align } : {}),
      },
      caption: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-caption"),
        renderHTML: (attrs: any) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
      focalX: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-focal-x"),
        renderHTML: (attrs: any) => (attrs.focalX != null ? { "data-focal-x": String(attrs.focalX) } : {}),
      },
      focalY: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-focal-y"),
        renderHTML: (attrs: any) => (attrs.focalY != null ? { "data-focal-y": String(attrs.focalY) } : {}),
      },
      focusMode: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-focus-mode") === "true",
        renderHTML: (attrs: any) => (attrs.focusMode ? { "data-focus-mode": "true" } : {}),
      },
    };
  },

  addKeyboardShortcuts() {
    const step = 5;
    const adjust = (delta: number) => () => {
      const attrs: any = this.editor.getAttributes("image") || {};
      const width = attrs.width;
      let current = 100;
      if (typeof width === "string" && width.endsWith("%")) current = parseFloat(width) || 100;
      const next = Math.max(1, Math.min(100, current + delta));
      return this.editor.chain().focus().updateAttributes("image", { width: `${next}%` }).run();
    };
    return {
      "Alt-=": adjust(step),
      "Alt-+": adjust(step),
      "Alt--": adjust(-step),
      "Alt-_": adjust(-step),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ImageExtended;
