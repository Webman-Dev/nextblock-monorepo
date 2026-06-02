import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CustomBlockDefinition } from '@nextblock-cms/utils';

import { DynamicLayoutEngine } from '../components/renderers/DynamicLayoutEngine';

const definition: Pick<
  CustomBlockDefinition,
  'fields' | 'id' | 'layout_schema' | 'name' | 'slug'
> = {
  fields: [
    { key: 'quote', label: 'Quote', required: false, type: 'rich-text' },
    { key: 'author_name', label: 'Author Name', required: false, type: 'text' },
    { key: 'portrait', label: 'Portrait', required: false, type: 'image_r2' },
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
  id: '44444444-4444-4444-8444-444444444444',
  layout_schema: {
    as: 'section',
    children: [
      {
        as: 'div',
        children: [
          {
            as: 'div',
            children: [
              {
                as: 'figure',
                children: [
                  {
                    as: 'img',
                    className: 'h-20 w-20 rounded-full object-cover ring-2 ring-primary/20',
                    field_key: 'portrait',
                    type: 'field_render',
                  },
                ],
                className: 'flex justify-center md:justify-start',
                type: 'container',
              },
              {
                as: 'div',
                children: [
                  {
                    as: 'blockquote',
                    className: 'text-xl font-semibold leading-relaxed text-foreground',
                    field_key: 'quote',
                    type: 'field_render',
                  },
                  {
                    as: 'p',
                    className: 'text-sm font-medium text-foreground',
                    field_key: 'author_name',
                    type: 'field_render',
                  },
                  {
                    as: 'span',
                    className: 'text-xs uppercase tracking-wide text-muted-foreground',
                    field_key: 'customer',
                    type: 'field_render',
                  },
                ],
                className: 'flex flex-col gap-2',
                type: 'container',
              },
            ],
            className: 'grid gap-6 md:grid-cols-[auto_1fr] md:items-center',
            type: 'container',
          },
        ],
        className: 'mx-auto max-w-4xl rounded-lg border bg-background p-6 shadow-sm',
        type: 'container',
      },
    ],
    className: 'py-12',
    type: 'container',
  },
  name: 'Milestone 4 Testimonial',
  slug: 'milestone-4-testimonial',
};

const html = renderToStaticMarkup(
  <DynamicLayoutEngine
    definition={definition}
    data={{
      author_name: 'Milestone Validator',
      customer: 'profile-milestone',
      portrait: {
        alt: 'Milestone validator portrait',
        height: 160,
        object_key: 'custom-blocks/milestone-4/portrait.webp',
        url: '/custom-blocks/milestone-4/portrait.webp',
        width: 160,
      },
      quote: '<p>Container to container to multi-column flex to fields rendered cleanly.</p>',
      resolved_relations: {
        customer: {
          record: {
            full_name: 'NextBlock Verification Customer',
            id: 'profile-milestone',
          },
          table: 'profiles',
          value: 'profile-milestone',
        },
      },
    }}
  />
);

console.log('[Milestone 4] Dynamic layout engine verification');
console.log(
  JSON.stringify(
    {
      containsImage: html.includes('custom-blocks/milestone-4/portrait.webp'),
      containsNestedTailwind:
        html.includes('grid gap-6 md:grid-cols-[auto_1fr] md:items-center') &&
        html.includes('flex flex-col gap-2'),
      containsResolvedRelation: html.includes('NextBlock Verification Customer'),
      html,
      warningCount: (html.match(/data-dynamic-layout-warning/g) ?? []).length,
    },
    null,
    2
  )
);
