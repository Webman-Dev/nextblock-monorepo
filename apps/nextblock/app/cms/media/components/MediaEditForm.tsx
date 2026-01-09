// app/cms/media/components/MediaEditForm.tsx
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@nextblock-cms/ui';
import { Spinner, Alert, AlertDescription } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { Textarea } from '@nextblock-cms/ui';
import type { Database } from '@nextblock-cms/db';
import { useAuth } from '@/context/AuthContext';
import { useHotkeys } from '@/hooks/use-hotkeys';

type Media = Database['public']['Tables']['media']['Row'];
import { FileText } from 'lucide-react';

interface MediaEditFormProps {
  mediaItem: Media;
  // The formAction will be updateMediaItem bound with the mediaItem.id
  formAction: (formData: FormData) => Promise<{ error?: string; success?: boolean; media?: Media } | void>;
}

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

export default function MediaEditForm({ mediaItem, formAction }: MediaEditFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { user, isLoading: authLoading, isAdmin, isWriter } = useAuth();

  const [fileName, setFileName] = useState(mediaItem.file_name);
  const [description, setDescription] = useState(mediaItem.description || "");
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');
    if (successMessage) {
      setFormMessage({ type: 'success', text: successMessage });
    } else if (errorMessage) {
      setFormMessage({ type: 'error', text: errorMessage });
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    const formData = new FormData(event.currentTarget);
    // Ensure current values are on the formData if not explicitly set by controlled inputs
    formData.set('file_name', fileName);
    formData.set('description', description);


    startTransition(async () => {
      const result = await formAction(formData);
      if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      } else if (result?.success) {
        setFormMessage({ type: 'success', text: "Media item updated successfully!" });
        // Optionally, update local state if the server returns the updated media item
        if (result.media) {
            setFileName(result.media.file_name);
            setDescription(result.media.description || "");
        }
        router.refresh(); // Refresh server components on the page
      }
    });
  };

  if (authLoading) {
    return <div>Loading form...</div>;
  }
  if (!user || (!isAdmin && !isWriter)) {
    return <div>Access Denied. You do not have permission to edit media.</div>;
  }

  const formRef = React.useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <h2 className="text-lg font-semibold">Media Preview</h2>
        {mediaItem.file_type?.startsWith("image/") ? (
          <Image
            src={`${R2_BASE_URL}/${mediaItem.object_key}`}
            alt={description || fileName}
            width={400}
            height={400}
            className="rounded-lg border object-contain aspect-square w-full max-w-sm mx-auto"
          />
        ) : (
          <div className="aspect-square w-full max-w-sm mx-auto bg-muted rounded-lg flex flex-col items-center justify-center p-4 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-2" /> {/* Using FileText as a generic icon */}
            <p className="text-sm text-muted-foreground">No preview available for this file type.</p>
            <p className="text-xs text-muted-foreground mt-1">({mediaItem.file_type})</p>
          </div>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Object Key:</strong> <span className="font-mono break-all">{mediaItem.object_key}</span></p>
            <p><strong>File Type:</strong> {mediaItem.file_type}</p>
            <p><strong>Size:</strong> {typeof mediaItem.size_bytes === 'number' ? (mediaItem.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</p>
            <p><strong>Uploaded:</strong> {new Date(mediaItem.created_at).toLocaleString()}</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="md:col-span-2 space-y-6">
        {formMessage && (
          <Alert variant={formMessage.type === 'success' ? 'success' : 'destructive'} className="mb-4">
             <AlertDescription>{formMessage.text}</AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="file_name">Display Name</Label>
          <Input
            id="file_name"
            name="file_name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">Description (Alt Text for Images)</Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={4}
            placeholder="e.g., A vibrant sunset over a mountain range"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/cms/media")}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || authLoading}>
            {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Saving...
            </>
          ) : (
            "Update Media Info"
          )}
          </Button>
        </div>
      </form>
    </div>
  );
}