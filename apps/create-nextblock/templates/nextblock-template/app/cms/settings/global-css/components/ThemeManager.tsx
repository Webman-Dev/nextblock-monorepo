'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nextblock-cms/ui';
import { toast } from 'sonner';
import { Copy, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import type { SiteTheme } from '../../../../../lib/themes/buildThemeCss';
import {
  createTheme,
  deleteTheme,
  duplicateTheme,
  setDefaultTheme,
  updateTheme,
} from '../theme-actions';
import { ThemeEditor, ThemePreview, themeToDraft, type ThemeDraft } from './ThemeEditor';
import { ThemeIcon } from '../../../../../components/theme-icon';

export default function ThemeManager({ initialThemes }: { initialThemes: SiteTheme[] }) {
  const router = useRouter();
  const [themes, setThemes] = React.useState(initialThemes);
  const [selectedId, setSelectedId] = React.useState(initialThemes[0]?.id ?? '');
  const [draft, setDraft] = React.useState<ThemeDraft | null>(
    initialThemes[0] ? themeToDraft(initialThemes[0]) : null,
  );
  const [pending, setPending] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  React.useEffect(() => {
    setThemes(initialThemes);
  }, [initialThemes]);

  const selected = themes.find((theme) => theme.id === selectedId) ?? null;

  // Switching themes discards nothing silently: the draft is per-theme and only
  // written back on Save, so we reseed whenever the selection changes.
  const selectTheme = (theme: SiteTheme) => {
    setSelectedId(theme.id);
    setDraft(themeToDraft(theme));
  };

  const isDirty = React.useMemo(() => {
    if (!selected || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(themeToDraft(selected));
  }, [selected, draft]);

  const run = async (key: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setPending(key);
    try {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? 'Done.');
        router.refresh();
        return true;
      }
      toast.error(result.error ?? 'Something went wrong.');
      return false;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
      return false;
    } finally {
      setPending(null);
    }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;
    await run('save', () =>
      updateTheme(selected.id, {
        name: draft.name,
        description: draft.description,
        icon: draft.icon,
        color_scheme: draft.color_scheme,
        tokens: draft.tokens,
        extra_css: draft.extra_css,
        is_active: selected.is_default ? true : draft.is_active,
      }),
    );
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await run('create', () =>
      createTheme({
        name,
        // Start from the currently selected theme's palette so a new theme is a
        // usable variation rather than an unreadable blank slate.
        tokens: draft?.tokens ?? {},
        color_scheme: draft?.color_scheme ?? 'light',
        icon: 'Palette',
        sort_order: (themes[themes.length - 1]?.sort_order ?? 0) + 10,
      }),
    );
    if (ok) {
      setCreateOpen(false);
      setNewName('');
    }
  };

  if (!selected || !draft) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No themes found. Run the pending database migration to seed Light, Dark and Vibrant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Theme list */}
        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Themes</h2>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ul className="space-y-1">
            {themes.map((theme) => {
              const active = theme.id === selectedId;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    onClick={() => selectTheme(theme)}
                    aria-current={active}
                    className={
                      'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors ' +
                      (active ? 'border-ring bg-accent/50' : 'border-transparent hover:bg-accent/30')
                    }
                  >
                    <ThemeIcon name={theme.icon} size={15} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{theme.name}</span>
                    {theme.is_default ? (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-current text-amber-500" aria-label="Default theme" />
                    ) : null}
                    {!theme.is_active ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">hidden</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Editor */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <Button type="button" onClick={handleSave} disabled={!isDirty || pending !== null}>
              {pending === 'save' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {isDirty ? 'Save changes' : 'Saved'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending !== null}
              onClick={() => run('duplicate', () => duplicateTheme(selected.id))}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
            {!selected.is_default ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending !== null}
                onClick={() => run('default', () => setDefaultTheme(selected.id))}
              >
                <Star className="mr-1.5 h-3.5 w-3.5" />
                Make default
              </Button>
            ) : null}
            {!selected.is_system && !selected.is_default ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending !== null}
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (
                    !window.confirm(
                      `Delete "${selected.name}"? Visitors currently using it will fall back to the default theme.`,
                    )
                  ) {
                    return;
                  }
                  void run('delete', () => deleteTheme(selected.id)).then((ok) => {
                    if (ok) {
                      const next = themes.find((theme) => theme.id !== selected.id);
                      if (next) selectTheme(next);
                    }
                  });
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
            {selected.is_system ? (
              <span className="text-[11px] text-muted-foreground">
                System theme — fully editable, but cannot be deleted because &quot;System&quot; resolves to it.
              </span>
            ) : null}
          </div>

          <ThemePreview draft={draft} />

          <ThemeEditor theme={selected} draft={draft} onDraftChange={setDraft} />
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New theme</DialogTitle>
            <DialogDescription>
              Starts as a copy of &quot;{selected.name}&quot; so you can adjust from a working palette.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-theme-name">Name</Label>
            <Input
              id="new-theme-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Midnight"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!newName.trim() || pending !== null}>
              {pending === 'create' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Create theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
