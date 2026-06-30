'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, ArrowUpCircle, ExternalLink, X } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import { resolveSystemAlert } from './system-alerts-actions';

export interface SystemAlertItem {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
}

function readString(metadata: Record<string, unknown> | null, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Dashboard banner for unresolved system_alerts. High-visibility, developer-facing:
 *   - merge_conflict           -> amber, links to GitHub to resolve the sync (Track A).
 *   - runtime_update_available -> indigo, links to the release download (Track B).
 * Dismissing persists is_resolved=true (ADMIN-only via RLS) and hides the alert.
 */
export default function SystemAlertsBanner({ alerts }: { alerts: SystemAlertItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    startTransition(() => {
      void resolveSystemAlert(id);
    });
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {visible.map((alert) => {
        const isConflict = alert.alert_type === 'merge_conflict';
        const Icon = isConflict ? AlertTriangle : ArrowUpCircle;

        const tone = isConflict
          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200'
          : 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700/60 dark:bg-indigo-900/20 dark:text-indigo-200';
        const ctaBorder = isConflict
          ? 'border-amber-400 dark:border-amber-600'
          : 'border-indigo-400 dark:border-indigo-600';

        // Track A (conflict) deep-links to GitHub; Track B (update) to the download.
        const primaryHref = isConflict
          ? readString(alert.metadata, 'action_url')
          : readString(alert.metadata, 'download_url');
        const primaryLabel = isConflict ? 'Resolve on GitHub' : 'Download latest';
        const secondaryHref = isConflict
          ? readString(alert.metadata, 'run_url')
          : readString(alert.metadata, 'html_url');
        const secondaryLabel = isConflict ? 'View workflow run' : 'Release notes';

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${tone}`}
            role="alert"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs opacity-90">{alert.message}</p>
              {(primaryHref || secondaryHref) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {primaryHref && (
                    <Button asChild size="sm" variant="outline" className={ctaBorder}>
                      <a href={primaryHref} target="_blank" rel="noopener noreferrer">
                        {primaryLabel}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  {secondaryHref && (
                    <a
                      href={secondaryHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
                    >
                      {secondaryLabel}
                    </a>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dismiss(alert.id)}
              disabled={isPending}
              aria-label="Dismiss alert"
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
