import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';
import {
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_KEYWORDS,
} from './seo';

export const SITE_SETTINGS_CACHE_TAG = 'public-site-settings';
const SITE_SETTINGS_REVALIDATE_SECONDS = 60;

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
}

/**
 * Service-role (or anon) Supabase client used for cached, request-agnostic
 * reads of public layout/SEO data. Shared by the root layout and the public
 * route `generateMetadata` functions.
 */
export function createStaticSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for public layout data');
  }

  return createSupabaseJsClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Cached read of the site-wide SEO identity (title / description / keywords)
 * from the `site_settings` key-value store. This is the single source of truth
 * used for both `<title>`/OpenGraph metadata and the header brand.
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const fallback: SiteSettings = {
      siteTitle: DEFAULT_SITE_TITLE,
      siteDescription: DEFAULT_SITE_DESCRIPTION,
      siteKeywords: DEFAULT_SITE_KEYWORDS,
    };

    try {
      const supabase = createStaticSupabaseClient();
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['site_title', 'site_description', 'site_keywords']);

      if (error || !data) {
        console.error('Error fetching cached site settings:', error);
        return fallback;
      }

      const settings: Record<string, string> = {};
      data.forEach((item) => {
        if (typeof item.value === 'string') {
          settings[item.key] = item.value;
        }
      });

      return {
        siteTitle: settings.site_title?.trim() || fallback.siteTitle,
        siteDescription: settings.site_description?.trim() || fallback.siteDescription,
        siteKeywords: settings.site_keywords?.trim() || fallback.siteKeywords,
      };
    } catch (caught) {
      console.error('Unexpected error fetching site settings:', caught);
      return fallback;
    }
  },
  ['public-site-settings'],
  { revalidate: SITE_SETTINGS_REVALIDATE_SECONDS, tags: [SITE_SETTINGS_CACHE_TAG] }
);
