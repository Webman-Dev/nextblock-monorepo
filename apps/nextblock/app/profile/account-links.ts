import type { AccountNavigationLink } from '@nextblock-cms/ecommerce';

const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';

export const profileAccountLinks: AccountNavigationLink[] = [
  {
    href: '/profile/orders',
    labelKey: 'account_orders',
    fallbackLabel: 'Orders',
    icon: 'orders',
  },
  ...(!isSandbox
    ? [
        {
          href: '/profile/password',
          labelKey: 'change_my_password',
          fallbackLabel: 'Change my password',
          icon: 'password' as const,
        },
      ]
    : []),
];
