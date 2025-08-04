// libs/editor/src/lib/extensions/index.ts
import { type Extension, type Node, type Mark } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import History from '@tiptap/extension-history';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Blockquote from '@tiptap/extension-blockquote';
import { Color } from '@tiptap/extension-color';
import AlertWidgetNode from './AlertWidgetNode';
import CtaWidgetNode from './CtaWidgetNode';

// Load syntax highlighting languages
import { createLowlight, common } from 'lowlight';
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

const lowlight = createLowlight(common);

lowlight.register('html', xml);
lowlight.register('css', css);
lowlight.register('js', js);
lowlight.register('ts', ts);

export const editorExtensions: Array<Extension<any,any> | Node<any,any> | Mark<any,any>> = [
  StarterKit.configure({
    codeBlock: false,
    blockquote: false,
  }),
  Blockquote,
  CodeBlockLowlight.configure({
    lowlight,
  }),
  History,
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Link.configure({
    openOnClick: false,
  }),
  HorizontalRule,
  Color,
  AlertWidgetNode,
  CtaWidgetNode,
];