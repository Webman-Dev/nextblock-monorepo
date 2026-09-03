'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@nextblock-cms/ui';

import { buildCortexAiRequestHeaders } from '../../lib/cortex-ai/sandbox-headers';

/**
 * The four strings `/api/ai/seo/metadata` writes back.
 *
 * Note what is NOT here: an image. The Open Graph image on a page or post is derived from
 * `feature_image_id`, and nothing in this flow changes that. The model writes copy; the
 * operator picks the picture.
 */
export interface GeneratedSeoMetadata {
  metaDescription: string;
  metaTitle: string;
  ogDescription: string;
  ogTitle: string;
}

interface GenerateMetaButtonProps {
  /**
   * Body prose the model reads in order to write about the page. The caller flattens its
   * blocks; an empty string disables the button, because a model asked to summarize
   * nothing invents something, and invented metadata is worse than none.
   */
  content: string;
  /** Optional term the copy should be built around, when the caller knows one. */
  focusKeyword?: string | null;
  /** Language code (`en`, `fr`, …) so the copy comes back in the content's language. */
  locale?: string | null;
  onGenerated: (result: GeneratedSeoMetadata) => void;
  /** Site title, when cheaply available, so the model can shape a title that suffixes well. */
  siteTitle?: string | null;
  /** The page's own title — the strongest single hint about what the page is. */
  title?: string | null;
}

/**
 * Guard against a mistake that would otherwise be silent: if the route ever answers 200
 * with a partial body, writing `undefined` into a controlled input flips it to
 * uncontrolled and React warns once, at runtime, in a place far from the cause. Coercing
 * here means a malformed response degrades to empty strings the operator can see.
 */
function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

export default function GenerateMetaButton({
  content,
  focusKeyword,
  locale,
  onGenerated,
  siteTitle,
  title,
}: GenerateMetaButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const trimmedContent = content.trim();
  const canGenerate = trimmedContent.length > 0 && !isGenerating;

  const handleGenerate = async () => {
    if (!canGenerate) {
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/seo/metadata', {
        // Optional fields are omitted rather than sent as null: the contract types them
        // as `string | undefined`, and a null would be a different, likely rejected, value.
        body: JSON.stringify({
          content: trimmedContent,
          ...(focusKeyword?.trim() ? { focusKeyword: focusKeyword.trim() } : {}),
          ...(locale?.trim() ? { locale: locale.trim() } : {}),
          ...(siteTitle?.trim() ? { siteTitle: siteTitle.trim() } : {}),
          ...(title?.trim() ? { title: title.trim() } : {}),
        }),
        headers: buildCortexAiRequestHeaders(),
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok || !payload) {
        // Every error shape from these routes is `{ error: string }` at 400/403/500, so a
        // missing `error` means something upstream of the route failed (a proxy, a crash
        // before the handler) and a generic message is the honest thing to show.
        const message =
          payload && typeof payload['error'] === 'string'
            ? (payload['error'] as string)
            : 'Cortex AI could not generate metadata.';
        throw new Error(message);
      }

      onGenerated({
        metaDescription: readString(payload, 'metaDescription'),
        metaTitle: readString(payload, 'metaTitle'),
        ogDescription: readString(payload, 'ogDescription'),
        ogTitle: readString(payload, 'ogTitle'),
      });
      toast.success('Cortex AI drafted your SEO metadata.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cortex AI could not generate metadata.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      className="h-7 gap-1.5 px-2 text-[11px]"
      disabled={!canGenerate}
      onClick={handleGenerate}
      size="sm"
      title={
        trimmedContent
          ? 'Draft the meta title and description from this page’s content'
          : 'Add some content to this page first — Cortex AI needs something to summarize'
      }
      type="button"
      variant="outline"
    >
      {isGenerating ? (
        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" />
      )}
      {isGenerating ? 'Generating…' : 'Generate Meta Data with AI'}
    </Button>
  );
}
