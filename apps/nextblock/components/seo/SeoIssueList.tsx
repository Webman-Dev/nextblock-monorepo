'use client';

/**
 * The findings half of the SEO panel: every issue the audit raised, grouped
 * under the part of the page it belongs to, each with the one-click Cortex AI
 * repair where the engine says a repair is possible.
 *
 * Grouping by category rather than listing findings in severity order is a
 * deliberate trade. Severity order answers "what is worst?", which the score
 * dial and the summary counts already answer; category order answers "what do I
 * have to go and change?", which is the question someone with the document open
 * in front of them is actually asking. Within a category the audit's own
 * severity ordering is preserved, so the worst thing in each section still
 * comes first.
 *
 * Severity is never carried by colour alone. Each finding gets an icon and a
 * spelled-out word ("Error", "Warning", "Suggestion") next to the tint, so the
 * list reads identically to someone who cannot distinguish red from amber, and
 * survives being printed or screenshotted in greyscale.
 */

import * as React from 'react';

import { Button } from '@nextblock-cms/ui';
import { cn } from '@nextblock-cms/utils';
import type { SeoIssue, SeoIssueCategory, SeoIssueSeverity } from '@nextblock-cms/utils/seo';
import { AlertTriangle, Info, Loader2, Sparkles, XCircle } from 'lucide-react';

import { canFixIssueWithCortexAi } from '../../lib/seo/fix-prompts';

/**
 * Category order, chosen to walk the document the way an author does: fix the
 * skeleton first (headings), then how it reads, then what it is about, then how
 * much of it there is, then its assets, and finally the metadata that wraps it.
 */
const CATEGORY_ORDER: SeoIssueCategory[] = [
  'headings',
  'readability',
  'keyword',
  'content',
  'images',
  'meta',
];

const CATEGORY_LABEL: Record<SeoIssueCategory, string> = {
  content: 'Content',
  headings: 'Headings',
  images: 'Images',
  keyword: 'Keyphrase',
  meta: 'Meta',
  readability: 'Readability',
};

/**
 * Severity styling, following the same raw-palette-with-dark-variant pattern as
 * `VisibilityControl`: red for something materially broken, amber for something
 * measurably worse than it should be, and the neutral muted tokens for advice
 * the author is free to ignore.
 */
const SEVERITY_STYLE: Record<SeoIssueSeverity, string> = {
  error: 'border-red-500/40 bg-red-500/10',
  info: 'border-border bg-muted/40',
  warning: 'border-amber-500/40 bg-amber-500/10',
};

const SEVERITY_ICON_STYLE: Record<SeoIssueSeverity, string> = {
  error: 'text-red-600 dark:text-red-400',
  info: 'text-muted-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
};

const SEVERITY_ICON: Record<SeoIssueSeverity, React.ComponentType<{ className?: string }>> = {
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

/** "Suggestion" rather than "Info": it tells the reader what to do with it. */
const SEVERITY_LABEL: Record<SeoIssueSeverity, string> = {
  error: 'Error',
  info: 'Suggestion',
  warning: 'Warning',
};

export interface SeoIssueListProps {
  /** The issue whose fix is in flight, if any; disables every other button. */
  busyIssueId?: string | null;
  className?: string;
  /** Failure text from the last fix attempt, keyed by issue id. */
  errors?: Record<string, string>;
  issues: SeoIssue[];
  /**
   * Runs the Cortex AI repair. Leaving this undefined removes every Fix button
   * from the list — which is how the panel expresses both "Cortex AI is not
   * activated on this install" and "no editor instance was handed to us", two
   * situations where offering the button would only produce a dead click.
   */
  onFix?: (issue: SeoIssue) => void;
}

export function SeoIssueList({ busyIssueId, className, errors, issues, onFix }: SeoIssueListProps) {
  const grouped = React.useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      issues: issues.filter((issue) => issue.category === category),
    })).filter((group) => group.issues.length > 0);
  }, [issues]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {grouped.map((group) => (
        <section key={group.category} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[group.category]}
          </h4>

          <ul className="space-y-2">
            {group.issues.map((issue) => {
              const Icon = SEVERITY_ICON[issue.severity];
              const isBusy = busyIssueId === issue.id;
              const error = errors?.[issue.id];
              const showFix = onFix !== undefined && canFixIssueWithCortexAi(issue);

              return (
                <li
                  key={issue.id}
                  className={cn('rounded-md border p-2.5 text-sm', SEVERITY_STYLE[issue.severity])}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      aria-hidden="true"
                      className={cn('mt-0.5 h-4 w-4 shrink-0', SEVERITY_ICON_STYLE[issue.severity])}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium leading-snug">
                        <span className="sr-only">{SEVERITY_LABEL[issue.severity]}: </span>
                        {issue.message}
                      </p>
                      {issue.detail && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {issue.detail}
                        </p>
                      )}
                      <p
                        aria-hidden="true"
                        className={cn(
                          'text-[11px] font-semibold uppercase tracking-wide',
                          SEVERITY_ICON_STYLE[issue.severity]
                        )}
                      >
                        {SEVERITY_LABEL[issue.severity]}
                      </p>
                    </div>
                  </div>

                  {showFix && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        className="h-7 text-xs"
                        disabled={busyIssueId !== null && busyIssueId !== undefined}
                        onClick={() => onFix?.(issue)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {isBusy ? 'Fixing…' : 'Fix with Cortex AI'}
                      </Button>
                    </div>
                  )}

                  {error && (
                    <p className="mt-2 text-xs text-destructive" role="alert">
                      {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default SeoIssueList;
