import { describe, expect, it } from 'vitest';

import {
  buildCustomBlockCopySlug,
  customBlockDefinitionCreateSchema,
  customBlockFieldsSchema,
} from './custom-blocks';

describe('custom block schemas', () => {
  it('accepts a nested testimonial block definition with allowed core field types', () => {
    const parsed = customBlockDefinitionCreateSchema.parse({
      fields: [
        { key: 'quote', label: 'Quote', type: 'rich-text' },
        { key: 'portrait', label: 'Portrait', type: 'image_r2' },
        { key: 'author_name', label: 'Author Name', type: 'text' },
        {
          display_column: 'full_name',
          key: 'customer',
          label: 'Customer',
          table: 'profiles',
          type: 'db_relation',
          value_column: 'id',
        },
      ],
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
      name: 'Intricate Testimonial Card',
      slug: 'intricate-testimonial-card',
    });

    expect(parsed.fields.map((field) => field.type)).toEqual([
      'rich-text',
      'image_r2',
      'text',
      'db_relation',
    ]);
  });

  it('rejects duplicate field keys', () => {
    const parsed = customBlockFieldsSchema.safeParse([
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'title', label: 'Title Again', type: 'text' },
    ]);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        'Duplicate field key "title".'
      );
    }
  });

  it('rejects unsupported custom field types', () => {
    const parsed = customBlockFieldsSchema.safeParse([
      { key: 'cta', label: 'CTA', type: 'button' },
    ]);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message).join('\n')).toContain(
        "Expected 'text' | 'rich-text' | 'image_r2' | 'db_relation'"
      );
    }
  });

  it('rejects layouts that reference undefined fields', () => {
    const parsed = customBlockDefinitionCreateSchema.safeParse({
      fields: [{ key: 'title', label: 'Title', type: 'text' }],
      layout_schema: {
        field_key: 'missing_field',
        type: 'field_render',
      },
      name: 'Broken Card',
      slug: 'broken-card',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        'Layout references unknown field "missing_field".'
      );
    }
  });

  it('builds distinct copy slugs', () => {
    expect(
      buildCustomBlockCopySlug('testimonial-card', [
        'testimonial-card',
        'testimonial-card-copy',
        'testimonial-card-copy-2',
      ])
    ).toBe('testimonial-card-copy-3');

    expect(
      buildCustomBlockCopySlug('testimonial-card-copy', [
        'testimonial-card',
        'testimonial-card-copy',
      ])
    ).toBe('testimonial-card-copy-2');
  });
});
