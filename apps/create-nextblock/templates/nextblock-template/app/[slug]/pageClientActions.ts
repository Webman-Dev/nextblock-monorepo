'use server';

import { getPageDataBySlug } from './page.utils';

export async function getPublishedPageForLocale(slug: string, localeCode: string) {
  return getPageDataBySlug(slug, localeCode);
}
