import { Badge } from "@nextblock-cms/ui";
import {
  LIVE_STATUS,
  resolveVisibilityState,
  type PublishableType,
  type VisibilityState,
} from "@nextblock-cms/utils";

/**
 * Status badge for the CMS list views.
 *
 * Reads the same (status, published_at) pair as the editor's top-bar control, so a
 * scheduled row is labelled "Scheduled" here instead of claiming to be published
 * while its URL still 404s.
 */

const LABEL: Record<VisibilityState, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const CLASS_NAME: Record<VisibilityState, string> = {
  published:
    "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 dark:border-green-700/50",
  scheduled:
    "bg-amber-100 text-amber-700 dark:bg-amber-700/30 dark:text-amber-300 dark:border-amber-700/50",
  draft:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-700/50",
  archived:
    "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600",
};

const VARIANT: Record<VisibilityState, "default" | "secondary" | "destructive"> = {
  published: "default",
  scheduled: "secondary",
  draft: "secondary",
  archived: "destructive",
};

export default function VisibilityBadge({
  type,
  status,
  publishedAt,
}: {
  type: PublishableType;
  status: string;
  publishedAt?: string | null;
}) {
  const state = resolveVisibilityState({
    status,
    publishedAt,
    liveStatus: LIVE_STATUS[type],
  });

  return (
    <Badge variant={VARIANT[state]} className={CLASS_NAME[state]}>
      {LABEL[state]}
    </Badge>
  );
}
