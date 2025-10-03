// apps/nextblock/app/cms/revisions/RevisionHistoryButton.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from "@nextblock-monorepo/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nextblock-monorepo/ui";
import { listPageRevisions, listPostRevisions, restorePageVersion, restorePostVersion, comparePageVersion, comparePostVersion } from './actions';
import { useRouter } from 'next/navigation';
import JsonDiffView from './JsonDiffView';

type ParentType = 'page' | 'post';

interface RevisionHistoryButtonProps {
  parentType: ParentType;
  parentId: number;
}

type RevisionItem = {
  id: number;
  version: number;
  revision_type: 'snapshot' | 'diff';
  created_at: string;
  author_id: string | null;
  author?: { full_name?: string | null; username?: string | null } | null;
};

export default function RevisionHistoryButton({ parentType, parentId }: RevisionHistoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<RevisionItem[] | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [compareLoading, setCompareLoading] = useState(false);
  const [activeCompareVersion, setActiveCompareVersion] = useState<number | null>(null);
  const [leftText, setLeftText] = useState<string | null>(null);
  const [rightText, setRightText] = useState<string | null>(null);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  }), []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (parentType === 'page') {
          const res = await listPageRevisions(parentId);
                if ('error' in res) {
                  setError(res.error ?? 'Unknown error');
                  setRevisions(null);
                  setCurrentVersion(null);
                } else {
                  setRevisions(res.revisions as unknown as RevisionItem[]);
                  setCurrentVersion((res as any).currentVersion ?? null);
                }
        } else {
          const res = await listPostRevisions(parentId);
          if ('error' in res) { setError(res.error ?? 'Unknown error'); setRevisions(null); setCurrentVersion(null); }
          else { setRevisions(res.revisions as unknown as RevisionItem[]); setCurrentVersion((res as any).currentVersion ?? null); }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load revisions');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, parentId, parentType]);

  const handleRestore = (version: number) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = parentType === 'page'
          ? await restorePageVersion(parentId, version)
          : await restorePostVersion(parentId, version);
        if ('error' in res) {
          setError(res.error ?? 'Unknown error');
          return;
        }
        setMessage('Version restored successfully.');
        // refresh current page to fetch restored content
        router.refresh();
        // Close the dialog after a short delay
        setTimeout(() => setOpen(false), 800);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to restore version');
      }
    });
  };

  type CompareResult = { success: true; current: unknown; target: unknown } | { error: string };
  const handleCompare = async (version: number) => {
    setError(null);
    setMessage(null);
    setActiveCompareVersion(version);
    setCompareLoading(true);
    try {
      const res: CompareResult = parentType === 'page'
        ? await comparePageVersion(parentId, version)
        : await comparePostVersion(parentId, version);
      if ('error' in res) {
        setError(res.error);
        setLeftText(null);
        setRightText(null);
      } else {
        const left = JSON.stringify(res.current, null, 2);
        const right = JSON.stringify(res.target, null, 2);
        setLeftText(left);
        setRightText(right);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load comparison');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>Revision History</Button>
      <DialogContent className="max-w-2xl h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revision History</DialogTitle>
          <DialogDescription>
            Browse and restore previous versions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading revisions…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-green-600">{message}</div>}

          {(!loading && revisions && revisions.length === 0) && (
            <div className="text-sm text-muted-foreground">No revisions yet.</div>
          )}

          {revisions && revisions.length > 0 && (
            <div className="divide-y rounded border">
              {revisions.map((rev: RevisionItem) => {
                const when = rev.created_at ? dateFormatter.format(new Date(rev.created_at)) : '';
                const who = rev.author?.full_name || rev.author?.username || rev.author_id || 'Unknown';
                return (
                  <div key={rev.id} className="flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        <span>Version {rev.version}</span>
                        <span className="text-xs text-muted-foreground">({rev.revision_type})</span>
                        {currentVersion != null && rev.version === currentVersion && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Current</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{when} • {who}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleCompare(rev.version)} disabled={compareLoading && activeCompareVersion === rev.version}>
                        {compareLoading && activeCompareVersion === rev.version ? 'Loading…' : 'Compare'}
                      </Button>
                      <Button size="sm" onClick={() => handleRestore(rev.version)} disabled={isPending}>
                        {isPending ? 'Restoring…' : 'Restore'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {(activeCompareVersion !== null) && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Comparing Version {activeCompareVersion} to Current</div>
                <Button variant="outline" size="sm" onClick={() => { setActiveCompareVersion(null); setLeftText(null); setRightText(null); }}>Close Compare</Button>
              </div>
              {compareLoading && <div className="text-sm text-muted-foreground">Preparing diff…</div>}
              {!compareLoading && leftText && rightText && (
                <JsonDiffView
                  oldValue={leftText}
                  newValue={rightText}
                  leftTitle="Current (Now)"
                  rightTitle={`Version ${activeCompareVersion}`}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
