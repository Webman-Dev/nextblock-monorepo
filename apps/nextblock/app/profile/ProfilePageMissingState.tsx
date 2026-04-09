'use client';

import { useTranslations } from '@nextblock-cms/utils';

export function ProfilePageMissingState() {
  const { t } = useTranslations();

  return <div>{t('profile_not_found')}</div>;
}
