// app/cms/navigation/[id]/edit/page.tsx
import React from "react";
import { createClient } from "@nextblock-cms/db/server";
import NavigationItemForm from "../../components/NavigationItemForm";
import { updateNavigationItem } from "../../actions";
import { getLanguages, getNavigationItems, getPages } from "../../utils";
import type { Database } from "@nextblock-cms/db";
import { notFound, redirect } from "next/navigation";

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
import Link from "next/link";
import { Button } from "@nextblock-cms/ui";
import { ArrowLeft } from "lucide-react";
import NavigationLanguageSwitcher from "../../components/NavigationLanguageSwitcher";

async function getNavigationItemData(id: number): Promise<NavigationItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("navigation_items")
    .select("*") // Ensure translation_group_id is selected
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching navigation item for edit:", error);
    return null;
  }
  return data;
}

export default async function EditNavigationItemPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const itemId = parseInt(params.id, 10);
  if (isNaN(itemId)) {
    return notFound();
  }

  // Admin check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/sign-in?redirect=/cms/navigation/${itemId}/edit`);

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'ADMIN') {
      return <div className="p-6 text-center text-red-500">Access Denied. Admin privileges required.</div>;
  }

  const [item, allLanguages, allNavItems, allPages] = await Promise.all([
    getNavigationItemData(itemId),
    getLanguages(),
    getNavigationItems(),
    getPages(),
  ]);

  if (!item) {
    return notFound();
  }
   if (!item.translation_group_id) {
    // This case should ideally not happen if all items get a translation_group_id upon creation.
    // Handle gracefully, perhaps by redirecting or showing an error.
    console.error(`Navigation item ${item.id} is missing a translation_group_id.`);
    // For now, let's allow editing but the switcher might not work as expected.
    // Or, redirect to a page that explains the issue / offers to assign one.
  }


  const updateItemWithId = updateNavigationItem.bind(null, itemId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Back to navigation items" asChild>
                <Link href="/cms/navigation">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-semibold">Edit Navigation Item</h1>
                <p className="text-sm text-muted-foreground truncate max-w-xs" title={item.label}>{item.label}</p>
            </div>
        </div>
        {item.translation_group_id && allLanguages.length > 0 && (
          <NavigationLanguageSwitcher
            currentItem={item}
            allSiteLanguages={allLanguages}
          />
        )}
      </div>
      <NavigationItemForm
        item={item}
        formAction={updateItemWithId}
        actionButtonText="Update Item"
        isEditing={true}
        languages={allLanguages}
        parentItems={allNavItems}
        pages={allPages}
      />
    </div>
  );
}
