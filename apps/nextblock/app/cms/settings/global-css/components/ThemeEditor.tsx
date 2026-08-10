'use client';

import React from 'react';
import {
  Button,
  ColorField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nextblock-cms/ui';
import { contrastRatio, parseCssColor, rateContrast } from '@nextblock-cms/utils';
import { AlertTriangle, Check } from 'lucide-react';
import type { SiteTheme } from '../../../../../lib/themes/buildThemeCss';
import { THEME_TOKEN_GROUPS, type ThemeTokenDef } from '../../../../../lib/themes/tokens';
import {
  cssColorToTokenValue,
  tokenValueToCss,
  tokenValueToHex,
} from '../../../../../lib/themes/tokenColor';
import { THEME_ICON_NAMES, ThemeIcon } from '../../../../../components/theme-icon';

export interface ThemeDraft {
  name: string;
  description: string;
  icon: string;
  color_scheme: 'light' | 'dark';
  tokens: Record<string, string>;
  extra_css: string;
  is_active: boolean;
}

export function themeToDraft(theme: SiteTheme): ThemeDraft {
  return {
    name: theme.name,
    description: theme.description ?? '',
    icon: theme.icon || 'Palette',
    color_scheme: theme.color_scheme,
    tokens: { ...(theme.tokens ?? {}) },
    extra_css: theme.extra_css ?? '',
    is_active: theme.is_active,
  };
}

/**
 * Live contrast readout for a foreground/background token pair. Headings and
 * body copy both come from these tokens, so a bad pair here is a site-wide
 * legibility bug — surfacing it at edit time is the whole point.
 */
function ContrastBadge({ fg, bg }: { fg?: string; bg?: string }) {
  const result = React.useMemo(() => {
    if (!fg || !bg) return null;
    const f = parseCssColor(tokenValueToCss(fg));
    const b = parseCssColor(tokenValueToCss(bg));
    if (!f || !b) return null;
    const ratio = contrastRatio(f, b);
    return { ratio, rating: rateContrast(ratio) };
  }, [fg, bg]);

  if (!result) return null;
  const failing = result.rating === 'Fail';
  return (
    <span
      title={`Contrast against its paired surface: ${result.ratio}:1 (WCAG ${result.rating})`}
      className={
        failing
          ? 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive'
          : 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground'
      }
    >
      {failing ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      {result.ratio}:1 {result.rating}
    </span>
  );
}

function TokenRow({
  token,
  draft,
  onTokenChange,
}: {
  token: ThemeTokenDef;
  draft: ThemeDraft;
  onTokenChange: (key: string, value: string | undefined) => void;
}) {
  const raw = draft.tokens[token.key];

  if (token.kind === 'length') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`token-${token.key}`} className="text-sm">
          {token.label}
        </Label>
        <Input
          id={`token-${token.key}`}
          value={raw ?? ''}
          onChange={(event) => onTokenChange(token.key, event.target.value || undefined)}
          placeholder="0.75rem"
          className="h-9 font-mono text-xs"
        />
        {token.hint ? <p className="text-[11px] text-muted-foreground">{token.hint}</p> : null}
      </div>
    );
  }

  const hex = raw ? tokenValueToHex(raw) : null;
  const pairedValue = token.pairedWith ? draft.tokens[token.pairedWith] : undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`token-${token.key}`} className="text-sm">
          {token.label}
        </Label>
        {token.pairedWith ? <ContrastBadge fg={raw} bg={pairedValue} /> : null}
      </div>
      <ColorField
        id={`token-${token.key}`}
        value={hex ?? undefined}
        placeholder="Not set"
        clearLabel="Unset"
        onChange={(next) => {
          if (!next) {
            onTokenChange(token.key, undefined);
            return;
          }
          const triplet = cssColorToTokenValue(next);
          onTokenChange(token.key, triplet ?? undefined);
        }}
        // Theme tokens ARE the palette, so there is nothing to offer as a token
        // shortcut here — this is the custom picker only.
        tokens={[]}
        contrastAgainst={pairedValue ? tokenValueToCss(pairedValue) : undefined}
      />
      <p className="font-mono text-[10px] text-muted-foreground">
        --{token.key}: {raw ?? <span className="italic">inherited</span>}
      </p>
    </div>
  );
}

export function ThemeEditor({
  theme,
  draft,
  onDraftChange,
}: {
  theme: SiteTheme;
  draft: ThemeDraft;
  onDraftChange: (next: ThemeDraft) => void;
}) {
  const set = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) =>
    onDraftChange({ ...draft, [key]: value });

  const onTokenChange = (key: string, value: string | undefined) => {
    const tokens = { ...draft.tokens };
    if (value === undefined) delete tokens[key];
    else tokens[key] = value;
    onDraftChange({ ...draft, tokens });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="theme-name">Name</Label>
          <Input
            id="theme-name"
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Midnight"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme-icon">Switcher icon</Label>
          <Select value={draft.icon} onValueChange={(value) => set('icon', value)}>
            <SelectTrigger id="theme-icon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {THEME_ICON_NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  <span className="flex items-center gap-2">
                    <ThemeIcon name={name} size={14} />
                    {name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme-description">Description</Label>
          <Input
            id="theme-description"
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="What this theme is for"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme-scheme">Colour scheme</Label>
          <Select
            value={draft.color_scheme}
            onValueChange={(value) => set('color_scheme', value as 'light' | 'dark')}
          >
            <SelectTrigger id="theme-scheme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Sets the CSS <code>color-scheme</code> for native controls. Dark also applies Tailwind&apos;s{' '}
            <code>dark:</code> variants.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            id="theme-active"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={draft.is_active}
            onChange={(event) => set('is_active', event.target.checked)}
            disabled={theme.is_default}
          />
          <Label htmlFor="theme-active" className="text-sm font-normal">
            Show in the theme switcher
          </Label>
        </div>
        {theme.is_default ? (
          <p className="text-[11px] text-muted-foreground">The default theme is always visible.</p>
        ) : null}
      </div>

      {THEME_TOKEN_GROUPS.map((group) => (
        <section key={group.id} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">{group.label}</h3>
            <p className="text-[11px] text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.tokens.map((token) => (
              <TokenRow key={token.key} token={token} draft={draft} onTokenChange={onTokenChange} />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <Label htmlFor="theme-extra-css">Extra CSS for this theme</Label>
        <p className="text-[11px] text-muted-foreground">
          Scoped automatically to this theme — start selectors with <code>&amp;</code>, e.g.{' '}
          <code>&amp; h1 {'{'} text-shadow: 0 0 5px hsl(var(--primary)); {'}'}</code>
        </p>
        <textarea
          id="theme-extra-css"
          value={draft.extra_css}
          onChange={(event) => set('extra_css', event.target.value)}
          spellCheck={false}
          className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder={'& h1 {\n  letter-spacing: -0.02em;\n}'}
        />
      </section>
    </div>
  );
}

/** Renders the draft as a self-contained preview card, scoped by inline vars. */
export function ThemePreview({ draft }: { draft: ThemeDraft }) {
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(draft.tokens)) {
      vars[`--${key}`] = value;
    }
    return vars as React.CSSProperties;
  }, [draft.tokens]);

  return (
    <div
      style={style}
      className="rounded-lg border p-4"
      // The preview paints with the draft's own tokens, so it updates live
      // without saving and without touching the surrounding CMS chrome.
    >
      <div className="rounded-md p-4" style={{ background: 'hsl(var(--background))' }}>
        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          {draft.name || 'Untitled theme'}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {draft.description || 'The quick brown fox jumps over the lazy dog.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Primary
          </span>
          <span
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'hsl(var(--secondary))',
              color: 'hsl(var(--secondary-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Secondary
          </span>
          <span
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'hsl(var(--accent))',
              color: 'hsl(var(--accent-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Accent
          </span>
          <span
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'hsl(var(--destructive))',
              color: 'hsl(var(--destructive-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Destructive
          </span>
          <span
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'hsl(var(--warning))',
              color: 'hsl(var(--warning-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Warning
          </span>
        </div>
        <div
          className="mt-3 rounded-md border p-3"
          style={{
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
        >
          <p className="text-xs font-medium">Card surface</p>
          <div
            className="mt-2 h-8 rounded-md border px-2 text-xs leading-8"
            style={{
              borderColor: 'hsl(var(--input))',
              color: 'hsl(var(--muted-foreground))',
              borderRadius: 'var(--radius)',
            }}
          >
            Input field
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemePreviewActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export { Button };
