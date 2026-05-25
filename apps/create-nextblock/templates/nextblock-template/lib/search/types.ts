export type GlobalSearchResultType = 'page' | 'post' | 'product';

export type GlobalSearchFilter = GlobalSearchResultType | 'all';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  description: string | null;
  snippet: string | null;
  href: string;
  locale: string | null;
  imageUrl: string | null;
  score: number;
  meta: {
    label?: string | null;
    sku?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
  };
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  counts: Record<GlobalSearchResultType | 'all', number>;
}
