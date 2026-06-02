import React from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import {
  DynamicLayoutEngine,
  type DynamicLayoutEngineProps,
  DYNAMIC_LAYOUT_ENGINE_CACHE_TAG,
  getDynamicLayoutDefinitionCacheTag,
} from './DynamicLayoutEngine';

export async function CachedDynamicLayoutEngine(props: DynamicLayoutEngineProps) {
  // 'use cache';
  // cacheLife('minutes');
  // cacheTag(DYNAMIC_LAYOUT_ENGINE_CACHE_TAG);

  // for (const tag of props.cacheTags ?? []) {
  //   cacheTag(tag);
  // }

  // if (props.definition?.id) {
  //   cacheTag(getDynamicLayoutDefinitionCacheTag(props.definition.id));
  // }

  // if (props.definition?.slug) {
  //   cacheTag(getDynamicLayoutDefinitionCacheTag(props.definition.slug));
  // }

  return <DynamicLayoutEngine {...props} />;
}
