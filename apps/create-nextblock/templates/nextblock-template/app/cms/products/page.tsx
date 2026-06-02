import { ProductsPage as ProductsPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import LanguageFilterSelect from '../components/LanguageFilterSelect';
import { ContentTransferControls } from '../import-export/ContentTransferControls';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  const resolvedSearchParams = await searchParams;
  const allLanguages = await getActiveLanguagesServerSide();
  const selectedLangId = resolvedSearchParams?.lang ? parseInt(resolvedSearchParams.lang, 10) : undefined;
  const isValidLangId = selectedLangId
    ? allLanguages.some((language) => language.id === selectedLangId)
    : true;
  const filterLangId = isValidLangId ? selectedLangId : undefined;

  return (
    <ProductsPageUI 
      searchParams={resolvedSearchParams} 
      transferControlsNode={
        <ContentTransferControls
          contentType="products"
          label="Products"
          languageId={filterLangId}
        />
      }
      languageFilterNode={
        <LanguageFilterSelect 
          allLanguages={allLanguages}
          currentFilterLangId={filterLangId}
          basePath="/cms/products"
        />
      }
    />
  );
}
