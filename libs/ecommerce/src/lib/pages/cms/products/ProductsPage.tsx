import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nextblock-cms/ui';
import Link from 'next/link';
import Image from 'next/image';
import { getProducts } from './actions';
import { DeleteProductButton } from './components/DeleteProductButton';
import { SyncFreemiusButton } from './components/SyncFreemiusButton';
import { deleteProductAction } from './server-actions';
import { formatPrice } from '@nextblock-cms/utils';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';
const resolveMediaUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (path.startsWith('http')) {
    return path;
  }

  if (!R2_BASE_URL) {
    return path;
  }

  return `${R2_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

import { Badge } from '@nextblock-cms/ui';
import { getActiveLanguagesServerSide, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

export async function ProductsPage({ 
  searchParams, 
  languageFilterNode 
}: { 
  searchParams?: { lang?: string }, 
  languageFilterNode?: React.ReactNode 
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
  
  const langMap = new Map(allLanguages.map(l => [l.id, l.code.toUpperCase()]));
  const defaultCurrencyCode =
    currencies?.find((currency) => currency.is_default)?.code || currencies?.[0]?.code || 'USD';

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
          {languageFilterNode}
          <SyncFreemiusButton title="Sync Full Store" />
          <Link href="/cms/products/new">
            <Button>New Product</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products && products.length > 0 ? (
              products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {resolveMediaUrl(
                      product.product_media?.[0]?.media?.file_path ||
                        product.product_media?.[0]?.media?.object_key
                    ) ? (
                      <Image
                        src={
                          resolveMediaUrl(
                            product.product_media[0].media.file_path ||
                              product.product_media[0].media.object_key
                          ) as string
                        }
                        alt={product.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        No Img
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/cms/products/${product.id}/edit`} className="hover:underline">
                      {product.title}
                    </Link>
                  </TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-2">
                      <span className={product.sale_price ? 'font-semibold text-primary' : ''}>
                        {typeof (product.sale_price ?? product.price) === 'number'
                          ? formatPrice(product.sale_price ?? product.price, defaultCurrencyCode)
                          : 'N/A'}
                      </span>
                      {product.sale_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.price, defaultCurrencyCode)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {langMap.get(product.language_id) || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : product.status === 'archived'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2 items-center">
                    {product.slug ? (
                      <Link href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          View Product
                        </Button>
                      </Link>
                    ) : null}
                    <Link href={`/cms/products/${product.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <DeleteProductButton
                      productName={product.title}
                      isIcon
                      deleteAction={deleteProductAction.bind(null, product.id)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
