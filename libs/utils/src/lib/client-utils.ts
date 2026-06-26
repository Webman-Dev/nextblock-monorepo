'use client';

// On the client only NEXT_PUBLIC_* vars are inlined; the build (next.config.js) bridges
// the new publishable key into NEXT_PUBLIC_SUPABASE_ANON_KEY, but accept the publishable
// name directly too for robustness.
export const hasPublicEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);
