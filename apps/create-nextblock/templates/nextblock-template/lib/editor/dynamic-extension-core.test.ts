// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';

import {
  buildDynamicCustomBlockInsertContent,
  createDynamicCustomBlockExtensions,
  getDynamicCustomBlockAttributeNames,
  getDynamicCustomBlockNodeName,
  type DynamicCustomBlockEditorDefinition,
} from './dynamic-extension-core';

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
  id: '11111111-1111-4111-8111-111111111111',
  layout_schema: {
    children: [
      {
        children: [
          { field_key: 'quote', type: 'field_render' },
          { field_key: 'author_name', type: 'field_render' },
        ],
        type: 'container',
      },
    ],
    type: 'container',
  },
  name: 'Testimonial Card',
  slug: 'testimonial-card',
};

function createEditor(content: Record<string, unknown>) {
  return new Editor({
    content,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      ...createDynamicCustomBlockExtensions([testimonialDefinition]),
    ],
  });
}

describe('dynamic custom block Tiptap extensions', () => {
  it('creates a stable ProseMirror node name and schema attributes for every field', () => {
    expect(getDynamicCustomBlockNodeName('testimonial-card')).toBe(
      'customBlock_testimonial_card'
    );
    expect(getDynamicCustomBlockAttributeNames(testimonialDefinition)).toEqual([
      'customBlockId',
      'customBlockSlug',
      'customBlockName',
      'customBlockLayoutSchema',
      'quote',
      'author_name',
      'portrait',
      'customer',
    ]);
  });

  it('allows deeply nested custom block nodes alongside fixed rich-text blocks', () => {
    const nodeName = getDynamicCustomBlockNodeName(testimonialDefinition.slug);
    const editor = createEditor({
      content: [
        {
          attrs: {
            author_name: 'Ada Lovelace',
            customer: 'profile-1',
            quote: '<p>Blocks can nest.</p>',
          },
          content: [
            {
              content: [{ text: 'Fixed paragraph inside a generated block.', type: 'text' }],
              type: 'paragraph',
            },
            buildDynamicCustomBlockInsertContent(testimonialDefinition, {
              author_name: 'Grace Hopper',
              customer: 'profile-2',
              quote: 'Nested dynamic block',
            }),
          ],
          type: nodeName,
        },
      ],
      type: 'doc',
    });

    const json = editor.getJSON();
    expect(json.content?.[0]?.type).toBe(nodeName);
    expect(json.content?.[0]?.content?.[0]?.type).toBe('paragraph');
    expect(json.content?.[0]?.content?.[1]?.type).toBe(nodeName);
    expect(json.content?.[0]?.attrs).toMatchObject({
      author_name: 'Ada Lovelace',
      customer: 'profile-1',
      customBlockSlug: 'testimonial-card',
      quote: '<p>Blocks can nest.</p>',
    });

    editor.destroy();
  });

  it('round-trips generated data attributes through Tiptap HTML parsing', () => {
    const nodeName = getDynamicCustomBlockNodeName(testimonialDefinition.slug);
    const editor = createEditor({
      content: [
        buildDynamicCustomBlockInsertContent(
          testimonialDefinition,
          {
            author_name: 'Katherine Johnson',
            customer: 'profile-3',
            portrait: {
              object_key: 'custom-blocks/portraits/katherine.webp',
              url: '/custom-blocks/portraits/katherine.webp',
            },
            quote: 'Math made the mission possible.',
          },
          [
            {
              content: [{ text: 'Nested editable content survives.', type: 'text' }],
              type: 'paragraph',
            },
          ]
        ),
      ],
      type: 'doc',
    });
    const html = editor.getHTML();

    expect(html).toContain('data-nextblock-custom-block');
    expect(html).toContain('data-field-author_name="Katherine Johnson"');
    expect(html).toContain('data-field-customer="profile-3"');
    expect(html).toContain('data-field-portrait="{&quot;object_key&quot;');

    editor.commands.setContent(html, { emitUpdate: false });
    const parsed = editor.getJSON();

    expect(parsed.content?.[0]?.type).toBe(nodeName);
    expect(parsed.content?.[0]?.attrs).toMatchObject({
      author_name: 'Katherine Johnson',
      customer: 'profile-3',
      portrait: {
        object_key: 'custom-blocks/portraits/katherine.webp',
        url: '/custom-blocks/portraits/katherine.webp',
      },
      quote: 'Math made the mission possible.',
    });
    expect(parsed.content?.[0]?.content?.[0]?.type).toBe('paragraph');

    editor.destroy();
  });
});
