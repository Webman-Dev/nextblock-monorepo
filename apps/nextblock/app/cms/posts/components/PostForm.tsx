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

  // Use the passed-in languages directly
  const [availableLanguages] = useState<Language[]>(availableLanguagesProp);

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
  }, [
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await formAction(formData);
      if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      }
      // Success is handled by redirect with query param in server action
    });
  };

  // Remove languagesLoading from this condition
  if (authLoading) {
    return <div>Loading form...</div>;
  }
  if (!user) {
    return <div>Please log in to manage posts.</div>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 w-full mx-auto px-6">
      {formMessage && (
        <Alert variant={formMessage.type === 'success' ? 'success' : 'destructive'} className="mb-4">
           <AlertDescription>{formMessage.text}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" value={title} onChange={handleTitleChange} required className="mt-1" />
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="mt-1" />
      </div>

      <div>
        <Label htmlFor="language_id">Language</Label>
        {availableLanguages.length > 0 ? (
        <Select name="language_id" value={languageId} onValueChange={setLanguageId} required disabled={isEditing}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select language" /></SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.id} value={lang.id.toString()}>{lang.name} ({lang.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        ) : (
           <p className="text-sm text-muted-foreground mt-1">No languages available. Please add languages in CMS settings.</p>
        )}
      </div>

      <div>
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1"
          placeholder="e.g. Architecture"
        />
        <p className="text-xs text-muted-foreground mt-1">Short pill text shown on the article hero and post cards.</p>
      </div>

      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="mt-1"
          rows={3}
          placeholder="Short editorial summary for the hero metadata row and article cards"
        />
        <p className="text-xs text-muted-foreground mt-1">Used as the short summary above the hero and on public post cards.</p>
      </div>

      <div>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Textarea
          id="subtitle"
          name="subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="mt-1"
          rows={4}
          placeholder="Longer deck shown under the article title"
        />
        <p className="text-xs text-muted-foreground mt-1">Displayed as the larger deck under the article title.</p>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select name="status" value={status} onValueChange={(value) => setStatus(value as PageStatus)} required>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="published_at">Published At (Optional)</Label>
        <Input
          id="published_at"
          name="published_at"
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          className="mt-1"
        />
         <p className="text-xs text-muted-foreground mt-1">Leave blank to publish immediately when status is &apos;Published&apos;.</p>
      </div>

      <div>
        <Label htmlFor="meta_title">Meta Title (SEO)</Label>
        <Input id="meta_title" name="meta_title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="meta_description">Meta Description (SEO)</Label>
        <Textarea id="meta_description" name="meta_description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="mt-1" rows={3} />
      </div>
    
      <FeatureImageField
        initialImageId={initialFeatureImageId || post?.feature_image_id || null}
        initialImageUrl={initialFeatureImageUrl || null}
        uploadFolder={`posts/${(slug || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}/`}
      />
    
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
    </form>
  );
}
