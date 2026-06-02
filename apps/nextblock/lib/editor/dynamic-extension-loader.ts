import 'server-only';

import { orderCustomBlockFieldsByLayout } from '@nextblock-cms/utils';

import { getCachedCustomBlockDefinitions } from '../custom-block-definitions';
import type { DynamicCustomBlockEditorDefinition } from './dynamic-extension-core';

export async function loadDynamicCustomBlockExtensionDefinitions(): Promise<
  DynamicCustomBlockEditorDefinition[]
> {
  const definitions = await getCachedCustomBlockDefinitions();

  return definitions.map(({ fields, id, layout_schema, name, slug }) => ({
    // Fields are surfaced in the same order as the layout blueprint so every
    // editor (CMS block editor, front-end draft editor) lists them consistently.
    fields: orderCustomBlockFieldsByLayout(fields, layout_schema),
    id,
    layout_schema,
    name,
    slug,
  }));
}
