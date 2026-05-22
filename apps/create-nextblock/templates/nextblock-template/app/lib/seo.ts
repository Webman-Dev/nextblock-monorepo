export const DEFAULT_SITE_DESCRIPTION =
  'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.';

export function resolveMetaDescription(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const description = candidate?.trim();
    if (description) {
      return description;
    }
  }

  return DEFAULT_SITE_DESCRIPTION;
}
