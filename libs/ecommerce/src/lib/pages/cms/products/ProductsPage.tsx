import { Button } from '@nextblock-cms/ui';
import Link from 'next/link';
import { getProducts } from './actions';
import { ProductsBulkTable } from './components/ProductsBulkTable';
import { SyncFreemiusButton } from './components/SyncFreemiusButton';
import {
  bulkDeleteProductsAction,
  bulkDraftProductsAction,
  deleteProductAction,
} from './server-actions';
import { getActiveLanguagesServerSide, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

export async function ProductsPage({ 
  searchParams, 
  languageFilterNode,
  transferControlsNode,
}: { 
  searchParams?: { lang?: string }, 
  languageFilterNode?: React.ReactNode,
  transferControlsNode?: React.ReactNode,
}) {
  const supabase = getServiceRoleSupabaseClient();
  const [allLanguages, { data: currencies }] = await Promise.all([
    getActiveLanguagesServerSide(),
    supabase
      .from('currencies')
      .select('code, is_default')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('code', { ascending: true }),
  ]);
  const selectedLangId = searchParams?.lang ? parseInt(searchParams.lang, 10) : undefined;
  
  const { data: products } = await getProducts({ languageId: selectedLangId });
  
  const languageLabels = Object.fromEntries(
    allLanguages.map((language) => [String(language.id), language.code.toUpperCase()])
  );
  const defaultCurrencyCode =
    currencies?.find((currency) => currency.is_default)?.code || currencies?.[0]?.code || 'USD';

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
          {transferControlsNode}
          {languageFilterNode}
          <SyncFreemiusButton title="Sync Full Store" />
          <Link href="/cms/products/new">
            <Button>New Product</Button>
          </Link>
        </div>
      </div>

      <ProductsBulkTable
        products={(products || []) as any[]}
        languageLabels={languageLabels}
        defaultCurrencyCode={defaultCurrencyCode}
        deleteProductAction={deleteProductAction}
        bulkDeleteProductsAction={bulkDeleteProductsAction}
        bulkDraftProductsAction={bulkDraftProductsAction}
      />
    </div>
  );
}
