import type { Database } from '@nextblock-cms/db';

export type Logo = Database['public']['Tables']['logos']['Row'] & { media: (Database['public']['Tables']['media']['Row'] & { alt_text: string | null }) | null };