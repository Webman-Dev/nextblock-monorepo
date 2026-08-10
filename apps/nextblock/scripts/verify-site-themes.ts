/**
 * Reads site_themes from the configured Supabase project and renders it through
 * buildThemeCss, so the DB -> CSS path can be checked without booting the app.
 *   npx tsx --tsconfig=tsconfig.base.json apps/nextblock/scripts/verify-site-themes.ts
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  activeThemeSlugs,
  darkSchemeSlugs,
  buildThemeCss,
  defaultThemeSlug,
  type SiteTheme,
} from '../lib/themes/buildThemeCss';

dotenv.config({ path: '.env.local' });

async function main() {
  const url =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'] || '';
  const key =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['SUPABASE_SECRET_KEY'] || '';
  if (!url || !key) throw new Error('Supabase URL/service key not resolved from env');

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('site_themes')
    .select(
      'id, slug, name, description, icon, color_scheme, tokens, extra_css, is_system, is_default, is_active, sort_order',
    )
    .order('sort_order');

  if (error) throw error;
  const themes = (data ?? []) as unknown as SiteTheme[];

  console.log(
    'rows:',
    themes
      .map(
        (t) =>
          `${t.slug}(${t.color_scheme}${t.is_default ? ',default' : ''}${t.is_system ? ',system' : ''}) tokens=${Object.keys(t.tokens ?? {}).length}`,
      )
      .join('  '),
  );
  console.log('slugs:  ', activeThemeSlugs(themes));
  console.log('default:', defaultThemeSlug(themes));
  console.log('dark-scheme slugs:', darkSchemeSlugs(themes));

  const css = buildThemeCss(themes);
  console.log('--- generated css (first 600 chars) ---');
  console.log(css.slice(0, 600));
  console.log('--- checks ---');
  console.log('has :root.vibrant   ', css.includes(':root.vibrant {'));
  console.log('has --warning       ', css.includes('--warning:'));
  console.log('has nested & h1     ', css.includes('& h1'));
  console.log('no markup breakout  ', !css.includes('<'));
  console.log('css length          ', css.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
