import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';

import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import { getCategoriesWithCount } from '../actions';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '../server-actions';
import { CategoryManager } from './components/CategoryManager';

export async function CategoryManagementPage() {
  const [categories, languages] = await Promise.all([
    getCategoriesWithCount(),
    getActiveLanguagesServerSide(),
  ]);

  return (
    <div className="space-y-8 w-full max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/cms/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Category Management</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage product categories for organizing your e-commerce catalog.
            </p>
          </div>
        </div>
      </div>

      <CategoryManager
        initialCategories={categories}
        createCategory={createCategoryAction}
        updateCategory={updateCategoryAction}
        deleteCategory={deleteCategoryAction}
        languages={languages}
      />
    </div>
  );
}
