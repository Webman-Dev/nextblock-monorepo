import type { AccountNavigationLink } from '@nextblock-cms/ecommerce';

export const profileAccountLinks: AccountNavigationLink[] = [
  {
    href: '/profile/orders',
    labelKey: 'account_orders',
    fallbackLabel: 'Orders',
    icon: 'orders',
  },
  {
    href: '/profile/password',
    labelKey: 'change_my_password',
    fallbackLabel: 'Change my password',
    icon: 'password',
  },
];
