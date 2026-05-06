'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Clock3,
  FileText,
  Loader2,
  Newspaper,
  Package,
  Search,
} from 'lucide-react';
import {
  Button,
} from '@nextblock-cms/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@nextblock-cms/ui/dialog';
import {
  Input,
} from '@nextblock-cms/ui/input';
import { cn, useTranslations } from '@nextblock-cms/utils';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from 'react';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import type {
  GlobalSearchFilter,
  GlobalSearchResult,
  GlobalSearchResultType,
} from '../lib/search/types';

const RECENT_SEARCH_RESULTS_KEY = 'nextblock_recent_search_results';

const fallbackTranslations: Record<string, Record<string, string>> = {
  en: {
    'global_search.trigger': 'Search',
    'global_search.title': 'Search',
    'global_search.description': 'Search published pages, posts, and products.',
    'global_search.placeholder': 'Search...',
    'global_search.filter_all': 'All',
    'global_search.filter_pages': 'Pages',
    'global_search.filter_posts': 'Posts',
    'global_search.filter_products': 'Products',
    'global_search.result_page': 'Page',
    'global_search.result_post': 'Post',
    'global_search.result_product': 'Product',
    'global_search.recent': 'Recent',
    'global_search.error_title': 'Search is unavailable.',
    'global_search.error_description': 'Please try again in a moment.',
    'global_search.empty_title': 'No results found.',
    'global_search.empty_description': 'Try another search term.',
  },
  fr: {
    'global_search.trigger': 'Rechercher',
    'global_search.title': 'Rechercher',
    'global_search.description': 'Rechercher dans les pages, articles et produits publies.',
    'global_search.placeholder': 'Rechercher...',
    'global_search.filter_all': 'Tout',
    'global_search.filter_pages': 'Pages',
    'global_search.filter_posts': 'Articles',
    'global_search.filter_products': 'Produits',
    'global_search.result_page': 'Page',
    'global_search.result_post': 'Article',
    'global_search.result_product': 'Produit',
    'global_search.recent': 'Recents',
    'global_search.error_title': 'La recherche est indisponible.',
    'global_search.error_description': 'Veuillez reessayer dans un instant.',
    'global_search.empty_title': 'Aucun resultat trouve.',
    'global_search.empty_description': 'Essayez un autre terme de recherche.',
  },
};

type TriggerVariant = 'desktop' | 'mobile';

type SearchTypeConfig = {
  value: GlobalSearchFilter;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

const typeConfigs: SearchTypeConfig[] = [
  { value: 'all', labelKey: 'global_search.filter_all', icon: Search },
  { value: 'page', labelKey: 'global_search.filter_pages', icon: FileText },
  { value: 'post', labelKey: 'global_search.filter_posts', icon: Newspaper },
  { value: 'product', labelKey: 'global_search.filter_products', icon: Package },
];

const resultTypeConfig: Record<
  GlobalSearchResultType,
  {
    labelKey: string;
    icon: ComponentType<{ className?: string }>;
    tileClassName: string;
    badgeClassName: string;
  }
> = {
  page: {
    labelKey: 'global_search.result_page',
    icon: FileText,
    tileClassName: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
    badgeClassName:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200',
  },
  post: {
    labelKey: 'global_search.result_post',
    icon: Newspaper,
    tileClassName: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200',
    badgeClassName:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200',
  },
  product: {
    labelKey: 'global_search.result_product',
    icon: Package,
    tileClassName:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length >= 2)
    .slice(0, 6);

  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;
        const isMatch = terms.some((term) => term.toLowerCase() === part.toLowerCase());

        return isMatch ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-sm bg-primary/10 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </span>
  );
}

function loadRecentResults() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCH_RESULTS_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as GlobalSearchResult[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecentResult(result: GlobalSearchResult) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextResults = [
    result,
    ...loadRecentResults().filter((item) => item.href !== result.href),
  ].slice(0, 5);

  window.localStorage.setItem(RECENT_SEARCH_RESULTS_KEY, JSON.stringify(nextResults));
}

function ResultThumbnail({ result }: { result: GlobalSearchResult }) {
  const config = resultTypeConfig[result.type];
  const Icon = config.icon;

  if (result.imageUrl) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
        <Image
          src={result.imageUrl}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-md',
        config.tileClassName
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function SearchResultRow({
  result,
  query,
  isActive,
  onSelect,
  resultTypeLabel,
}: {
  result: GlobalSearchResult;
  query: string;
  isActive: boolean;
  onSelect: (result: GlobalSearchResult) => void;
  resultTypeLabel: string;
}) {
  const config = resultTypeConfig[result.type];
  const supportingMeta = result.meta.sku || result.meta.label || result.locale?.toUpperCase();

  return (
    <button
      type="button"
      className={cn(
        'group flex w-full items-center gap-3 rounded-md border border-transparent p-3 text-left transition-colors',
        isActive
          ? 'border-border bg-accent text-accent-foreground'
          : 'hover:bg-accent/70 hover:text-accent-foreground'
      )}
      onClick={() => onSelect(result)}
    >
      <ResultThumbnail result={result} />
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            <Highlight text={result.title} query={query} />
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
              config.badgeClassName
            )}
          >
            {resultTypeLabel}
          </span>
        </span>
        <span className="block min-w-0 truncate text-xs text-muted-foreground">
          <Highlight
            text={result.snippet || result.description || result.href}
            query={query}
          />
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{result.href}</span>
          {supportingMeta ? (
            <>
              <span aria-hidden="true">/</span>
              <span className="shrink-0">{supportingMeta}</span>
            </>
          ) : null}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`global-search-loading-row-${index}`}
          className="flex h-[88px] items-center gap-3 rounded-md p-3"
        >
          <div className="h-12 w-12 rounded-md bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GlobalSearch({
  isEcommerceActive,
  variant,
  openOnMount = false,
}: {
  isEcommerceActive: boolean;
  variant: TriggerVariant;
  openOnMount?: boolean;
}) {
  const router = useRouter();
  const { t, lang } = useTranslations();
  const [open, setOpen] = useState(openOnMount);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentResults, setRecentResults] = useState<GlobalSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    counts,
    status,
    canSearch,
    isLoading,
  } = useGlobalSearch({ limit: 12 });

  const availableTypeConfigs = useMemo(
    () => typeConfigs.filter((config) => config.value !== 'product' || isEcommerceActive),
    [isEcommerceActive]
  );
  const displayedResults = canSearch ? results : recentResults;
  const showRecent = !canSearch && recentResults.length > 0;
  const tx = (key: string) => {
    const translated = t(key);
    if (translated !== key) {
      return translated;
    }

    return fallbackTranslations[lang]?.[key] ?? fallbackTranslations.en[key] ?? key;
  };

  useEffect(() => {
    if (openOnMount) {
      setOpen(true);
    }
  }, [openOnMount]);

  useEffect(() => {
    setRecentResults(loadRecentResults());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusId = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusId);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filter, query, results.length, open]);

  const handleSelect = (result: GlobalSearchResult) => {
    saveRecentResult(result);
    setRecentResults(loadRecentResults());
    setOpen(false);
    router.push(result.href);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (displayedResults.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % displayedResults.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        current === 0 ? displayedResults.length - 1 : current - 1
      );
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleSelect(displayedResults[activeIndex] || displayedResults[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size={variant === 'mobile' ? 'icon' : 'default'}
        className={cn(
          'shrink-0 border-foreground/15 bg-background/70',
          variant === 'desktop' && 'h-9 gap-2 px-3 text-sm',
          variant === 'mobile' && 'h-10 w-10'
        )}
        aria-label={tx('global_search.trigger')}
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        {variant === 'desktop' ? <span>{tx('global_search.trigger')}</span> : null}
      </Button>

      <DialogContent className="flex h-[min(820px,calc(100dvh-2rem))] max-w-4xl flex-col overflow-hidden rounded-lg p-0">
        <DialogTitle className="sr-only">{tx('global_search.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {tx('global_search.description')}
        </DialogDescription>

        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={tx('global_search.placeholder')}
              className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
              spellCheck={false}
            />
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {availableTypeConfigs.map((config) => {
              const Icon = config.icon;
              const count = counts[config.value] ?? 0;

              return (
                <button
                  key={config.value}
                  type="button"
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors',
                    filter === config.value
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  onClick={() => setFilter(config.value)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tx(config.labelKey)}</span>
                  {canSearch && count > 0 ? (
                    <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading ? <LoadingRows /> : null}

          {!isLoading && status === 'error' ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                {tx('global_search.error_title')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tx('global_search.error_description')}
              </p>
            </div>
          ) : null}

          {!isLoading && status !== 'error' && displayedResults.length > 0 ? (
            <div className="space-y-1">
              {showRecent ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {tx('global_search.recent')}
                </div>
              ) : null}
              {displayedResults.map((result, index) => (
                <SearchResultRow
                  key={`${result.type}-${result.id}`}
                  result={result}
                  query={query}
                  isActive={index === activeIndex}
                  onSelect={handleSelect}
                  resultTypeLabel={tx(resultTypeConfig[result.type].labelKey)}
                />
              ))}
            </div>
          ) : null}

          {!isLoading && status !== 'error' && canSearch && results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                {tx('global_search.empty_title')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tx('global_search.empty_description')}
              </p>
            </div>
          ) : null}

          {!isLoading && status === 'idle' && recentResults.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {tx('global_search.title')}
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
