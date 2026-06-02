'use client';

import { ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Textarea } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import type { CustomBlockField } from '@nextblock-cms/utils';

import {
  createDynamicCustomBlockExtension,
  createDynamicCustomBlockExtensions as createDynamicCustomBlockCoreExtensions,
  type DynamicCustomBlockEditorDefinition,
} from './dynamic-extension-core';
import {
  DBRelationSelect,
  type DBRelationValue,
} from '../../app/cms/custom-blocks/components/DBRelationSelect';
import {
  ImageR2Picker,
  type ImageR2Value,
} from '../../app/cms/custom-blocks/components/ImageR2Picker';

export type { DynamicCustomBlockEditorDefinition } from './dynamic-extension-core';
export {
  buildDynamicCustomBlockInsertContent,
  getDynamicCustomBlockAttributeNames,
  getDynamicCustomBlockNodeName,
} from './dynamic-extension-core';

function isImageR2Value(value: unknown): ImageR2Value | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ImageR2Value>;
  return typeof candidate.url === 'string' && typeof candidate.object_key === 'string'
    ? (candidate as ImageR2Value)
    : null;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getRelationValue(value: unknown, multiple?: boolean): DBRelationValue {
  if (multiple) {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
  }

  return value === null || value === undefined || value === '' ? null : String(value);
}

function FieldControl({
  field,
  node,
  updateAttributes,
}: {
  field: CustomBlockField;
  node: NodeViewProps['node'];
  updateAttributes: NodeViewProps['updateAttributes'];
}) {
  const fieldValue = node.attrs[field.key];
  const fieldId = `dynamic-custom-block-${node.attrs.customBlockSlug}-${field.key}`;

  if (field.type === 'rich-text') {
    return (
      <div className="space-y-1">
        <Label htmlFor={fieldId} className="text-xs font-medium">
          {field.label}
        </Label>
        <Textarea
          id={fieldId}
          value={getStringValue(fieldValue)}
          onChange={(event) => updateAttributes({ [field.key]: event.target.value })}
          placeholder={field.placeholder}
          className="min-h-24 text-sm"
        />
      </div>
    );
  }

  if (field.type === 'image_r2') {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium">{field.label}</Label>
        <ImageR2Picker
          accept={field.accept}
          maxBytes={field.max_bytes}
          value={isImageR2Value(fieldValue)}
          onChange={(value) => updateAttributes({ [field.key]: value })}
        />
      </div>
    );
  }

  if (field.type === 'db_relation') {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium">{field.label}</Label>
        <DBRelationSelect
          displayColumn={field.display_column}
          filters={field.filters}
          multiple={field.multiple}
          onChange={(value) => updateAttributes({ [field.key]: value })}
          table={field.table}
          value={getRelationValue(fieldValue, field.multiple)}
          valueColumn={field.value_column}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId} className="text-xs font-medium">
        {field.label}
      </Label>
      <Input
        id={fieldId}
        value={getStringValue(fieldValue)}
        onChange={(event) => updateAttributes({ [field.key]: event.target.value })}
        placeholder={field.placeholder}
        className="h-9"
      />
    </div>
  );
}

function DynamicCustomBlockNodeView({
  definition,
  node,
  selected,
  updateAttributes,
}: NodeViewProps & { definition: DynamicCustomBlockEditorDefinition }) {
  return (
    <NodeViewWrapper
      data-drag-handle
      className={[
        'my-4 rounded-md border bg-background text-foreground shadow-sm',
        selected ? 'ring-2 ring-primary ring-offset-2' : '',
      ].join(' ')}
    >
      <div contentEditable={false} className="border-b bg-muted/40 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{definition.name}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {node.attrs.customBlockSlug}
            </p>
          </div>
          <span className="rounded border bg-background px-2 py-1 text-[11px] uppercase text-muted-foreground">
            Custom block
          </span>
        </div>
      </div>

      <div contentEditable={false} className="grid gap-3 p-3 md:grid-cols-2">
        {definition.fields.map((field) => (
          <FieldControl
            key={field.key}
            field={field}
            node={node}
            updateAttributes={updateAttributes}
          />
        ))}
      </div>

      <NodeViewContent className="min-h-12 border-t px-3 py-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
    </NodeViewWrapper>
  );
}

export function createDynamicCustomBlockExtensions(
  definitions: DynamicCustomBlockEditorDefinition[]
) {
  return createDynamicCustomBlockCoreExtensions(definitions, {
    nodeViewRenderer: (definition) =>
      ReactNodeViewRenderer((props) => (
        <DynamicCustomBlockNodeView {...props} definition={definition} />
      )),
  });
}

export function createDynamicCustomBlockExtensionWithNodeView(
  definition: DynamicCustomBlockEditorDefinition
) {
  return createDynamicCustomBlockExtension(definition, {
    nodeViewRenderer: () =>
      ReactNodeViewRenderer((props) => (
        <DynamicCustomBlockNodeView {...props} definition={definition} />
      )),
  });
}
