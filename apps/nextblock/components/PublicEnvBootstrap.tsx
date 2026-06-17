'use client';

// Makes the PUBLIC Supabase values available to the browser at runtime via a global,
// set SYNCHRONOUSLY during render (before any descendant calls the browser createClient).
//
// Why: NEXT_PUBLIC_* are inlined into the client bundle at build time. On a fresh local
// dev setup the dev server starts with no env, so the loaded bundle holds empties; the
// /setup wizard then writes the env at runtime. Browser-side readers (the Supabase client,
// env checks, and resolveMediaUrl's R2 base) read `process.env.NEXT_PUBLIC_* ||
// window.__NEXTBLOCK_PUBLIC_ENV__`, so this fills the gap without a dev-server restart. In
// production the inlined values win and these props just match them (a harmless no-op). All
// of these (Supabase url + anon key, R2 public base) are public values (safe to ship).
//
// This runs at render time (not in an effect, and not via a nonce'd <script> that could
// be deferred/blocked in dev), so the global is set before sibling/descendant components
// render. It's mounted in the root layout, so the value persists across client navigations.
type PublicEnv = { url: string; anonKey: string; r2Base?: string };

declare global {
  interface Window {
    __NEXTBLOCK_PUBLIC_ENV__?: PublicEnv;
  }
}

export function PublicEnvBootstrap({ url, anonKey, r2Base }: PublicEnv) {
  if (typeof window !== 'undefined' && url && anonKey) {
    window.__NEXTBLOCK_PUBLIC_ENV__ = { url, anonKey, r2Base };
  }
  return null;
}
