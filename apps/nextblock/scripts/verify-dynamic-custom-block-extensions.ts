import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import {
  buildDynamicCustomBlockInsertContent,
  createDynamicCustomBlockExtensions,
  getDynamicCustomBlockNodeName,
  type DynamicCustomBlockEditorDefinition,
} from '../lib/editor/dynamic-extension-core';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});

const testimonialDefinition: DynamicCustomBlockEditorDefinition = {
  fields: [
    { key: 'quote', label: 'Quote', required: false, type: 'rich-text' },
    { key: 'author_name', label: 'Author Name', required: false, type: 'text' },
    {
      key: 'portrait',
      label: 'Portrait',
      required: false,
      type: 'image_r2',
    },
    {
      display_column: 'full_name',
      key: 'customer',
      label: 'Customer',
      multiple: false,
      required: false,
      table: 'profiles',
      type: 'db_relation',
      value_column: 'id',
    },
  ],
  id: '22222222-2222-4222-8222-222222222222',
  layout_schema: {
    children: [
      {
        children: [
          { field_key: 'quote', type: 'field_render' },
          {
            children: [
              { field_key: 'portrait', type: 'field_render' },
              { field_key: 'author_name', type: 'field_render' },
              { field_key: 'customer', type: 'field_render' },
            ],
            type: 'container',
          },
        ],
        type: 'container',
      },
    ],
    type: 'container',
  },
  name: 'Runtime Testimonial Card',
  slug: 'runtime-testimonial-card',
};

const nodeName = getDynamicCustomBlockNodeName(testimonialDefinition.slug);
const editor = new Editor({
  content: {
    content: [
      {
        content: [{ text: 'Fixed paragraph before the generated custom block.', type: 'text' }],
        type: 'paragraph',
      },
      buildDynamicCustomBlockInsertContent(
        testimonialDefinition,
        {
          author_name: 'Verification User',
          customer: 'profile-verification',
          portrait: {
            object_key: 'custom-blocks/verification/portrait.webp',
            url: '/custom-blocks/verification/portrait.webp',
          },
          quote: 'Generated schemas parse into Tiptap nodes.',
        },
        [
          {
            content: [{ text: 'Editable nested content is accepted inside the custom block.', type: 'text' }],
            type: 'paragraph',
          },
        ]
      ),
    ],
    type: 'doc',
  },
  extensions: [
    StarterKit.configure({ undoRedo: false }),
    ...createDynamicCustomBlockExtensions([testimonialDefinition]),
  ],
});

const html = editor.getHTML();
editor.commands.setContent(html, { emitUpdate: false });
const parsed = editor.getJSON();

console.log('[Milestone 3] Dynamic custom block extension verification');
console.log(
  JSON.stringify(
    {
      fixedNodeType: parsed.content?.[0]?.type,
      generatedNodeType: parsed.content?.[1]?.type,
      generatedAttrs: parsed.content?.[1]?.attrs,
      hasNestedEditableContent: parsed.content?.[1]?.content?.[0]?.type === 'paragraph',
      htmlContainsDataAttributes:
        html.includes('data-nextblock-custom-block') &&
        html.includes('data-field-author_name="Verification User"'),
      nodeName,
    },
    null,
    2
  )
);

editor.destroy();
