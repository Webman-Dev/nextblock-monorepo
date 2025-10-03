// components/FooterNavigation.tsx
import Link from 'next/link';
import type { Database } from '@nextblock-cms/db';
import { getNavigationMenu } from '@/app/cms/navigation/actions';

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
import { headers } from 'next/headers';

const DEFAULT_LOCALE_FOR_FOOTER = 'en'; // Define a default locale

export default async function FooterNavigation() {
  const heads = await headers();
  const currentLocale = heads.get('x-user-locale') || DEFAULT_LOCALE_FOR_FOOTER;
  let footerNavItems: NavigationItem[] = [];

  try {
    footerNavItems = await getNavigationMenu('FOOTER', currentLocale);
  } catch (error) {
    console.error("Error fetching footer navigation:", error);
    // Gracefully handle error, e.g., by leaving footerNavItems empty
  }

  if (footerNavItems.length === 0) {
    return null; // Don't render anything if no footer items
  }

  // Simple function to render navigation items (can be expanded for hierarchy)
  const renderNavItems = (items: NavigationItem[]) => {
    return items
      .filter(item => !item.parent_id) // Render only top-level items for simplicity
      .map(item => (
        <Link key={item.id} href={item.url} className="text-sm text-muted-foreground hover:text-foreground hover:underline px-2 py-1">
          {item.label}
        </Link>
      ));
  };

  return (
    <nav className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2" aria-label="Footer navigation">
      {renderNavItems(footerNavItems)}
    </nav>
  );
}