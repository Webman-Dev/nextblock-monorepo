'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type {
  GlobalSearchFilter,
  GlobalSearchResponse,
  GlobalSearchResult,
} from '../lib/search/types';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export function useGlobalSearch({
  initialQuery = '',
  initialFilter = 'all',
  limit = 12,
}: {
  initialQuery?: string;
  initialFilter?: GlobalSearchFilter;
  limit?: number;
} = {}) {
  const { currentLocale } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<GlobalSearchFilter>(initialFilter);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [counts, setCounts] = useState<GlobalSearchResponse['counts']>({
    all: 0,
    page: 0,
    post: 0,
    product: 0,
  });
  const [status, setStatus] = useState<SearchStatus>('idle');

  const normalizedQuery = useMemo(() => query.replace(/\s+/g, ' ').trim(), [query]);
  const canSearch = normalizedQuery.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setCounts({ all: 0, page: 0, post: 0, product: 0 });
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setStatus('loading');

      const params = new URLSearchParams({
        q: normalizedQuery,
        type: filter,
        limit: String(limit),
      });

      if (currentLocale) {
        params.set('locale', currentLocale);
      }

      try {
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Search request failed with ${response.status}`);
        }

        const payload = (await response.json()) as GlobalSearchResponse;
        setResults(payload.results);
        setCounts(payload.counts);
        setStatus('success');
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }

        console.error('Global search request failed:', error);
        setResults([]);
        setCounts({ all: 0, page: 0, post: 0, product: 0 });
        setStatus('error');
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [canSearch, currentLocale, filter, limit, normalizedQuery]);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    counts,
    status,
    canSearch,
    isLoading: status === 'loading',
  };
}
