// components/Header.tsx
import { createClient as createSupabaseServerClient } from '@nextblock-monorepo/db/server'; // Adjusted path
 // import Link from 'next/link'; // Appears unused, ResponsiveNav handles links
 import { getProfileWithRoleServerSide } from '@nextblock-monorepo/db/server'; // Adjusted path
 import type { Database } from '@nextblock-monorepo/db'; // Adjusted path
 import HeaderAuth from './header-auth'; // Adjusted path if needed, assuming it's in components/

 type UserRole = Database['public']['Enums']['user_role'];
 type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
 import LanguageSwitcher from './LanguageSwitcher';
 import { getNavigationMenu } from '../app/cms/navigation/actions'; // Adjusted path
 import { getActiveLogo } from '@/app/cms/settings/logos/actions';
 // import { headers } from 'next/headers'; // No longer needed here
 import ResponsiveNav from './ResponsiveNav'; // Import the new client component

interface HeaderProps {
  currentLocale: string;
  currentPageData?: { slug: string; translation_group_id: string | null };
}

export default async function Header({ currentLocale, currentPageData }: HeaderProps) {
  const t = (key: string) => key;
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: UserRole | null = null;
  if (user) {
    const profile = await getProfileWithRoleServerSide(user.id);
    userRole = profile?.role ?? null;
  }

  const canAccessCms = userRole === 'ADMIN' || userRole === 'WRITER';

  // const heads = await headers(); // No longer needed
  // const currentLocale = heads.get('x-user-locale') || DEFAULT_LOCALE_FOR_HEADER; // Prop will be used

  let headerNavItems: NavigationItem[] = [];
  try {
    headerNavItems = await getNavigationMenu('HEADER', currentLocale);
  } catch (error) {
    console.error("[Header.tsx] Error fetching header navigation:", error);
    // Gracefully handle error, e.g. by leaving headerNavItems empty
  }

  const logoData = await getActiveLogo()

  return (
    <ResponsiveNav
      homeLinkHref="/"
      navItems={headerNavItems}
      canAccessCms={canAccessCms}
      cmsDashboardLinkHref="/cms/dashboard"
      cmsDashboardLinkLabel={t('cms_dashboard')}
      headerAuthComponent={<HeaderAuth />}
      languageSwitcherComponent={
        <LanguageSwitcher currentPageData={currentPageData} />
      }
      logo={logoData}
      siteTitle="NRH"
    />
  )
}