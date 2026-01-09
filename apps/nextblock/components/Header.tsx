// components/Header.tsx
import type { Database } from '@nextblock-cms/db';
import HeaderAuth from './header-auth';
import LanguageSwitcher from './LanguageSwitcher';
import ResponsiveNav from './ResponsiveNav';

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
type Logo =
  Database['public']['Tables']['logos']['Row'] & {
    media: (Database['public']['Tables']['media']['Row'] & { alt_text: string | null }) | null;
  };

interface HeaderProps {
  navItems: NavigationItem[];
  canAccessCms: boolean;
  logo: Logo | null;
  currentPageData?: { slug: string; translation_group_id: string | null };
  siteTitle: string;
}

export default function Header({
  navItems,
  canAccessCms,
  logo,
  currentPageData,
  siteTitle,
}: HeaderProps) {
  return (
    <ResponsiveNav
      homeLinkHref="/"
      navItems={navItems}
      canAccessCms={canAccessCms}
      cmsDashboardLinkHref="/cms/dashboard"
      headerAuthComponent={<HeaderAuth />}
      languageSwitcherComponent={
        <LanguageSwitcher currentPageData={currentPageData} />
      }
      logo={logo}
      siteTitle={siteTitle}
    />
  );
}
