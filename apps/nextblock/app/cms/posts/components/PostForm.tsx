// app/cms/posts/components/PostForm.tsx
"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";
import { useAuth } from "@/context/AuthContext";

type Post = Database['public']['Tables']['posts']['Row'];
type PageStatus = Database['public']['Enums']['page_status'];
type Language = Database['public']['Tables']['languages']['Row'];
type Media = Database['public']['Tables']['media']['Row'];
// import MediaGridClient from "@/app/cms/media/components/MediaGridClient"; // Will render a custom grid instead
import MediaImage from "@/app/cms/media/components/MediaImage"; // For displaying images in the modal
import { getMediaItems } from "@/app/cms/media/actions";
import MediaUploadForm from "@/app/cms/media/components/MediaUploadForm";
import { Separator } from "@nextblock-cms/ui";
import { useRef } from "react";
import { useHotkeys } from "@/hooks/use-hotkeys";


interface PostFormProps {
  post?: Post & { feature_image_id?: string | null }; // Assuming feature_image_id can be string
  formAction: (formData: FormData) => Promise<{ error?: string } | void>;
  actionButtonText?: string;
  isEditing?: boolean;
  availableLanguagesProp?: Language[]; // Make optional
  initialFeatureImageUrl?: string | null;
  initialFeatureImageId?: string | null; // Pass initial ID as string
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
  const [languageId, setLanguageId] = useState<string>(
    post?.language_id?.toString() || ""
  );
  const [status, setStatus] = useState<PageStatus>(post?.status || "draft");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [publishedAt, setPublishedAt] = useState<string>(() => {
    if (post?.published_at) {
      try {
        const date = new Date(post.published_at);
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
    return "";
  });
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(
    post?.meta_description || ""
  );

  // Use the passed-in languages directly
  const [availableLanguages] = useState<Language[]>(availableLanguagesProp);

  const [selectedFeatureImage, setSelectedFeatureImage] = useState<{ id: string | null; url: string | null }>({
    id: initialFeatureImageId || post?.feature_image_id || null, // Prioritize prop, then post data
    url: initialFeatureImageUrl || null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaPage, setMediaPage] = useState(1);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Update selectedFeatureImage if initial props change
    setSelectedFeatureImage({
        id: initialFeatureImageId || post?.feature_image_id || null,
        url: initialFeatureImageUrl || null,
    });
  }, [initialFeatureImageId, initialFeatureImageUrl, post?.feature_image_id]);

  const loadMedia = useCallback(async (pageToLoad = 1, append = false) => {
    if (!hasMoreMedia && append && pageToLoad > mediaPage) return;
    setMediaLoading(true);
    setMediaError(null);
    try {
      const result = await getMediaItems(pageToLoad, 20); // Fetch 20 items per page
      if (result.error) {
        setMediaError(result.error);
        if (!append) setMediaItems([]); // Clear if not appending on error
      } else if (result.data) {
        setMediaItems(prev => append ? [...prev, ...(result.data || [])] : (result.data || []));
        setHasMoreMedia(result.hasMore !== undefined ? result.hasMore : false);
        setMediaPage(pageToLoad);
      }
    } catch {
      setMediaError("An unexpected error occurred while fetching media.");
      if (!append) setMediaItems([]);
    } finally {
      setMediaLoading(false);
    }
  }, [hasMoreMedia, mediaPage]);

  // Load initial media when modal is opened
  useEffect(() => {
    if (isModalOpen) {
        // Reset and load fresh if opening modal, or if mediaItems is empty
        if (mediaItems.length === 0 || !hasMoreMedia || mediaPage !==1) {
            setMediaPage(1);
            setHasMoreMedia(true); // Assume there might be more media on fresh open
            loadMedia(1, false);
        }
    }
  }, [isModalOpen, hasMoreMedia, loadMedia, mediaItems.length, mediaPage]);

  const handleImageSelectInModal = (image: Media) => {
    const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL;
    if (!r2BaseUrl) {
      console.error("NEXT_PUBLIC_R2_PUBLIC_URL is not set. Cannot construct image URL.");
      setMediaError("Image server configuration is missing. Cannot display images.");
      return;
    }
    const imageUrl = image.object_key ? `${r2BaseUrl}/${image.object_key}` : null;

    if (!imageUrl) {
        console.error("Selected image does not have an object_key:", image);
        setMediaError("Selected image is missing a valid identifier.");
        return;
    }

    setSelectedFeatureImage({ id: image.id, url: imageUrl }); // image.id is already string (uuid)
    setIsModalOpen(false);
  };


  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');
    if (successMessage) {
      setFormMessage({ type: 'success', text: decodeURIComponent(successMessage) });
    } else if (errorMessage) {
      setFormMessage({ type: 'error', text: decodeURIComponent(errorMessage) });
    }
  }, [searchParams]);

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

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

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
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="mt-1" rows={3} />
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
    
      {/* Feature Image Selection */}
      <div>
        <Label htmlFor="feature_image">Feature Image</Label>
        <Input type="hidden" name="feature_image_id" value={selectedFeatureImage.id || ""} />
        <div className="mt-2">
          {selectedFeatureImage.url && (
            <div className="mb-4">
              <Image
                src={selectedFeatureImage.url}
                alt="Selected feature image"
                width={200}
                height={200}
                className="rounded-md object-cover"
              />
              <Button
                type="button"
                variant="link"
                className="mt-2 text-red-600 px-0"
                onClick={() => setSelectedFeatureImage({ id: null, url: null })}
              >
                Remove Image
              </Button>
            </div>
          )}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                {selectedFeatureImage.id ? "Change Feature Image" : "Select Feature Image"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Select Feature Image</DialogTitle>
              </DialogHeader>
              <div className="p-1">
                <MediaUploadForm
                  returnJustData={true}
                  defaultFolder={`posts/${(slug || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}/`}
                  onUploadSuccess={(newlyUploadedMedia) => {
                    setMediaItems(prevItems => [newlyUploadedMedia, ...prevItems.filter(item => item.id !== newlyUploadedMedia.id)]);
                    handleImageSelectInModal(newlyUploadedMedia);
                  }}
                />
              </div>
              <Separator className="my-4" />
              <div className="py-4 flex-grow overflow-y-auto" id="media-modal-scroll-area">
                {mediaLoading && mediaItems.length === 0 && <p className="text-center text-muted-foreground">Loading media...</p>}
                {mediaError && <p className="text-red-600 text-center">{mediaError}</p>}
                {!mediaLoading && !mediaError && mediaItems.length === 0 && <p className="text-center text-muted-foreground">No media items found. Try uploading some first.</p>}
                
                {mediaItems.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
                    {mediaItems.map((item) => {
                      const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL;
                      if (!r2BaseUrl && item.object_key) {
                         // This check is more for safety, error primarily handled in handleImageSelectInModal
                        if (!mediaError) setMediaError("Image server configuration is missing. Cannot display images.");
                        return null; // Or a placeholder
                      }
                      const imageUrl = item.object_key ? `${r2BaseUrl}/${item.object_key}` : null;

                      // Only render image-type media for selection
                      if (!item.file_type?.startsWith("image/") || !imageUrl) {
                        return null;
                      }

                      return (
                        <div
                          key={item.id}
                          className="group relative border rounded-lg overflow-hidden shadow-sm aspect-square bg-muted/20 transition-all cursor-pointer hover:ring-2 hover:ring-primary"
                          onClick={() => handleImageSelectInModal(item)}
                          onKeyDown={(e) => e.key === 'Enter' && handleImageSelectInModal(item)}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select ${item.file_name}`}
                        >
                          <MediaImage
                            src={imageUrl}
                            alt={item.description || item.file_name}
                            width={item.width || 300} // Provide a fallback or ensure width is always present
                            height={item.height || 300} // Provide a fallback or ensure height is always present
                            blurDataURL={item.blur_data_url}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <p className="text-xs text-white truncate" title={item.file_name}>{item.file_name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!mediaLoading && hasMoreMedia && mediaItems.length > 0 && (
                  <div className="text-center mt-6">
                    <Button onClick={() => loadMedia(mediaPage + 1, true)} variant="outline" disabled={mediaLoading}>
                      {mediaLoading ? <><Spinner className="mr-2 h-4 w-4" /> Loading...</> : "Load More"}
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-auto pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => { setMediaError(null); }}>Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    
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
