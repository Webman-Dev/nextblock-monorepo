// app/cms/navigation/new/page.tsx
import NavigationItemForm from "../components/NavigationItemForm";
import { createNavigationItem } from "../actions";
import { getLanguages, getNavigationItems, getPages } from "../utils";

export default async function NewNavigationItemPage() {
  const [languages, navigationItems, pages] = await Promise.all([
    getLanguages(),
    getNavigationItems(),
    getPages(),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Navigation Item</h1>
      <NavigationItemForm
        formAction={createNavigationItem}
        actionButtonText="Create Item"
        isEditing={false}
        languages={languages}
        parentItems={navigationItems}
        pages={pages}
      />
    </div>
  );
}
