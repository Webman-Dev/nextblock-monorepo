// app/cms/pages/components/PageForm.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nextblock-cms/ui";
import { Spinner, Alert, AlertDescription } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Label } from "@nextblock-cms/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nextblock-cms/ui";
import { Textarea } from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";
import { useAuth } from '../../../../context/AuthContext';
import { useHotkeys } from '../../../../hooks/use-hotkeys';
import FeatureImageField from "../../components/FeatureImageField";

type Page = Database['public']['Tables']['pages']['Row'];
type PageStatus = Database['public']['Enums']['page_status'];
type Language = Database['public']['Tables']['languages']['Row'];
// Remove: import { getActiveLanguagesClientSide } from "@nextblock-cms/db";

interface PageFormProps {
  page?: (Page & { feature_image_id?: string | null }) | null;
  formAction: (formData: FormData) => Promise<{ error?: string } | void>;
  actionButtonText?: string;
  isEditing?: boolean;
  availableLanguagesProp: Language[]; // New prop
  translationGroupId?: string;
  target_lang_id?: string;
  initialFeatureImageUrl?: string | null;
  initialFeatureImageId?: string | null;
}

export default function PageForm({
  page,
  formAction,
  actionButtonText = "Save Page",
  isEditing = false,
  availableLanguagesProp, // Use the new prop
  translationGroupId,
  target_lang_id,
  initialFeatureImageUrl,
  initialFeatureImageId,
}: PageFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { user, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState(page?.title || "");
  const [slug, setSlug] = useState(page?.slug || "");
  const [languageId, setLanguageId] = useState<string>(() => {
    // If editing, use the page's language
    if (page?.language_id) {
      return page.language_id.toString();
    }
    // If creating a translation, use the target language
    if (target_lang_id) {
      return target_lang_id;
    }
    // Otherwise, find the default language from the available languages
    if (availableLanguagesProp && availableLanguagesProp.length > 0) {
      const defaultLang = availableLanguagesProp.find((l) => l.is_default);
      if (defaultLang) {
        return defaultLang.id.toString();
      }
      // As a fallback, use the first available language
      return availableLanguagesProp[0].id.toString();
    }
    // If no languages are available, default to an empty string
    return "";
  });
  const [status, setStatus] = useState<PageStatus>(page?.status || "draft");
  const [metaTitle, setMetaTitle] = useState(page?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(
    page?.meta_description || ""
  );
  const [customCanonical, setCustomCanonical] = useState(page?.custom_canonical || "");
  const [featureImageId, setFeatureImageId] = useState<string | null>(
    initialFeatureImageId || page?.feature_image_id || null
  );

  // Use the passed-in languages
  const [availableLanguages] = useState<Language[]>(availableLanguagesProp);
  // languagesLoading is no longer needed if languages are passed as props
  // const [languagesLoading, setLanguagesLoading] = useState(true); // Remove or set to false initially

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isFirstRender = useRef(true);

  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');
    if (successMessage) {
      setFormMessage({ type: 'success', text: successMessage });
    } else if (errorMessage) {
      setFormMessage({ type: 'error', text: errorMessage });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!page) {
      return;
    }

    setTitle(page.title || "");
    setSlug(page.slug || "");
    setLanguageId(page.language_id?.toString() || "");
    setStatus(page.status || "draft");
    setMetaTitle(page.meta_title || "");
    setMetaDescription(page.meta_description || "");
    setCustomCanonical(page.custom_canonical || "");
    setFeatureImageId(initialFeatureImageId || page.feature_image_id || null);
  }, [
    initialFeatureImageId,
    page?.id,
    page?.custom_canonical,
    page?.language_id,
    page?.meta_description,
    page?.meta_title,
    page?.slug,
    page?.status,
    page?.title,
    page?.updated_at,
  ]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isEditing || !slug) {
      setSlug(newTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, ""));
    }
  };

  const saveDraft = async (customFormData?: FormData) => {
    if (!title.trim() || !slug.trim()) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    const formData = customFormData || (formRef.current ? new FormData(formRef.current) : new FormData());
    if (!customFormData && !formRef.current) {
      formData.append("title", title);
      formData.append("slug", slug);
      formData.append("language_id", languageId);
      formData.append("status", status);
      formData.append("meta_title", metaTitle);
      formData.append("meta_description", metaDescription);
      formData.append("custom_canonical", customCanonical);
      formData.append("feature_image_id", featureImageId || "");
      if (translationGroupId) {
        formData.append("translation_group_id", translationGroupId);
      }
    }

    try {
      const result = await formAction(formData);
      if (result && 'error' in result && result.error) {
        setSaveError(result.error);
        setFormMessage({ type: 'error', text: result.error });
      } else {
        setLastSaved(new Date());
        setFormMessage(null);
        router.refresh();
      }
    } catch (err: any) {
      const msg = err.message || "Failed to save draft";
      setSaveError(msg);
      setFormMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditing) {
      setFormMessage(null);
      const formData = new FormData(event.currentTarget);

      startTransition(async () => {
        const result = await formAction(formData);
        if (result?.error) {
          setFormMessage({ type: 'error', text: result.error });
        }
      });
    } else {
      await saveDraft();
    }
  };

  useEffect(() => {
    if (!isEditing) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const hasChanges =
      title !== (page?.title || "") ||
      slug !== (page?.slug || "") ||
      languageId !== (page?.language_id?.toString() || "") ||
      status !== (page?.status || "draft") ||
      metaTitle !== (page?.meta_title || "") ||
      metaDescription !== (page?.meta_description || "") ||
      customCanonical !== (page?.custom_canonical || "") ||
      featureImageId !== (page?.feature_image_id || null);

    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveDraft();
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, slug, languageId, status, metaTitle, metaDescription, featureImageId, page, isEditing]);

  // Removed languagesLoading from this condition
  if (authLoading) {
    return <div>Loading form...</div>;
  }

  if (!user) {
    return <div>Please log in to manage pages.</div>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 w-full mx-auto px-6">
      {isEditing && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/40 mb-2">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground/80">Page Settings</span>
          <div className="flex items-center gap-1.5 min-h-[16px]">
            {isSaving ? (
              <>
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </div>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Autosaving settings...</span>
              </>
            ) : saveError ? (
              <span className="text-red-500 font-medium">Error saving settings: {saveError}</span>
            ) : lastSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Settings autosaved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : (
              <span className="text-muted-foreground/60">Settings autosave in draft mode</span>
            )}
          </div>
        </div>
      )}
      {formMessage && (
        <Alert variant={formMessage.type === 'success' ? 'success' : 'destructive'} className="mb-4">
           <AlertDescription>{formMessage.text}</AlertDescription>
        </Alert>
      )}
      {translationGroupId && (
        <input type="hidden" name="translation_group_id" value={translationGroupId} />
      )}

      {/* Row 1: Basic Page Information */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Title */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="title" className="text-xs font-medium">Title</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={handleTitleChange}
            required
            className="h-9"
          />
        </div>

        {/* Slug */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="slug" className="text-xs font-medium">Slug</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight truncate" title="URL-friendly identifier. Auto-generated from title if left empty on creation.">
            URL-friendly identifier. Auto-generated from title if left empty.
          </p>
        </div>

        {/* Language */}
        <div className="md:col-span-2 flex flex-col gap-1">
          <Label htmlFor="language_id" className="text-xs font-medium">Language</Label>
          {availableLanguages.length > 0 ? (
            <Select
              name="language_id"
              defaultValue={target_lang_id}
              value={languageId}
              onValueChange={setLanguageId}
              required
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id.toString()}>
                    {lang.name} ({lang.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground py-2 leading-none">No languages available.</p>
          )}
        </div>

        {/* Status */}
        <div className="md:col-span-2 flex flex-col gap-1">
          <Label htmlFor="status" className="text-xs font-medium">Status</Label>
          <Select
            name="status"
            value={status}
            onValueChange={(value) => setStatus(value as PageStatus)}
            required
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: SEO Settings. Canonical override (optional): blank = self-referencing canonical. */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Meta Title */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="meta_title" className="text-xs font-medium">Meta Title (SEO)</Label>
          <Input
            id="meta_title"
            name="meta_title"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Meta Description */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="meta_description" className="text-xs font-medium">Meta Description (SEO)</Label>
          <Textarea
            id="meta_description"
            name="meta_description"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="min-h-[36px] h-9 py-1.5 resize-y text-sm leading-normal"
            rows={1}
            placeholder="Meta description for search engines..."
          />
        </div>

        {/* Canonical URL */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="custom_canonical" className="text-xs font-medium">Canonical URL (SEO, optional)</Label>
          <Input
            id="custom_canonical"
            name="custom_canonical"
            value={customCanonical}
            onChange={(e) => setCustomCanonical(e.target.value)}
            className="h-9"
            placeholder="Blank = self-referencing. Absolute https://… URL or /relative path to override."
          />
        </div>
      </div>

      <FeatureImageField
        initialImageId={initialFeatureImageId || page?.feature_image_id || null}
        initialImageUrl={initialFeatureImageUrl || null}
        onImageIdChange={setFeatureImageId}
        uploadFolder={`pages/${(slug || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}/`}
      />

      {!isEditing && (
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/cms/pages")}
            disabled={isPending}
          >
            Cancel
          </Button>
          {/* Ensure button is not disabled due to removed languagesLoading */}
          <Button type="submit" disabled={isPending || authLoading || availableLanguages.length === 0}>
            {isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Saving...
              </>
            ) : (
              actionButtonText
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
