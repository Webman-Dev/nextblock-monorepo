'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, FolderPlus, FolderKanban, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
} from '@nextblock-cms/ui';

interface Language {
  id: number;
  code: string;
  name: string;
  is_default: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  productCount: number;
  name_translations?: Record<string, string> | null;
  description_translations?: Record<string, string> | null;
}

interface CategoryManagerProps {
  initialCategories: CategoryItem[];
  languages: Language[];
  createCategory: (input: {
    name: string;
    slug?: string;
    description?: string;
    nameTranslations?: Record<string, string>;
    descriptionTranslations?: Record<string, string>;
  }) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (
    id: string,
    input: {
      name: string;
      slug?: string;
      description?: string;
      nameTranslations?: Record<string, string>;
      descriptionTranslations?: Record<string, string>;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function CategoryManager({
  initialCategories = [],
  languages = [],
  createCategory,
  updateCategory,
  deleteCategory,
}: CategoryManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [isPending, setIsPending] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({});
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [isSlugManual, setIsSlugManual] = useState(false);

  const translatableLanguages = (languages || []).filter((lang) => !lang.is_default);

  // Sync state if initialCategories change
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Slugify helper
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Handle auto-slugification when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManual && !editingCategory) {
      setSlug(slugify(val));
    }
  };

  // Handle manual slug changes
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(slugify(e.target.value));
    setIsSlugManual(true);
  };

  // Select category for editing
  const startEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setNameTranslations(cat.name_translations || {});
    setDescriptionTranslations(cat.description_translations || {});
    setIsSlugManual(true);
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setNameTranslations({});
    setDescriptionTranslations({});
    setIsSlugManual(false);
  };

  // Handle Form submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    setIsPending(true);
    const toastId = toast.loading(
      editingCategory ? 'Updating category...' : 'Creating category...'
    );

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        nameTranslations,
        descriptionTranslations,
      };

      let res;
      if (editingCategory) {
        res = await updateCategory(editingCategory.id, payload);
      } else {
        res = await createCategory(payload);
      }

      if (res.success) {
        toast.success(
          editingCategory
            ? 'Category updated successfully!'
            : 'Category created successfully!',
          { id: toastId }
        );
        cancelEdit();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save category.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.', { id: toastId });
    } finally {
      setIsPending(false);
    }
  };

  // Handle delete action
  const handleDelete = async (cat: CategoryItem) => {
    const confirmMessage = `Are you sure you want to delete the category "${cat.name}"? This will detach it from any assigned products.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsPending(true);
    const toastId = toast.loading('Deleting category...');

    try {
      const res = await deleteCategory(cat.id);
      if (res.success) {
        toast.success('Category deleted successfully!', { id: toastId });
        if (editingCategory?.id === cat.id) {
          cancelEdit();
        }
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete category.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.', { id: toastId });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-12 items-start">
      {/* Left Column: Form */}
      <div className="md:col-span-4 space-y-4">
        <Card className="p-5 shadow-lg border-t-4 border-t-amber-500 bg-card/65 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <FolderPlus className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold tracking-tight">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">
                Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. T-Shirts"
                value={name}
                onChange={handleNameChange}
                disabled={isPending}
                className="h-8 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="slug" className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none flex items-center justify-between w-full">
                <span>Slug</span>
                {!isSlugManual && !editingCategory && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 capitalize">Auto-generating</span>
                )}
              </Label>
              <Input
                id="slug"
                placeholder="e.g. t-shirts"
                value={slug}
                onChange={handleSlugChange}
                disabled={isPending}
                className="h-8 text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs uppercase font-bold text-muted-foreground tracking-wider leading-none">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional description of the category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                className="text-sm min-h-[90px] resize-none"
              />
            </div>

            {translatableLanguages.length > 0 && (
              <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
                <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Translations</h3>
                {translatableLanguages.map((lang) => (
                  <div key={lang.code} className="space-y-3 p-3 rounded-md bg-muted/30 border border-border/30">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{lang.name}</span>
                    <div className="space-y-1">
                      <Label htmlFor={`name-${lang.code}`} className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Name ({lang.code})</Label>
                      <Input
                        id={`name-${lang.code}`}
                        placeholder={`Translation for ${name || 'Name'}`}
                        value={nameTranslations[lang.code] || ''}
                        onChange={(e) => setNameTranslations(prev => ({ ...prev, [lang.code]: e.target.value }))}
                        disabled={isPending}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`desc-${lang.code}`} className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Description ({lang.code})</Label>
                      <Textarea
                        id={`desc-${lang.code}`}
                        placeholder={`Translation for Description`}
                        value={descriptionTranslations[lang.code] || ''}
                        onChange={(e) => setDescriptionTranslations(prev => ({ ...prev, [lang.code]: e.target.value }))}
                        disabled={isPending}
                        className="text-sm min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-600/10 h-8 text-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingCategory ? (
                  'Update Category'
                ) : (
                  'Create Category'
                )}
              </Button>
              {editingCategory && (
                <Button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isPending}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-dashed cursor-pointer"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* Right Column: Listing Table */}
      <div className="md:col-span-8">
        <Card className="p-4 shadow-lg bg-card/65 backdrop-blur-md border border-border/40">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-base font-bold tracking-tight">Active Categories</h2>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Categories are shared globally across languages.
              </p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-border/60 rounded-lg bg-muted/20 animate-in fade-in duration-300">
              <HelpCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-bold text-muted-foreground">No Categories Found</h3>
              <p className="text-xs text-muted-foreground/80 max-w-sm mt-1">
                Add your first category using the form on the left to start organizing your catalog products.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-background/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground/85 select-none">
                    <th className="p-3 pl-4">Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3 text-center">Products</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-muted/10 transition-colors group"
                    >
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {cat.name}
                        </div>
                        {cat.description && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate leading-normal" title={cat.description}>
                            {cat.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <code className="px-1.5 py-0.5 rounded bg-muted/65 font-mono text-[10px]">
                          /{cat.slug}
                        </code>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/15">
                          {cat.productCount}
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={isPending}
                            onClick={() => startEdit(cat)}
                            className="h-7 w-7 opacity-85 hover:opacity-100 group-hover:border-amber-500/30 cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={isPending}
                            onClick={() => handleDelete(cat)}
                            className="h-7 w-7 opacity-85 hover:opacity-100 group-hover:border-red-500/30 cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
