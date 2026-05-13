// utils/supabase/ssg-client.ts
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
export const getSsgSupabaseClient = () => {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://dummy.supabase.co';
    const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'dummy-key';
    if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
        console.warn('Supabase URL or Anon Key is missing for SSG client. Returning dummy client to prevent build crash.');
    }
    return createSupabaseJsClient(url, key);
};
//# sourceMappingURL=ssg-client.js.map