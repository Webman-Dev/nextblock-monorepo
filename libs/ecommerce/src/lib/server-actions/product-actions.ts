'use server';

import { createClient } from "@nextblock-cms/db/server";
import { fetchTranslatedProductsForCartInternal } from "../product-actions";

export async function getTranslatedProductsForCart(
  translationGroupIds: string[],
  languageCode: string,
  skus: string[] = []
) {
  const supabase = createClient();
  const { data, error } = await fetchTranslatedProductsForCartInternal(
    supabase,
    translationGroupIds,
    languageCode,
    skus
  );
  
  if (error) {
    console.error("[getTranslatedProductsForCart] Error:", error);
    return [];
  }

  return data || [];
}
