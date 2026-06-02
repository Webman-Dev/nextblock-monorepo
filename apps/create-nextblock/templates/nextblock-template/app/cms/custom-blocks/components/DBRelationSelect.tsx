'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { Badge, Button, Input } from '@nextblock-cms/ui';
import { resolveMediaUrl } from '../../../../lib/media/resolveMediaUrl';

export type DBRelationOption = {
  description: string | null;
  label: string;
  record: Record<string, unknown>;
  table: string;
  value: string;
};

export type DBRelationValue = string | string[] | null;

export type DBRelationSelectProps = {
  disabled?: boolean;
  displayColumn?: string;
  filters?: Record<string, unknown>;
  multiple?: boolean;
  onChange: (value: DBRelationValue, selectedRecords?: DBRelationOption[]) => void;
  table: string;
  value?: DBRelationValue;
  valueColumn?: string;
};

type RelationApiResponse = {
  error?: string;
  items?: DBRelationOption[];
};

const RELATION_REQUEST_TIMEOUT_MS = 8000;

function normalizeValue(value: DBRelationValue, multiple: boolean) {
  if (multiple) {
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  return typeof value === 'string' && value ? [value] : [];
}

function sameValues(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function DBRelationSelect({
  disabled = false,
  displayColumn,
  filters,
  multiple = false,
  onChange,
  table,
  value = multiple ? [] : null,
  valueColumn = 'id',
}: DBRelationSelectProps) {
  const selectedValues = useMemo(() => normalizeValue(value, multiple), [multiple, value]);
  const [options, setOptions] = useState<DBRelationOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<DBRelationOption[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  
  const [languages, setLanguages] = useState<any[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('all');

  useEffect(() => {
    const hasLanguage = ['pages', 'posts', 'products', 'product_variants'].includes(table);
    if (!hasLanguage) return;

    fetch('/api/custom-blocks/db-relations?table=languages')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items) {
          setLanguages(data.items);
          const defaultLang = data.items.find((l: any) => l.record?.is_default);
          if (defaultLang) {
            setSelectedLanguageId(String(defaultLang.value));
          }
        }
      })
      .catch((err) => console.error('Error fetching languages for filter:', err));
  }, [table]);

  const buildParams = useCallback(
    (extra: Record<string, string>) => {
      const params = new URLSearchParams({
        table,
        valueColumn,
        ...extra,
      });

      if (displayColumn) {
        params.set('displayColumn', displayColumn);
      }

      const mergedFilters = { ...filters };
      if (['pages', 'posts', 'products', 'product_variants'].includes(table) && selectedLanguageId !== 'all') {
        mergedFilters.language_id = Number(selectedLanguageId);
      }

      if (Object.keys(mergedFilters).length > 0) {
        params.set('filters', JSON.stringify(mergedFilters));
      }

      return params;
    },
    [displayColumn, filters, table, valueColumn, selectedLanguageId]
  );

  const fetchOptions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(
        () => controller.abort(new Error('Relation request timed out.')),
        RELATION_REQUEST_TIMEOUT_MS
      );
      const params = buildParams({ limit: '20', q: query.trim() });
      const response = await fetch(`/api/custom-blocks/db-relations?${params.toString()}`, {
        cache: 'no-store',
        method: 'GET',
        signal: controller.signal,
      });
      const payload = (await response.json()) as RelationApiResponse;

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        setOptions([]);
        setError(payload.error || 'Could not load relation rows.');
        return;
      }

      setOptions(payload.items ?? []);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error('[DBRelationSelect] Failed to load rows:', fetchError);
      setOptions([]);
      setError(
        fetchError instanceof Error && fetchError.message === 'Relation request timed out.'
          ? 'The relation lookup took too long. Please retry.'
          : 'Could not load relation rows.'
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [buildParams, query]);

  const fetchSelectedOptions = useCallback(async () => {
    if (selectedValues.length === 0) {
      setSelectedOptions([]);
      return;
    }

    const params = buildParams({
      limit: String(selectedValues.length),
      values: selectedValues.join(','),
    });
    const response = await fetch(`/api/custom-blocks/db-relations?${params.toString()}`, {
      cache: 'no-store',
      method: 'GET',
    });
    const payload = (await response.json()) as RelationApiResponse;

    if (response.ok) {
      setSelectedOptions(payload.items ?? []);
    }
  }, [buildParams, selectedValues]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchOptions();
    }, 180);

    return () => clearTimeout(timeout);
  }, [fetchOptions]);

  useEffect(() => {
    void fetchSelectedOptions();
  }, [fetchSelectedOptions]);

  function emitSelection(nextValues: string[], option?: DBRelationOption) {
    const nextSelectedOptions = option
      ? [
          ...selectedOptions.filter((selected) => nextValues.includes(selected.value)),
          option,
        ].filter(
          (selected, index, self) =>
            index === self.findIndex((candidate) => candidate.value === selected.value)
        )
      : selectedOptions.filter((selected) => nextValues.includes(selected.value));

    setSelectedOptions(nextSelectedOptions);

    if (multiple) {
      onChange(nextValues, nextSelectedOptions);
      return;
    }

    onChange(nextValues[0] ?? null, nextSelectedOptions.slice(0, 1));
  }

  function toggleOption(option: DBRelationOption) {
    if (disabled) {
      return;
    }

    if (!multiple) {
      emitSelection([option.value], option);
      return;
    }

    const isSelected = selectedValues.includes(option.value);
    const nextValues = isSelected
      ? selectedValues.filter((selectedValue) => selectedValue !== option.value)
      : [...selectedValues, option.value];

    emitSelection(nextValues, isSelected ? undefined : option);
  }

  function clearValue(targetValue?: string) {
    if (disabled) {
      return;
    }

    if (!targetValue) {
      emitSelection([]);
      return;
    }

    emitSelection(selectedValues.filter((selectedValue) => selectedValue !== targetValue));
  }

  const mergedOptions = useMemo(() => {
    const map = new Map<string, DBRelationOption>();
    [...selectedOptions, ...options].forEach((option) => map.set(option.value, option));
    return Array.from(map.values());
  }, [options, selectedOptions]);

  const showLanguageFilter = ['pages', 'posts', 'products', 'product_variants'].includes(table);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${table}`}
            type="search"
            value={query}
            className="pl-9"
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        {showLanguageFilter && languages.length > 0 && (
          <select
            disabled={disabled}
            value={selectedLanguageId}
            onChange={(e) => setSelectedLanguageId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Languages</option>
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => {
            const objectKey = option.record?.object_key || (option.record?.image as any)?.object_key;
            return (
              <Badge key={option.value} variant="secondary" className="gap-1.5 pr-1 py-0.5 flex items-center">
                {objectKey && (
                  <div className="flex-shrink-0 h-4 w-4 rounded-full overflow-hidden flex items-center justify-center border border-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={resolveMediaUrl(String(objectKey)) ?? undefined} 
                      alt="" 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                )}
                <span className="max-w-44 truncate">{option.label}</span>
                <button
                  aria-label={`Remove ${option.label}`}
                  className="rounded p-0.5 hover:bg-background"
                  disabled={disabled}
                  onClick={() => clearValue(option.value)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}

      <div className="max-h-56 overflow-y-auto rounded-md border">
        {error ? (
          <div className="p-3 text-sm text-destructive">{error}</div>
        ) : mergedOptions.length === 0 && !isLoading ? (
          <div className="p-3 text-sm text-muted-foreground">No relation rows found.</div>
        ) : (
          mergedOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            const objectKey = option.record?.object_key || (option.record?.image as any)?.object_key;
            return (
              <button
                className="flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted disabled:opacity-60"
                disabled={disabled}
                key={option.value}
                onClick={() => toggleOption(option)}
                type="button"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </span>
                {objectKey && (
                  <div className="flex-shrink-0 h-8 w-8 bg-muted rounded overflow-hidden flex items-center justify-center border border-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={resolveMediaUrl(String(objectKey)) ?? undefined} 
                      alt="" 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>

      {!multiple && selectedValues.length > 0 ? (
        <Button
          disabled={disabled || sameValues(selectedValues, [])}
          onClick={() => clearValue()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="mr-2 h-4 w-4" />
          Clear relation
        </Button>
      ) : null}
    </div>
  );
}
