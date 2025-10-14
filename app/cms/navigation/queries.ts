import { createClient } from "@nextblock-cms/db/server";
import { unstable_noStore } from "next/cache";
import type { Database } from "@nextblock-cms/db";

export type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
export type MenuLocation = Database['public']['Enums']['menu_location'];

// Fetches navigation items for a specific menu and language (used by public site Header/Footer)
export async function getNavigationMenu(menuKey: MenuLocation, languageCode: string): Promise<NavigationItem[]> {
  const supabase = createClient(); // server client
  unstable_noStore(); // Opt out of caching for this function

  const { data: language, error: langError } = await supabase
    .from("languages")
    .select("id")
    .eq("code", languageCode)
    .single();

  if (langError || !language) {
    console.error(`Error fetching language ID for code ${languageCode} in getNavigationMenu:`, langError);
    return [];
  }

  const languageId = language.id;

  const { data: items, error: itemsError } = await supabase
    .from("navigation_items")
    .select("*, pages(slug)") // Select all fields, including translation_group_id and linked page slug
    .eq("menu_key", menuKey)
    .eq("language_id", languageId)
    .order("parent_id", { nullsFirst: true })
    .order("order");

  if (itemsError) {
    console.error(`Error fetching navigation items for ${menuKey} (${languageCode}):`, itemsError);
    return [];
  }
  return (items || []).map(item => ({ ...item, id: Number(item.id) }));
}
