import { mergeAttributes, Node, type Extensions, type JSONContent, type NodeViewRenderer } from '@tiptap/core';
import type { CustomBlockDefinition, CustomBlockField } from '@nextblock-cms/utils';

export type DynamicCustomBlockEditorDefinition = Pick<
  CustomBlockDefinition,
  'fields' | 'id' | 'layout_schema' | 'name' | 'slug'
>;

export type DynamicCustomBlockNodeViewRenderer = (
  definition: DynamicCustomBlockEditorDefinition
) => NodeViewRenderer;

export type CreateDynamicCustomBlockExtensionOptions = {
  contentExpression?: string;
  nodeViewRenderer?: DynamicCustomBlockNodeViewRenderer;
};

const CUSTOM_BLOCK_NODE_PREFIX = 'customBlock';

function toNodeNameSegment(slug: string) {
  return slug
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function getDynamicCustomBlockNodeName(slug: string) {
  const segment = toNodeNameSegment(slug) || 'unnamed';
  return `${CUSTOM_BLOCK_NODE_PREFIX}_${segment}`;
}

function getFieldDefaultValue(field: CustomBlockField) {
  if ('default_value' in field && field.default_value !== undefined) {
    return field.default_value;
  }

  if (field.type === 'db_relation') {
    return field.multiple ? [] : null;
  }

  if (field.type === 'image_r2') {
    return null;
  }

  return '';
}

function parseSerializedAttribute(value: string | null, fallback: unknown) {
  if (value === null) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializeAttribute(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

function renderDataAttribute(name: string, value: unknown) {
  const serialized = serializeAttribute(value);
  return serialized === undefined ? {} : { [name]: serialized };
}

export function buildDynamicCustomBlockInsertContent(
  definition: DynamicCustomBlockEditorDefinition,
  attrs: Record<string, unknown> = {},
  content: JSONContent[] = []
) {
  const fieldAttrs = Object.fromEntries(
    definition.fields.map((field) => [field.key, getFieldDefaultValue(field)])
  );

  return {
    attrs: {
      ...fieldAttrs,
      customBlockId: definition.id,
      customBlockLayoutSchema: definition.layout_schema,
      customBlockName: definition.name,
      customBlockSlug: definition.slug,
      ...attrs,
    },
    content,
    type: getDynamicCustomBlockNodeName(definition.slug),
  } satisfies JSONContent;
}

export function getDynamicCustomBlockAttributeNames(
  definition: DynamicCustomBlockEditorDefinition
) {
  return [
    'customBlockId',
    'customBlockSlug',
    'customBlockName',
    'customBlockLayoutSchema',
    ...definition.fields.map((field) => field.key),
  ];
}

export function createDynamicCustomBlockExtension(
  definition: DynamicCustomBlockEditorDefinition,
  options: CreateDynamicCustomBlockExtensionOptions = {}
) {
  const nodeName = getDynamicCustomBlockNodeName(definition.slug);
  const contentExpression = options.contentExpression ?? 'block*';

  const config: Parameters<typeof Node.create>[0] = {
    name: nodeName,
    group: 'block',
    content: contentExpression,
    defining: true,
    draggable: true,
    isolating: true,
    selectable: true,

    addAttributes() {
      const attributes: Record<string, unknown> = {
        customBlockId: {
          default: definition.id,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-custom-block-id') ?? definition.id,
          renderHTML: (attrs: Record<string, unknown>) =>
            renderDataAttribute('data-custom-block-id', attrs.customBlockId),
        },
        customBlockLayoutSchema: {
          default: definition.layout_schema,
          parseHTML: (element: HTMLElement) =>
            parseSerializedAttribute(
              element.getAttribute('data-custom-block-layout-schema'),
              definition.layout_schema
            ),
          renderHTML: (attrs: Record<string, unknown>) =>
            renderDataAttribute(
              'data-custom-block-layout-schema',
              attrs.customBlockLayoutSchema
            ),
        },
        customBlockName: {
          default: definition.name,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-custom-block-name') ?? definition.name,
          renderHTML: (attrs: Record<string, unknown>) =>
            renderDataAttribute('data-custom-block-name', attrs.customBlockName),
        },
        customBlockSlug: {
          default: definition.slug,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute('data-custom-block-slug') ?? definition.slug,
          renderHTML: (attrs: Record<string, unknown>) =>
            renderDataAttribute('data-custom-block-slug', attrs.customBlockSlug),
        },
      };

      for (const field of definition.fields) {
        const dataAttributeName = `data-field-${field.key}`;
        const fallback = getFieldDefaultValue(field);

        attributes[field.key] = {
          default: fallback,
          parseHTML: (element: HTMLElement) =>
            parseSerializedAttribute(element.getAttribute(dataAttributeName), fallback),
          renderHTML: (attrs: Record<string, unknown>) =>
            renderDataAttribute(dataAttributeName, attrs[field.key]),
        };
      }

      return attributes;
    },

    parseHTML() {
      return [
        {
          contentElement: '[data-nextblock-custom-block-content]',
          priority: 75,
          tag: `div[data-nextblock-custom-block][data-custom-block-slug="${definition.slug}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          'data-custom-block-node': nodeName,
          'data-nextblock-custom-block': '',
        }),
        ['div', { 'data-nextblock-custom-block-content': '' }, 0],
      ];
    },
  };

  const nodeViewRenderer = options.nodeViewRenderer;
  if (nodeViewRenderer) {
    config.addNodeView = () => nodeViewRenderer(definition);
  }

  return Node.create(config);
}

export function createDynamicCustomBlockExtensions(
  definitions: DynamicCustomBlockEditorDefinition[],
  options: CreateDynamicCustomBlockExtensionOptions = {}
): Extensions {
  return definitions.map((definition) => createDynamicCustomBlockExtension(definition, options));
}
