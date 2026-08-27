import type { ReactNode } from 'react';

/**
 * A private conversation between one visitor and the store. Never indexed: the page is
 * reached by a personal link, and a search engine that crawled it would both expose the
 * exchange and burn the token by following it.
 */
export const metadata = {
  title: 'Your conversation',
  robots: { index: false, follow: false },
};

export default function ThreadLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">{children}</div>;
}
