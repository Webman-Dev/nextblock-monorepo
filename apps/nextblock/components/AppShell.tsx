'use client';

import type { Database } from '@nextblock-cms/db';
import { cn } from '@nextblock-cms/utils';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Header from './Header';
import FooterNavigation from './FooterNavigation';
import { EnvVarWarning } from './env-var-warning';
import { SandboxBanner } from './SandboxBanner';
import { ThemeSwitcher } from './theme-switcher';

type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
type Logo =
  Database['public']['Tables']['logos']['Row'] & {
    media: (Database['public']['Tables']['media']['Row'] & { alt_text: string | null }) | null;
  };

type AppShellProps = {
  canAccessCms: boolean;
  children: ReactNode;
  copyrightText: string;
  footerNavItems: NavigationItem[];
  hasSupabaseEnv: boolean;
  headerNavItems: NavigationItem[];
  isEcommerceActive: boolean;
  logo: Logo | null;
  siteTitle: string;
};

export function AppShell({
  canAccessCms,
  children,
  copyrightText,
  footerNavItems,
  hasSupabaseEnv,
  headerNavItems,
  isEcommerceActive,
  logo,
  siteTitle,
}: AppShellProps) {
  const pathname = usePathname() || '';
  const isCmsRequest = pathname.startsWith('/cms');

  return (
    <>
      {process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' && !isCmsRequest && <SandboxBanner />}
      <div
        className={cn(
          'text-foreground flex min-h-screen w-full flex-col',
          isCmsRequest ? 'bg-slate-50 dark:bg-slate-950' : 'bg-background'
        )}
      >
        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col',
            !isCmsRequest && 'items-center'
          )}
        >
          <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 shrink-0">
            <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
              {!hasSupabaseEnv ? (
                <EnvVarWarning />
              ) : (
                <Header
                  navItems={headerNavItems}
                  canAccessCms={canAccessCms}
                  logo={logo}
                  siteTitle={siteTitle}
                  isEcommerceActive={isEcommerceActive}
                />
              )}
            </div>
          </nav>
          <main
            className={cn(
              'w-full',
              isCmsRequest ? 'flex-1 min-h-0 overflow-hidden' : 'flex-grow'
            )}
          >
            {children}
          </main>
          {!isCmsRequest && (
            <footer className="w-full border-t py-8">
              <div className="mx-auto flex flex-col items-center justify-center gap-6 text-center text-xs">
                <FooterNavigation navItems={footerNavItems} />
                <div className="flex flex-row items-center gap-2">
                  <p className="text-muted-foreground">{copyrightText}</p>
                  <ThemeSwitcher />
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
