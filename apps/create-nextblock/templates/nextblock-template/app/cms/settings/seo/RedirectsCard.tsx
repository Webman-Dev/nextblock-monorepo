'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmationDialog,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nextblock-cms/ui';
import {
  isExternalDestination,
  normalizeRedirectPath,
  validateRedirectRule,
  type RedirectRule,
  type RedirectStatusCode,
} from '@nextblock-cms/utils/seo';
import { ArrowRight, Check, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import type { SettingsActionResult } from '../../../../lib/cms/action-result';
import { createRedirect, deleteRedirect, toggleRedirect, updateRedirect } from './actions';
import { toRedirectInput, toRedirectRules, type CmsRedirect, type RedirectInput } from './mappers';

/** Matches the select styling used by the other settings screens (see SiteScriptManager). */
const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Active / paused styling, following the house convention of a
 * `Record<State, string>` of raw palette classes with dark: variants — emerald for
 * the good state, amber for the one that needs attention (see VisibilityControl).
 * A paused redirect is amber rather than red because pausing is a legitimate
 * operation, not a fault.
 */
const ACTIVE_STYLE: Record<'active' | 'paused', string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const EMPTY_DRAFT: RedirectInput = {
  destinationPath: '',
  isActive: true,
  sourcePath: '',
  statusCode: 301,
};

/**
 * What a path will actually be stored as.
 *
 * A destination that leaves the site is passed through untouched — rewriting
 * somebody's `https://` target would corrupt it — which is exactly the distinction
 * `validateRedirectRule` makes internally, so the hint cannot promise something the
 * server would not do.
 */
function previewStoredPath(value: string, allowExternal: boolean): string {
  const trimmed = value.trim();

  return allowExternal && isExternalDestination(trimmed) ? trimmed : normalizeRedirectPath(trimmed);
}

/**
 * "will be saved as /foo", shown only when it differs from what was typed.
 *
 * Silent normalisation is the single most confusing thing this screen could do: an
 * operator types `/blog/post/`, sees `/blog/post` appear in the table, and reasonably
 * concludes the form ate their input. Naming the transformation before it happens
 * costs one line of muted text and removes the whole category of confusion.
 */
function NormalizationHint({
  allowExternal,
  value,
}: {
  allowExternal: boolean;
  value: string;
}) {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const stored = previewStoredPath(trimmed, allowExternal);
  if (stored === trimmed) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      Will be saved as <span className="font-mono">{stored}</span>
    </p>
  );
}

/** The inline complaint under a field. Never rendered before the operator has typed. */
function ValidationMessage({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return <p className="text-xs text-destructive">{error}</p>;
}

type RedirectsCardProps = {
  redirects: CmsRedirect[];
};

/**
 * Create, edit, pause and delete the managed 301/302 redirects in `cms_redirects`.
 *
 * WHY THE BROWSER VALIDATES TOO. Every rule is checked twice, by the very same
 * function: `validateRedirectRule` from the pure SEO engine runs here as the operator
 * types, and again inside the server action before anything is written. The client
 * pass is UX and nothing more — it is trivially bypassed, and it is not the boundary.
 * What it buys is that the operator learns "another redirect already handles /pricing"
 * while their cursor is still in the field, rather than after a round trip, and that
 * the sentence they read then is byte-for-byte the sentence the server would have
 * returned, because it came from the same code. A second, hand-written "quick check"
 * here would eventually disagree with the server about some edge case, and the
 * operator would be the one to discover it.
 *
 * The rule set both passes compare against includes paused rules, which is what stops
 * an operator from parking a duplicate on a paused source and creating a conflict that
 * only appears when the older rule is resumed.
 */
export function RedirectsCard({ redirects }: RedirectsCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<RedirectInput>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RedirectInput>(EMPTY_DRAFT);
  const [pendingDelete, setPendingDelete] = useState<CmsRedirect | null>(null);

  // The engine's camelCase view of what is currently stored, mapped with the same
  // function the proxy uses, so "what the admin screen thinks the rules are" and
  // "what the proxy will actually match" cannot drift.
  const rules: RedirectRule[] = useMemo(() => toRedirectRules(redirects), [redirects]);

  const draftValidation = useMemo(
    () =>
      validateRedirectRule(
        { destinationPath: draft.destinationPath, sourcePath: draft.sourcePath },
        rules
      ),
    [draft.destinationPath, draft.sourcePath, rules]
  );

  const editValidation = useMemo(
    () =>
      editingId === null
        ? ({ ok: true } as const)
        : validateRedirectRule(
            {
              destinationPath: editDraft.destinationPath,
              id: editingId,
              sourcePath: editDraft.sourcePath,
            },
            rules
          ),
    [editDraft.destinationPath, editDraft.sourcePath, editingId, rules]
  );

  // An empty form is invalid — "enter a source path" is true but not yet useful — so
  // the complaint stays hidden until the operator has typed something. The submit
  // button is disabled the whole time regardless, so nothing invalid can be sent.
  const draftTouched = draft.sourcePath.trim() !== '' || draft.destinationPath.trim() !== '';
  const draftError = !draftValidation.ok && draftTouched ? draftValidation.error : null;
  const editError = !editValidation.ok ? editValidation.error : null;

  const run = (action: () => Promise<SettingsActionResult>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
        // The list is server-rendered, so a successful write has to pull the new rows
        // down rather than being patched into local state — that way the table and the
        // rule set the validators compare against stay the database's version of
        // events, not this component's guess at it.
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const submitDraft = (event: React.FormEvent<HTMLFormElement>) => {
    // This codebase drives client forms through onSubmit + a direct action call rather
    // than `<form action={…}>`, because the returned SettingsActionResult is what
    // produces the toast; a form action would discard it.
    event.preventDefault();

    if (!draftValidation.ok || isPending) {
      return;
    }

    run(() => createRedirect(draft), () => setDraft(EMPTY_DRAFT));
  };

  const startEditing = (redirect: CmsRedirect) => {
    setEditingId(redirect.id);
    setEditDraft(toRedirectInput(redirect));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const saveEdit = () => {
    if (editingId === null || !editValidation.ok || isPending) {
      return;
    }

    run(() => updateRedirect(editingId, editDraft), cancelEditing);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redirects</CardTitle>
        <CardDescription>
          Send an old URL to a new one. Use this whenever a page&apos;s slug changes or a page is
          removed — without a redirect the old address returns a 404 and whatever ranking and
          inbound links it had are lost. <strong className="text-foreground">301</strong> means the
          move is permanent and tells search engines to transfer the old page&apos;s standing to the
          new one; <strong className="text-foreground">302</strong> means temporary and transfers
          nothing. Matching is exact — one rule per address, no wildcards — and a destination may be
          a path on this site or a full <span className="font-mono">https://</span> URL.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form className="space-y-4 rounded-lg border bg-muted/30 p-4" onSubmit={submitDraft}>
          <h3 className="text-sm font-semibold">Add a redirect</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="redirect-source">Redirect from</Label>
              <Input
                id="redirect-source"
                autoComplete="off"
                className="font-mono"
                onChange={(event) => setDraft({ ...draft, sourcePath: event.target.value })}
                placeholder="/old-page"
                spellCheck={false}
                value={draft.sourcePath}
              />
              <NormalizationHint allowExternal={false} value={draft.sourcePath} />
              <p className="text-xs text-muted-foreground">
                A path on this site, starting with a slash.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect-destination">Redirect to</Label>
              <Input
                id="redirect-destination"
                autoComplete="off"
                className="font-mono"
                onChange={(event) => setDraft({ ...draft, destinationPath: event.target.value })}
                placeholder="/new-page"
                spellCheck={false}
                value={draft.destinationPath}
              />
              <NormalizationHint allowExternal value={draft.destinationPath} />
              <p className="text-xs text-muted-foreground">
                A path on this site, or a full https:// URL to move somewhere else entirely.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="redirect-status">Type</Label>
              <select
                className={selectClass}
                id="redirect-status"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    statusCode: Number(event.target.value) as RedirectStatusCode,
                  })
                }
                value={draft.statusCode}
              >
                <option value={301}>301 — permanent (the page moved for good)</option>
                <option value={302}>302 — temporary (it will come back)</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm" htmlFor="redirect-active">
                <Checkbox
                  checked={draft.isActive}
                  id="redirect-active"
                  onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked === true })}
                />
                Active — start redirecting visitors immediately
              </label>
            </div>
          </div>

          <ValidationMessage error={draftError} />

          <Button disabled={!draftValidation.ok || isPending} type="submit">
            <Plus className="mr-2 h-4 w-4" />
            {isPending ? 'Saving…' : 'Add redirect'}
          </Button>
        </form>

        {redirects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No redirects yet. Nothing is being rewritten, and every address on this site resolves
            exactly as it is written.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Redirect from</TableHead>
                  <TableHead>Redirect to</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redirects.map((redirect) =>
                  editingId === redirect.id ? (
                    <TableRow key={redirect.id}>
                      <TableCell className="align-top">
                        <Input
                          aria-label="Redirect from"
                          className="font-mono"
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, sourcePath: event.target.value })
                          }
                          spellCheck={false}
                          value={editDraft.sourcePath}
                        />
                        <NormalizationHint allowExternal={false} value={editDraft.sourcePath} />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          aria-label="Redirect to"
                          className="font-mono"
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, destinationPath: event.target.value })
                          }
                          spellCheck={false}
                          value={editDraft.destinationPath}
                        />
                        <NormalizationHint allowExternal value={editDraft.destinationPath} />
                        <ValidationMessage error={editError} />
                      </TableCell>
                      <TableCell className="align-top">
                        <select
                          aria-label="Redirect type"
                          className={selectClass}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              statusCode: Number(event.target.value) as RedirectStatusCode,
                            })
                          }
                          value={editDraft.statusCode}
                        >
                          <option value={301}>301</option>
                          <option value={302}>302</option>
                        </select>
                      </TableCell>
                      <TableCell className="align-top">
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={editDraft.isActive}
                            onCheckedChange={(checked) =>
                              setEditDraft({ ...editDraft, isActive: checked === true })
                            }
                          />
                          Active
                        </label>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={!editValidation.ok || isPending}
                            onClick={saveEdit}
                            size="sm"
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Save
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={cancelEditing}
                            size="sm"
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={redirect.id}>
                      <TableCell className="font-mono text-xs">{redirect.source_path}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {redirect.destination_path}
                          {isExternalDestination(redirect.destination_path) && (
                            <ExternalLink
                              aria-label="Leaves this site"
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{redirect.status_code}</TableCell>
                      <TableCell>
                        <button
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            redirect.is_active ? ACTIVE_STYLE.active : ACTIVE_STYLE.paused
                          }`}
                          disabled={isPending}
                          onClick={() => run(() => toggleRedirect(redirect.id, !redirect.is_active))}
                          title={
                            redirect.is_active
                              ? 'Pause this redirect — the old address will return a 404 again'
                              : 'Resume this redirect'
                          }
                          type="button"
                        >
                          {redirect.is_active ? 'Active' : 'Paused'}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={isPending}
                            onClick={() => startEditing(redirect)}
                            size="sm"
                            variant="outline"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => setPendingDelete(redirect)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/*
        Deleting is behind a dialog rather than an immediate action because it is the
        one operation here with no undo and an effect the operator cannot see: the old
        address silently starts returning 404 to everyone still following an old link.
        Pausing is the reversible alternative, so the dialog names it.
      */}
      <ConfirmationDialog
        confirmText="Delete redirect"
        description={
          pendingDelete
            ? `${pendingDelete.source_path} will stop redirecting to ${pendingDelete.destination_path} and will return a 404 again. Anyone following an old link or an old search result lands on an error page. If you only want to stop it for now, close this and use Pause instead — that is reversible.`
            : ''
        }
        isDestructive
        isOpen={pendingDelete !== null}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) {
            run(() => deleteRedirect(target.id));
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title="Delete this redirect?"
      />
    </Card>
  );
}
