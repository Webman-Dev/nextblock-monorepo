'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KeyRound, Package2 } from 'lucide-react';

import { useTranslations, cn } from '@nextblock-cms/utils';

export type AccountNavigationIcon = 'orders' | 'password';

export interface AccountNavigationLink {
  href: string;
  labelKey: string;
  fallbackLabel: string;
  icon?: AccountNavigationIcon;
}

interface AccountNavigationMenuProps {
  links: AccountNavigationLink[];
  title?: string;
  className?: string;
}

function translateOrFallback(
  t: (key: string, params?: Record<string, string | number>) => string,
  key: string,
  fallback: string
) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function resolveIcon(icon?: AccountNavigationIcon) {
  if (icon === 'password') {
    return KeyRound;
  }

  return Package2;
}

export function AccountNavigationMenu({
  links,
  title,
  className,
}: AccountNavigationMenuProps) {
  const pathname = usePathname();
  const { t } = useTranslations();

  if (!links.length) {
    return null;
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title || translateOrFallback(t, 'account_navigation', 'Account')}
      </div>

      <div className="space-y-2">
        {links.map((link) => {
          const Icon = resolveIcon(link.icon);
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-border bg-background hover:bg-muted/40'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>
                {translateOrFallback(t, link.labelKey, link.fallbackLabel)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
