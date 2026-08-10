// app/cms/settings/global-css/theme-actions.ts
'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { SettingsActionResult } from '../../../../lib/cms/action-result';
import { isValidThemeSlug, type SiteTheme } from '../../../../lib/themes/buildThemeCss';
import { isThemeTokenKey, isValidTokenValue, THEME_TOKEN_KEYS } from '../../../../lib/themes/tokens';

const THEME_COLUMNS =
  'id, slug, name, description, icon, color_scheme, tokens, extra_css, is_system, is_default, is_active, sort_order';

/** Theme edits are ADMIN-only — RLS enforces it too, this is the friendly error. */
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, error: 'You must be logged in to manage themes.' as const };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'ADMIN') {
    return { supabase, error: 'Only administrators can manage themes.' as const };
  }
  return { supabase, error: null };
}

function revalidateThemes() {
  revalidateTag('public-layout-site-themes', 'max');
  revalidatePath('/', 'layout');
}

export async function getSiteThemes(): Promise<SiteTheme[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('site_themes').select(THEME_COLUMNS).order('sort_order');
  if (error || !data) return [];
  return data as unknown as SiteTheme[];
}

/**
 * Keep only known tokens with well-formed values. Anything else is dropped
 * rather than rejected, so a partially-filled form still saves what it can.
 */
function sanitizeTokens(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (isThemeTokenKey(key) && isValidTokenValue(key, trimmed)) {
      out[key] = trimmed;
    }
  }
  return out;
}

export interface ThemeInput {
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string;
  color_scheme?: 'light' | 'dark';
  tokens?: Record<string, string>;
  extra_css?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}

export async function createTheme(input: ThemeInput): Promise<SettingsActionResult & { slug?: string }> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const slug = (input.slug ?? input.name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!isValidThemeSlug(slug)) {
    return {
      ok: false,
      error: 'Theme id must be 2-40 characters, lowercase letters, numbers and dashes, starting with a letter.',
    };
  }
  if (!input.name?.trim()) {
    return { ok: false, error: 'Theme name is required.' };
  }

  const { error } = await supabase.from('site_themes').insert({
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    icon: input.icon || 'Palette',
    color_scheme: input.color_scheme === 'dark' ? 'dark' : 'light',
    tokens: sanitizeTokens(input.tokens),
    extra_css: input.extra_css?.trim() || null,
    is_active: input.is_active ?? true,
    is_default: false,
    is_system: false,
    sort_order: input.sort_order ?? 100,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `A theme with the id "${slug}" already exists.` };
    }
    console.error('Error creating theme:', error);
    return { ok: false, error: 'Failed to create theme.' };
  }

  revalidateThemes();
  return { ok: true, message: `Theme "${input.name.trim()}" created.`, slug };
}

export async function updateTheme(id: string, input: ThemeInput): Promise<SettingsActionResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  if (!input.name?.trim()) {
    return { ok: false, error: 'Theme name is required.' };
  }

  // `slug` and `is_system` are intentionally not updatable: the slug is the CSS
  // class and the value persisted in each visitor's localStorage by next-themes,
  // so renaming it would silently reset everyone's chosen theme.
  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    icon: input.icon || 'Palette',
    color_scheme: input.color_scheme === 'dark' ? 'dark' : 'light',
    extra_css: input.extra_css?.trim() || null,
  };
  if (input.tokens !== undefined) patch.tokens = sanitizeTokens(input.tokens);
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { error } = await supabase.from('site_themes').update(patch).eq('id', id);

  if (error) {
    console.error('Error updating theme:', error);
    return { ok: false, error: 'Failed to update theme.' };
  }

  revalidateThemes();
  return { ok: true, message: 'Theme saved.' };
}

export async function setDefaultTheme(id: string): Promise<SettingsActionResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  // A hidden theme cannot be the site default.
  const { error } = await supabase
    .from('site_themes')
    .update({ is_default: true, is_active: true })
    .eq('id', id);

  if (error) {
    console.error('Error setting default theme:', error);
    return { ok: false, error: 'Failed to set the default theme.' };
  }

  revalidateThemes();
  return { ok: true, message: 'Default theme updated.' };
}

export async function deleteTheme(id: string): Promise<SettingsActionResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const { data: theme, error: readError } = await supabase
    .from('site_themes')
    .select('slug, name, is_system, is_default')
    .eq('id', id)
    .single();

  if (readError || !theme) {
    return { ok: false, error: 'Theme not found.' };
  }
  if (theme.is_system) {
    return {
      ok: false,
      error: `"${theme.name}" is a system theme. Light and Dark are what "System" resolves to, so they cannot be deleted — but you can recolour them freely.`,
    };
  }
  if (theme.is_default) {
    return { ok: false, error: 'Make another theme the default before deleting this one.' };
  }

  const { error } = await supabase.from('site_themes').delete().eq('id', id);
  if (error) {
    console.error('Error deleting theme:', error);
    return { ok: false, error: 'Failed to delete theme.' };
  }

  revalidateThemes();
  return { ok: true, message: `Theme "${theme.name}" deleted. Visitors using it fall back to the default.` };
}

export async function duplicateTheme(id: string): Promise<SettingsActionResult & { slug?: string }> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const { data: source, error: readError } = await supabase
    .from('site_themes')
    .select(THEME_COLUMNS)
    .eq('id', id)
    .single();

  if (readError || !source) {
    return { ok: false, error: 'Theme not found.' };
  }

  const theme = source as unknown as SiteTheme;
  // Find a free slug: my-theme-copy, my-theme-copy-2, ...
  const { data: existing } = await supabase.from('site_themes').select('slug');
  const taken = new Set((existing ?? []).map((row) => row.slug));
  let slug = `${theme.slug}-copy`.slice(0, 40);
  let n = 2;
  while (taken.has(slug)) {
    slug = `${theme.slug}-copy-${n}`.slice(0, 40);
    n += 1;
  }

  const { error } = await supabase.from('site_themes').insert({
    slug,
    name: `${theme.name} copy`,
    description: theme.description,
    icon: theme.icon,
    color_scheme: theme.color_scheme,
    tokens: sanitizeTokens(theme.tokens),
    extra_css: theme.extra_css,
    is_active: true,
    is_default: false,
    is_system: false,
    sort_order: (theme.sort_order ?? 0) + 1,
  });

  if (error) {
    console.error('Error duplicating theme:', error);
    return { ok: false, error: 'Failed to duplicate theme.' };
  }

  revalidateThemes();
  return { ok: true, message: `Created "${theme.name} copy".`, slug };
}

/** Exposed so the client form can render inputs for exactly what the server accepts. */
export async function getThemeTokenKeys(): Promise<string[]> {
  return THEME_TOKEN_KEYS;
}
