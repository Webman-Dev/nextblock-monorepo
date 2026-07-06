// app/cms/posts/components/PostForm.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Label } from "@nextblock-cms/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nextblock-cms/ui";
import { Spinner, Alert, AlertDescription } from "@nextblock-cms/ui";
import { Textarea } from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";
import { useAuth } from '../../../../context/AuthContext';
import FeatureImageField from "../../components/FeatureImageField";

type Post = Database['public']['Tables']['posts']['Row'];
type PageStatus = Database['public']['Enums']['page_status'];
type Language = Database['public']['Tables']['languages']['Row'];
import { useHotkeys } from '../../../../hooks/use-hotkeys';


interface PostFormProps {
  post?: Post & { feature_image_id?: string | null };
  formAction: (formData: FormData) => Promise<{ error?: string } | void>;
  actionButtonText?: string;
  isEditing?: boolean;
  availableLanguagesProp?: Language[]; // Make optional
  initialFeatureImageUrl?: string | null;
  initialFeatureImageId?: string | null;
}

function formatDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export default function PostForm({
  post,
  formAction,
  actionButtonText = "Save Post",
  isEditing = false,
  availableLanguagesProp = [], // Default to empty array
  initialFeatureImageUrl,
  initialFeatureImageId,
}: PostFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { user, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [label, setLabel] = useState(post?.label || "");
  const [languageId, setLanguageId] = useState<string>(
    post?.language_id?.toString() || ""
  );
  const [status, setStatus] = useState<PageStatus>(post?.status || "draft");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [subtitle, setSubtitle] = useState(post?.subtitle || "");
  const [publishedAt, setPublishedAt] = useState<string>(() =>
    formatDateTimeLocal(post?.published_at)
  );
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(
    post?.meta_description || ""
  );
  const [customCanonical, setCustomCanonical] = useState(post?.custom_canonical || "");
  const [featureImageId, setFeatureImageId] = useState<string | null>(
    initialFeatureImageId || post?.feature_image_id || null
  );

  // Use the passed-in languages directly
  const [availableLanguages] = useState<Language[]>(availableLanguagesProp);

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
      setFormMessage({ type: 'success', text: decodeURIComponent(successMessage) });
    } else if (errorMessage) {
      setFormMessage({ type: 'error', text: decodeURIComponent(errorMessage) });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!post) {
      return;
    }

    setTitle(post.title || "");
    setSlug(post.slug || "");
    setLabel(post.label || "");
    setLanguageId(post.language_id?.toString() || "");
    setStatus(post.status || "draft");
    setExcerpt(post.excerpt || "");
    setSubtitle(post.subtitle || "");
    setPublishedAt(formatDateTimeLocal(post.published_at));
    setMetaTitle(post.meta_title || "");
    setMetaDescription(post.meta_description || "");
    setCustomCanonical(post.custom_canonical || "");
    setFeatureImageId(initialFeatureImageId || post.feature_image_id || null);
  }, [
    initialFeatureImageId,
    post?.custom_canonical,
    post?.excerpt,
    post?.id,
    post?.label,
    post?.language_id,
    post?.meta_description,
    post?.meta_title,
    post?.published_at,
    post?.slug,
    post?.status,
    post?.subtitle,
    post?.title,
    post?.updated_at,
  ]);

  // Initialize languageId if creating new post and languages are available
  useEffect(() => {
    if (!isEditing && availableLanguages.length > 0 && !languageId) { // check !isEditing too
      const defaultLang = availableLanguages.find(l => l.is_default) || availableLanguages[0];
      if (defaultLang) {
          setLanguageId(defaultLang.id.toString());
      }
    }
  }, [isEditing, availableLanguages, languageId]); // Add isEditing to dependency array


  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isEditing || !slug) { // Only auto-generate slug if creating new or slug is empty
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
      formData.append("label", label);
      formData.append("status", status);
      formData.append("excerpt", excerpt);
      formData.append("subtitle", subtitle);
      formData.append("published_at", publishedAt);
      formData.append("meta_title", metaTitle);
      formData.append("meta_description", metaDescription);
      formData.append("custom_canonical", customCanonical);
      formData.append("feature_image_id", featureImageId || "");
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

    const dbPublishedAt = formatDateTimeLocal(post?.published_at);

    const hasChanges =
      title !== (post?.title || "") ||
      slug !== (post?.slug || "") ||
      label !== (post?.label || "") ||
      languageId !== (post?.language_id?.toString() || "") ||
      status !== (post?.status || "draft") ||
      excerpt !== (post?.excerpt || "") ||
      subtitle !== (post?.subtitle || "") ||
      publishedAt !== dbPublishedAt ||
      metaTitle !== (post?.meta_title || "") ||
      metaDescription !== (post?.meta_description || "") ||
      customCanonical !== (post?.custom_canonical || "") ||
      featureImageId !== (post?.feature_image_id || null);

    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveDraft();
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    title,
    slug,
    label,
    languageId,
    status,
    excerpt,
    subtitle,
    publishedAt,
    metaTitle,
    metaDescription,
    customCanonical,
    featureImageId,
    post,
    isEditing,
  ]);

  // Remove languagesLoading from this condition
  if (authLoading) {
    return <div>Loading form...</div>;
  }
  if (!user) {
    return <div>Please log in to manage posts.</div>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 w-full mx-auto px-6">
      {isEditing && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/40 mb-2">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground/80">Post Settings</span>
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
      {/* Row 1: Basic Post Information */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Title */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="title" className="text-xs font-medium">Title</Label>
          <Input id="title" name="title" value={title} onChange={handleTitleChange} required className="h-9" />
        </div>

        {/* Slug */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="slug" className="text-xs font-medium">Slug</Label>
          <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="h-9" />
        </div>

        {/* Language */}
        <div className="md:col-span-2 flex flex-col gap-1">
          <Label htmlFor="language_id" className="text-xs font-medium">Language</Label>
          {availableLanguages.length > 0 ? (
            <Select name="language_id" value={languageId} onValueChange={setLanguageId} required disabled={isEditing}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select language" /></SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id.toString()}>{lang.name} ({lang.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-tight py-2">No languages available. Add languages in CMS settings.</p>
          )}
        </div>

        {/* Status */}
        <div className="md:col-span-2 flex flex-col gap-1">
          <Label htmlFor="status" className="text-xs font-medium">Status</Label>
          <Select name="status" value={status} onValueChange={(value) => setStatus(value as PageStatus)} required>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Label + Published At */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Label */}
        <div className="md:col-span-6 flex flex-col gap-1">
          <Label htmlFor="label" className="text-xs font-medium">Label</Label>
          <Input id="label" name="label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" placeholder="e.g. Architecture" />
          <p className="text-[10px] text-muted-foreground leading-tight">Short pill text shown on the article hero and post cards.</p>
        </div>

        {/* Published At */}
        <div className="md:col-span-6 flex flex-col gap-1">
          <Label htmlFor="published_at" className="text-xs font-medium">Published At (Optional)</Label>
          <Input id="published_at" name="published_at" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="h-9" />
          <p className="text-[10px] text-muted-foreground leading-tight">Leave blank to publish immediately when status is &apos;Published&apos;.</p>
        </div>
      </div>

      {/* Row 3: Excerpt + Subtitle */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Excerpt */}
        <div className="md:col-span-6 flex flex-col gap-1">
          <Label htmlFor="excerpt" className="text-xs font-medium">Excerpt</Label>
          <Textarea id="excerpt" name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="resize-y text-sm leading-normal" rows={3} placeholder="Short editorial summary for the hero metadata row and article cards" />
          <p className="text-[10px] text-muted-foreground leading-tight">Used as the short summary above the hero and on public post cards.</p>
        </div>

        {/* Subtitle */}
        <div className="md:col-span-6 flex flex-col gap-1">
          <Label htmlFor="subtitle" className="text-xs font-medium">Subtitle</Label>
          <Textarea id="subtitle" name="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="resize-y text-sm leading-normal" rows={3} placeholder="Longer deck shown under the article title" />
          <p className="text-[10px] text-muted-foreground leading-tight">Displayed as the larger deck under the article title.</p>
        </div>
      </div>

      {/* Row 4: SEO Settings. Canonical override (optional): blank = self-referencing canonical. */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Meta Title */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="meta_title" className="text-xs font-medium">Meta Title (SEO)</Label>
          <Input id="meta_title" name="meta_title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="h-9" />
        </div>

        {/* Meta Description */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="meta_description" className="text-xs font-medium">Meta Description (SEO)</Label>
          <Textarea id="meta_description" name="meta_description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="min-h-[36px] h-9 py-1.5 resize-y text-sm leading-normal" rows={1} placeholder="Meta description for search engines..." />
        </div>

        {/* Canonical URL */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <Label htmlFor="custom_canonical" className="text-xs font-medium">Canonical URL (SEO, optional)</Label>
          <Input id="custom_canonical" name="custom_canonical" value={customCanonical} onChange={(e) => setCustomCanonical(e.target.value)} className="h-9" placeholder="Blank = self-referencing. Absolute https://… URL or /relative path to override." />
        </div>
      </div>

      <FeatureImageField
        initialImageId={initialFeatureImageId || post?.feature_image_id || null}
        initialImageUrl={initialFeatureImageUrl || null}
        onImageIdChange={setFeatureImageId}
        uploadFolder={`posts/${(slug || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}/`}
      />
    
      {!isEditing && (
        <div className="flex justify-end space-x-3 pt-6"> {/* Increased pt for spacing */}
          <Button type="button" variant="outline" onClick={() => router.push("/cms/posts")} disabled={isPending}>Cancel</Button>
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
