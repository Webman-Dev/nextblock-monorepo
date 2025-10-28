import Link from 'next/link';
import type { Database } from '@nextblock-cms/db';

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];

interface FooterNavigationProps {
  navItems: NavigationItem[];
}

export default function FooterNavigation({ navItems }: FooterNavigationProps) {
  if (navItems.length === 0) {
    return null;
  }

  const renderNavItems = (items: NavigationItem[]) =>
    items
      .filter((item) => !item.parent_id)
      .map((item) => (
        <Link
          key={item.id}
          href={item.url}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline px-2 py-1"
        >
          {item.label}
        </Link>
      ));

  return (
    <nav className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2" aria-label="Footer navigation">
      {renderNavItems(navItems)}
    </nav>
  );
}
