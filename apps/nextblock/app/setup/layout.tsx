// Minimal layout for the first-boot wizard. Deliberately does NO Supabase work so it
// renders even on a completely unconfigured instance. (It is still nested inside the
// root layout, which short-circuits its own data loading when unconfigured.)
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Set up NextBlock',
  robots: { index: false, follow: false },
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">{children}</div>;
}
