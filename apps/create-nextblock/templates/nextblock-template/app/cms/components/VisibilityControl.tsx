"use client";

/**
 * Top-bar visibility control for pages, posts and products.
 *
 * This is the only place in the CMS that can change what the public sees. It is
 * deliberately NOT part of the content form: editing settings autosaves into the
 * Live Draft, while publishing writes straight to the row. Two decisions, two
 * controls — see `app/actions/visibilityActions.ts`.
 *
 * The pill is read-only on purpose. A <select> implies every option is equivalent
 * and instantly applied, which is exactly the behaviour this replaces; naming the
 * transitions as verbs in a menu lets each one carry its own confirmation.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
} from "@nextblock-cms/ui";
import {
  LIVE_STATUS,
  resolveVisibilityState,
  type PublishableType,
  type VisibilityState,
} from "@nextblock-cms/utils";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Link2,
  Loader2,
  Archive,
  EyeOff,
  Globe,
} from "lucide-react";
import {
  getSiblingVisibility,
  setContentVisibility,
  type SiblingVisibility,
  type VisibilityIntent,
} from "../../actions/visibilityActions";
import { publishVisualEditingDraft, publishVisualEditingProductDraft } from "../../actions/visualEditingActions";

interface LanguageOption {
  id: number;
  name: string;
  code: string;
}

export interface VisibilityControlProps {
  type: PublishableType;
  id: number | string;
  /** Live row status — never the draft overlay. */
  status: string;
  /** Live row published_at; a future value means "scheduled". */
  publishedAt: string | null;
  /** Root-relative public URL, e.g. "/about" or "/article/hello". */
  publicPath: string;
  /** Display name of the language this row is written in. */
  languageName?: string;
  translationGroupId?: string | null;
  languages?: LanguageOption[];
  /** True when unpublished content edits exist in the Live Draft. */
  hasDraft?: boolean;
  /**
   * A caution to show before this content goes public — e.g. a product whose payment
   * provider isn't configured, which publishes fine but cannot be bought yet. Shown
   * verbatim as an amber callout in the publish and schedule dialogs; it never blocks
   * the action, so write it as a consequence the editor can weigh, not a refusal.
   */
  publishWarning?: string | null;
}

const STATE_LABEL: Record<VisibilityState, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const STATE_STYLE: Record<VisibilityState, string> = {
  draft:
    "border-border bg-muted text-muted-foreground",
  scheduled:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  published:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  archived:
    "border-dashed border-border bg-transparent text-muted-foreground",
};

const DOT_STYLE: Record<VisibilityState, string> = {
  draft: "bg-muted-foreground/70",
  scheduled: "bg-amber-500",
  published: "bg-emerald-500",
  archived: "bg-muted-foreground/50",
};

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in LOCAL time, not an ISO string. */
function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function defaultScheduleValue(): string {
  const soon = new Date();
  soon.setDate(soon.getDate() + 1);
  soon.setMinutes(0, 0, 0);
  return toDateTimeLocal(soon.toISOString());
}

export default function VisibilityControl({
  type,
  id,
  status,
  publishedAt,
  publicPath,
  languageName,
  translationGroupId,
  languages = [],
  hasDraft = false,
  publishWarning = null,
}: VisibilityControlProps) {
  const router = useRouter();
  const liveStatus = LIVE_STATUS[type];
  const state = resolveVisibilityState({ status, publishedAt, liveStatus });

  const [dialog, setDialog] = React.useState<null | "publish" | "schedule" | "unpublish" | "archive">(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [alsoPublishDraft, setAlsoPublishDraft] = React.useState(true);
  const [scheduleValue, setScheduleValue] = React.useState(() => toDateTimeLocal(publishedAt) || defaultScheduleValue());
  const [siblings, setSiblings] = React.useState<SiblingVisibility[] | null>(null);

  // The schedule date is formatted in the viewer's timezone, which the server
  // doesn't know — render it only after mount so the two never disagree.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const scheduleLabel = React.useMemo(() => {
    if (!mounted || !publishedAt) return null;
    const date = new Date(publishedAt);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }, [mounted, publishedAt]);

  const label = state === "scheduled" && scheduleLabel ? `Goes live ${scheduleLabel}` : STATE_LABEL[state];

  const languageNameById = React.useMemo(
    () => new Map(languages.map((language) => [language.id, `${language.name} (${language.code.toUpperCase()})`])),
    [languages]
  );

  const openPublishDialog = React.useCallback(() => {
    // A warning is not an error: seeding it into `error` renders it destructive-red and
    // `run()` clears it on the next attempt. It belongs in the dialog body instead.
    setError(null);
    setAlsoPublishDraft(true);
    setSiblings(null);
    setDialog("publish");

    if (translationGroupId) {
      void getSiblingVisibility(type, translationGroupId, id).then(setSiblings);
    }
  }, [id, translationGroupId, type]);

  const run = async (intent: VisibilityIntent, opts?: { publishDraft?: boolean }) => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await setContentVisibility(type, id, intent);
      if (result.error) {
        setError(result.error);
        return;
      }

      // Publishing the row and publishing pending edits are separate operations;
      // the dialog offers to do both so a never-live page doesn't go public
      // showing content the editor has already replaced.
      if (opts?.publishDraft && hasDraft) {
        const draftResult =
          type === "product"
            ? await publishVisualEditingProductDraft(String(id))
            : await publishVisualEditingDraft(type, Number(id));

        if (draftResult && "error" in draftResult && draftResult.error) {
          toast.error(`Visibility updated, but the edits didn't publish: ${draftResult.error}`);
          setDialog(null);
          router.refresh();
          return;
        }

        // Partial success: the edits went live but the revision didn't record.
        if (draftResult && "success" in draftResult && draftResult.warning) {
          toast.error(draftResult.warning, { duration: 8000 });
        }
      }

      toast.success(
        intent.action === "publish"
          ? "Published."
          : intent.action === "schedule"
            ? "Scheduled."
            : intent.action === "unpublish"
              ? "Unpublished."
              : "Archived."
      );
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  };

  const copyPublicUrl = async () => {
    const url = typeof window === "undefined" ? publicPath : new URL(publicPath, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public URL copied.");
    } catch {
      toast.error("Couldn't copy the URL.");
    }
  };

  const typeLabel = type === "product" ? "product" : type;
  const busySpinner = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;

  // Amber, not destructive: publishing is still allowed. Same treatment as the
  // "publish your unpublished edits too" opt-in below, which is the other caution
  // shown in this dialog.
  const publishWarningCallout = (
    <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>{publishWarning}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[state]}`}
        title={
          state === "published"
            ? `Live at ${publicPath}`
            : state === "scheduled"
              ? "Not public yet — goes live automatically"
              : "Not visible to the public"
        }
      >
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLE[state]}`} aria-hidden="true" />
        {label}
      </span>

      {hasDraft && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-amber-500/50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          Unpublished edits
        </span>
      )}

      <div className="flex items-center">
        {state !== "published" && (
          <Button
            size="sm"
            className="rounded-r-none"
            onClick={openPublishDialog}
            disabled={isBusy}
          >
            <Globe className="mr-2 h-4 w-4" />
            {state === "scheduled" ? "Publish now" : "Publish…"}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant={state === "published" ? "outline" : "default"}
              className={state === "published" ? "" : "-ml-px rounded-l-none px-2"}
              aria-label="Visibility options"
              disabled={isBusy}
            >
              {state === "published" && <span className="mr-1">Visibility</span>}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Visibility</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setError(null);
                setScheduleValue(toDateTimeLocal(publishedAt) || defaultScheduleValue());
                setDialog("schedule");
              }}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              {state === "scheduled" ? "Reschedule…" : "Schedule…"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copyPublicUrl()}>
              <Link2 className="mr-2 h-4 w-4" />
              Copy public URL
            </DropdownMenuItem>
            {(state === "published" || state === "scheduled") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => {
                    setError(null);
                    setDialog("unpublish");
                  }}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Unpublish
                </DropdownMenuItem>
              </>
            )}
            {state !== "archived" && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  setError(null);
                  setDialog("archive");
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ---- Publish ---- */}
      <Dialog open={dialog === "publish"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make this {typeLabel} public?</DialogTitle>
            <DialogDescription>
              Anyone with the link will be able to see it, and search engines can index it.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border bg-muted/40 p-3 text-sm">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">URL</dt>
            <dd className="font-mono text-xs break-all">{publicPath}</dd>
            {languageName && (
              <>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Language</dt>
                <dd>{languageName}</dd>
              </>
            )}
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Goes live</dt>
            <dd>Immediately</dd>
          </dl>

          {hasDraft && (
            <label className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <Checkbox
                checked={alsoPublishDraft}
                onCheckedChange={(checked) => setAlsoPublishDraft(checked === true)}
                className="mt-0.5"
              />
              <span>
                Publish your unpublished edits at the same time — otherwise the older live version
                is what goes public.
              </span>
            </label>
          )}

          {siblings && siblings.some((sibling) => sibling.state !== "published") && (
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {siblings
                .filter((sibling) => sibling.state !== "published")
                .map((sibling) => (
                  <p key={String(sibling.id)}>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">!</span>{" "}
                    The {languageNameById.get(sibling.languageId) ?? "other language"} version is
                    still {STATE_LABEL[sibling.state].toLowerCase()}.
                  </p>
                ))}
            </div>
          )}

          {publishWarning && publishWarningCallout}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              onClick={() => void run({ action: "publish" }, { publishDraft: alsoPublishDraft })}
              disabled={isBusy}
            >
              {isBusy && busySpinner}
              {publishWarning ? `Publish anyway` : `Publish ${typeLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Schedule ---- */}
      <Dialog open={dialog === "schedule"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule this {typeLabel}</DialogTitle>
            <DialogDescription>
              It stays private until the moment you pick, then goes live on its own. Times are in
              your own timezone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="visibility-schedule">Go live on</Label>
            <Input
              id="visibility-schedule"
              type="datetime-local"
              value={scheduleValue}
              onChange={(event) => setScheduleValue(event.target.value)}
            />
          </div>

          {publishWarning && publishWarningCallout}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const local = new Date(scheduleValue);
                if (Number.isNaN(local.getTime())) {
                  setError("That isn't a valid date and time.");
                  return;
                }
                void run({ action: "schedule", publishedAt: local.toISOString() });
              }}
              disabled={isBusy || !scheduleValue}
            >
              {isBusy && busySpinner}
              {publishWarning ? "Schedule anyway" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Unpublish ---- */}
      <Dialog open={dialog === "unpublish"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take this {typeLabel} off the live site?</DialogTitle>
            <DialogDescription>
              Visitors will get a 404 at{" "}
              <span className="font-mono text-xs">{publicPath}</span>. Your content and any
              unpublished edits are kept — you can publish it again at any time. Check your
              navigation menus for links pointing here.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void run({ action: "unpublish" })}
              disabled={isBusy}
            >
              {isBusy && busySpinner}
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Archive ---- */}
      <Dialog open={dialog === "archive"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this {typeLabel}?</DialogTitle>
            <DialogDescription>
              It comes off the live site and drops out of the default {typeLabel} list. Nothing is
              deleted, and you can publish it again later.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void run({ action: "archive" })}
              disabled={isBusy}
            >
              {isBusy && busySpinner}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
