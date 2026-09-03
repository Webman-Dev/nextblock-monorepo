'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@nextblock-cms/ui';
import SocialPreview from './SocialPreview';

/**
 * The share-card rehearsal, moved behind a button.
 *
 * WHY A MODAL. `SocialPreview` renders three platform tabs above a 1.91:1 card that is up
 * to 520px wide, so inline it costs roughly four hundred vertical pixels in the middle of
 * a page/post settings form that is already long enough to scroll. That is a poor trade for
 * something an author consults once while wording a description and then never looks at
 * again for the rest of the session. Behind a trigger it costs one line, and the moment it
 * IS wanted it gets the whole viewport instead of a squeezed column.
 *
 * WHY THE PRESENTATIONAL COMPONENT STAYS UNTOUCHED. `SocialPreview` knows how three feeds
 * clip a headline and nothing else — no open state, no trigger, no dialog. Keeping that
 * split means the same preview can still be dropped inline anywhere it earns the space
 * (a future site-wide SEO screen, a publish-confirmation step) without having to be
 * unwrapped from a modal first. This component owns the disclosure; that one owns the
 * drawing.
 *
 * WHY IT STAYS LIVE WHILE OPEN. The props below are the caller's live form state, so every
 * keystroke in the meta fields behind the dialog repaints the card — the same behaviour the
 * inline version had. The dialog is a React portal, not a snapshot, so nothing is frozen at
 * open time and there is no "reopen to refresh" trap.
 *
 * NOTHING HERE PERSISTS. This component holds exactly one piece of state — whether the
 * modal is open — and it is read by nobody but Radix. It contributes no form field, no
 * FormData entry, and no input to the caller's autosave diff.
 */
interface SocialPreviewDialogProps {
  description: string;
  imageUrl?: string | null;
  siteName?: string | null;
  title: string;
  /** Optional override for the trigger label, for surfaces that word it differently. */
  triggerLabel?: string;
  url: string;
}

export default function SocialPreviewDialog({
  description,
  imageUrl,
  siteName,
  title,
  triggerLabel = 'Preview share card',
  url,
}: SocialPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      {/* `asChild` so the trigger is the house `Button` rather than a bare Radix button, and
          `type="button"` explicitly: this renders inside the page/post `<form>`, where a
          button that inherits the default `submit` type would save the record instead of
          opening a preview. The visible text is the accessible name, and Radix leaves the
          element a real focusable button, so keyboard and pointer reach it identically. */}
      <DialogTrigger asChild>
        <Button className="h-7 px-2 text-[11px]" size="sm" type="button" variant="outline">
          <Share2 aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      {/* The card is tall and the platform switcher sits above it, so the panel is capped at
          85% of the viewport and the BODY scrolls rather than the dialog growing past the
          screen edge — on a laptop in a browser with devtools open, an uncapped panel would
          push its own close button out of reach. `overflow-hidden` on the shell keeps the
          rounded corners from being cut by the scrolling child. */}
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-[600px]">
        {/* `pr-8` reserves room for the close affordance the dialog draws at top-right. */}
        <DialogHeader className="flex-shrink-0 pb-4 pr-8">
          <DialogTitle>Share preview</DialogTitle>
          <DialogDescription>
            How this link is likely to appear when it is shared. Edit the meta title and
            description behind this dialog and the card updates as you type.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto py-1">
          <SocialPreview
            description={description}
            imageUrl={imageUrl}
            siteName={siteName}
            title={title}
            url={url}
          />
        </div>

        {/* Stated once here rather than repeated on each tab: the numbers in the preview are
            tuned to observed rendering, and every platform reserves the right to reflow. */}
        <p className="flex-shrink-0 pt-3 text-[11px] leading-snug text-muted-foreground">
          Truncation is approximate — each platform reflows link previews on its own terms —
          so treat a card that clips here as a prompt to shorten the copy, not a guarantee.
        </p>
      </DialogContent>
    </Dialog>
  );
}
