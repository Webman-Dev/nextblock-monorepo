// app/cms/navigation/page.tsx
import { createClient } from "@nextblock-cms/db/server";
import Link from "next/link";
import { Button } from "@nextblock-cms/ui";
import { PlusCircle, ListTree } from "lucide-react";
import type { Database } from "@nextblock-cms/db";
import { getActiveLanguagesServerSide } from "@nextblock-cms/db/server";

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'] & { pages?: { slug: string } | null };
type MenuLocation = Database['public']['Enums']['menu_location'];
import NavigationMenuDnd from "./components/NavigationMenuDnd"; // Import the new DND component


// This function fetches ALL navigation items.
// Grouping and hierarchical transformation will happen in the client component.
async function getAllNavigationItems(): Promise<NavigationItem[]> {
  const supabase = createClient();
  const { data: items, error: itemsError } = await supabase
    .from("navigation_items")
    .select("*, pages (slug)") // Fetch linked page slug directly
    .order("menu_key")
    .order("language_id")
    .order("parent_id", { nullsFirst: true })
    .order("order");

  if (itemsError) {
    console.error("Error fetching all navigation items:", itemsError);
    return [];
  }
  return items || [];
}

export default async function CmsNavigationListPage() {
  const allNavItemsFlat = await getAllNavigationItems();
  const allLanguages = await getActiveLanguagesServerSide();

  // Group items by menu_key and then by language_id for passing to NavigationMenuDnd
  const groupedItemsForDnd: Record<string, Record<number, NavigationItem[]>> = {};
  allNavItemsFlat.forEach(item => {
    if (!groupedItemsForDnd[item.menu_key]) {
      groupedItemsForDnd[item.menu_key] = {};
    }
    if (!groupedItemsForDnd[item.menu_key][item.language_id]) {
      groupedItemsForDnd[item.menu_key][item.language_id] = [];
    }
    groupedItemsForDnd[item.menu_key][item.language_id].push(item);
  });

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Navigation</h1>
        <Button variant="default" asChild>
          <Link href="/cms/navigation/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Item
          </Link>
        </Button>
      </div>

      {allNavItemsFlat.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <ListTree className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No navigation items found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new navigation item.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/cms/navigation/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Item
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItemsForDnd).map(([menuKey, langGroups]) => (
            <div key={menuKey}>
              <h2 className="text-xl font-semibold mb-3 capitalize">{menuKey.toLowerCase()} Menus</h2>
              {Object.entries(langGroups).map(([langIdStr, itemsInLang]) => {
                const languageId = parseInt(langIdStr, 10);
                const language = allLanguages.find(l => l.id === languageId);
                if (!language) return null; // Should not happen if data is consistent

                return (
                 <div key={`${menuKey}-${languageId}`} className="mb-6 p-4 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-medium mb-4">Language: {language.name} ({language.code.toUpperCase()})</h3>
                    <NavigationMenuDnd
                        menuKey={menuKey as MenuLocation}
                        languageCode={language.code}
                        initialItems={itemsInLang}
                    />
                 </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}