const KNOWN_SNAKE_CASE_CATEGORIES = [
  'auth',
  'ecommerce',
  'profile',
  'checkout',
  'cms',
  'theme',
  'sandbox',
  'demo',
] as const;

export type TranslationCategory =
  | (typeof KNOWN_SNAKE_CASE_CATEGORIES)[number]
  | (string & {});

export type TranslationStatusFilter = 'all' | 'missing' | 'translated';
export type TranslationSortOption =
  | 'category-key'
  | 'missing-first'
  | 'recently-updated';

export interface TranslationWorkspaceItem {
  key: string;
  translations: Record<string, string>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TranslationWorkspaceLanguageLike {
  code: string;
  name?: string | null;
}

export type TranslationCsvImportResult =
  | {
      success: true;
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
      createdRows: TranslationWorkspaceItem[];
      updatedRows: TranslationWorkspaceItem[];
    }
  | {
      success: false;
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
      error: string;
    };

export interface FilterAndSortTranslationsOptions {
  items: TranslationWorkspaceItem[];
  categoryFilter: string;
  searchTerm: string;
  selectedLanguageCode: string;
  sortOption: TranslationSortOption;
  statusFilter: TranslationStatusFilter;
}

function normalizeCsvHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function normalizeTranslationKey(value: string) {
  return value.replace(/^\uFEFF/, '').trim();
}

function compareAlphabetically(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

export function deriveTranslationCategory(key: string): TranslationCategory {
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    return 'general';
  }

  if (trimmedKey.includes('.')) {
    const dottedPrefix = trimmedKey.split('.')[0]?.trim().toLowerCase();
    return (dottedPrefix || 'general') as TranslationCategory;
  }

  const snakeCaseCategory = KNOWN_SNAKE_CASE_CATEGORIES.find((category) =>
    trimmedKey.toLowerCase().startsWith(`${category}_`)
  );

  return snakeCaseCategory ?? 'general';
}

export function formatTranslationCategoryLabel(category: string) {
  const normalizedCategory = category.trim();

  if (!normalizedCategory) {
    return 'General';
  }

  if (normalizedCategory.toLowerCase() === 'cms') {
    return 'CMS';
  }

  return normalizedCategory
    .split(/[-_.]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function getOrderedTranslationLanguageCodes(
  languages: TranslationWorkspaceLanguageLike[]
) {
  const seen = new Set<string>();
  const orderedCodes: string[] = [];

  const englishCode = languages.find(
    (language) => language.code.trim().toLowerCase() === 'en'
  )?.code;

  if (englishCode) {
    orderedCodes.push(englishCode);
    seen.add('en');
  }

  for (const language of languages) {
    const trimmedCode = language.code.trim();
    const normalizedCode = trimmedCode.toLowerCase();

    if (!trimmedCode || seen.has(normalizedCode)) {
      continue;
    }

    seen.add(normalizedCode);
    orderedCodes.push(trimmedCode);
  }

  return orderedCodes;
}

export function getTranslationValue(
  item: TranslationWorkspaceItem,
  languageCode: string
) {
  return item.translations[languageCode] ?? '';
}

export function isTranslationMissing(
  item: TranslationWorkspaceItem,
  languageCode: string
) {
  return getTranslationValue(item, languageCode).trim().length === 0;
}

export function getTranslationCategoryOptions(items: TranslationWorkspaceItem[]) {
  return Array.from(
    new Set(items.map((item) => deriveTranslationCategory(item.key)))
  ).sort(compareAlphabetically);
}

function matchesSearch(
  item: TranslationWorkspaceItem,
  selectedLanguageCode: string,
  normalizedSearchTerm: string
) {
  if (!normalizedSearchTerm) {
    return true;
  }

  const searchHaystack = [
    item.key,
    getTranslationValue(item, 'en'),
    getTranslationValue(item, selectedLanguageCode),
  ]
    .join(' ')
    .toLowerCase();

  return searchHaystack.includes(normalizedSearchTerm);
}

function compareByUpdatedAtDescending(
  left: TranslationWorkspaceItem,
  right: TranslationWorkspaceItem
) {
  const leftTime = left.updated_at ? new Date(left.updated_at).getTime() : 0;
  const rightTime = right.updated_at ? new Date(right.updated_at).getTime() : 0;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return compareAlphabetically(left.key, right.key);
}

function compareByMissingState(
  left: TranslationWorkspaceItem,
  right: TranslationWorkspaceItem,
  selectedLanguageCode: string
) {
  const leftMissing = isTranslationMissing(left, selectedLanguageCode);
  const rightMissing = isTranslationMissing(right, selectedLanguageCode);

  if (leftMissing !== rightMissing) {
    return leftMissing ? -1 : 1;
  }

  return compareAlphabetically(left.key, right.key);
}

export function filterAndSortTranslations({
  items,
  categoryFilter,
  searchTerm,
  selectedLanguageCode,
  sortOption,
  statusFilter,
}: FilterAndSortTranslationsOptions) {
  const normalizedCategoryFilter = categoryFilter.trim().toLowerCase();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return [...items]
    .filter((item) => {
      const itemCategory = deriveTranslationCategory(item.key).toLowerCase();

      if (normalizedCategoryFilter && normalizedCategoryFilter !== 'all') {
        if (itemCategory !== normalizedCategoryFilter) {
          return false;
        }
      }

      const missing = isTranslationMissing(item, selectedLanguageCode);

      if (statusFilter === 'missing' && !missing) {
        return false;
      }

      if (statusFilter === 'translated' && missing) {
        return false;
      }

      return matchesSearch(item, selectedLanguageCode, normalizedSearchTerm);
    })
    .sort((left, right) => {
      if (sortOption === 'recently-updated') {
        return compareByUpdatedAtDescending(left, right);
      }

      if (sortOption === 'missing-first') {
        return compareByMissingState(left, right, selectedLanguageCode);
      }

      return compareAlphabetically(left.key, right.key);
    });
}

export function groupTranslationsByCategory(items: TranslationWorkspaceItem[]) {
  const groupedItems = new Map<TranslationCategory, TranslationWorkspaceItem[]>();

  for (const item of items) {
    const category = deriveTranslationCategory(item.key);
    const existingItems = groupedItems.get(category) ?? [];
    existingItems.push(item);
    groupedItems.set(category, existingItems);
  }

  return Array.from(groupedItems.entries())
    .sort(([leftCategory], [rightCategory]) =>
      compareAlphabetically(leftCategory, rightCategory)
    )
    .map(([category, groupedTranslations]) => ({
      category,
      items: groupedTranslations,
    }));
}

function escapeCsvValue(value: string | number) {
  const normalizedValue = String(value ?? '');

  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

export function buildTranslationsCsvContent(
  items: TranslationWorkspaceItem[],
  languageCodes: string[]
) {
  const header = ['key', 'category', ...languageCodes];
  const rows = items.map((item) => [
    item.key,
    deriveTranslationCategory(item.key),
    ...languageCodes.map((languageCode) => getTranslationValue(item, languageCode)),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
}

export function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      if (currentValue.length > 0 || currentRow.length > 0) {
        currentRow.push(currentValue);
        rows.push(currentRow);
      }

      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim().length > 0));
}

interface PrepareTranslationCsvImportOptions {
  csvText: string;
  existingItems: TranslationWorkspaceItem[];
  languageCodes: string[];
}

export function prepareTranslationCsvImport({
  csvText,
  existingItems,
  languageCodes,
}: PrepareTranslationCsvImportOptions): TranslationCsvImportResult {
  const parsedRows = parseCsvRows(csvText);

  if (parsedRows.length < 2) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: 'The CSV file is empty.',
    };
  }

  const [headerRow, ...dataRows] = parsedRows;
  const normalizedHeaders = headerRow.map(normalizeCsvHeader);
  const allowedLanguageCodeMap = new Map(
    languageCodes.map((code) => [code.trim().toLowerCase(), code.trim()])
  );
  const allowedHeaders = new Set<string>([
    'key',
    'category',
    ...allowedLanguageCodeMap.keys(),
  ]);
  const duplicateHeaders = new Set<string>();
  const blankHeaderIndexes: number[] = [];
  const seenHeaders = new Set<string>();

  normalizedHeaders.forEach((header, index) => {
    if (!header) {
      blankHeaderIndexes.push(index);
      return;
    }

    if (seenHeaders.has(header)) {
      duplicateHeaders.add(header);
      return;
    }

    seenHeaders.add(header);
  });

  if (duplicateHeaders.size > 0) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: `Duplicate CSV columns are not supported: ${Array.from(
        duplicateHeaders
      ).join(', ')}.`,
    };
  }

  const blankHeaderHasData = blankHeaderIndexes.some((columnIndex) =>
    dataRows.some((row) => (row[columnIndex] ?? '').trim().length > 0)
  );

  if (blankHeaderHasData) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error:
        'The CSV format is invalid. One or more columns contain data but have no header.',
    };
  }

  const unknownHeaders = normalizedHeaders.filter(
    (header) => header && !allowedHeaders.has(header)
  );

  if (unknownHeaders.length > 0) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: `Unknown CSV column(s): ${unknownHeaders.join(
        ', '
      )}. Only key, category, and configured language codes are supported.`,
    };
  }

  const keyIndex = normalizedHeaders.indexOf('key');
  const languageColumns = normalizedHeaders.flatMap((header, index) => {
    const languageCode = allowedLanguageCodeMap.get(header);

    return languageCode ? [{ index, languageCode }] : [];
  });

  if (keyIndex === -1) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error:
        'The CSV format is invalid. Please include the key column from the exported file.',
    };
  }

  if (languageColumns.length === 0) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error:
        'The CSV format is invalid. Include at least one configured language column.',
    };
  }

  const existingItemsByKey = new Map(
    existingItems.map((item) => [item.key, item] as const)
  );
  const seenKeys = new Set<string>();
  const createdRows: TranslationWorkspaceItem[] = [];
  const updatedRows: TranslationWorkspaceItem[] = [];
  let skippedCount = 0;

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    const row = dataRows[rowIndex];
    const rowNumber = rowIndex + 2;
    const key = normalizeTranslationKey(row[keyIndex] ?? '');
    const rowHasData = row.some((value) => value.trim().length > 0);

    if (!key) {
      if (!rowHasData) {
        continue;
      }

      return {
        success: false,
        createdCount: 0,
        updatedCount: 0,
        skippedCount,
        error: `Row ${rowNumber} is missing a translation key.`,
      };
    }

    if (seenKeys.has(key)) {
      return {
        success: false,
        createdCount: 0,
        updatedCount: 0,
        skippedCount,
        error: `Row ${rowNumber} contains a duplicate key: ${key}.`,
      };
    }

    seenKeys.add(key);

    const existingItem = existingItemsByKey.get(key);
    const nextTranslations = existingItem
      ? { ...existingItem.translations }
      : ({} as Record<string, string>);
    let hasImportedValues = false;
    let hasChanges = false;

    for (const { index, languageCode } of languageColumns) {
      const rawValue = row[index] ?? '';

      if (rawValue.trim().length === 0) {
        continue;
      }

      hasImportedValues = true;

      if (nextTranslations[languageCode] !== rawValue) {
        nextTranslations[languageCode] = rawValue;
        hasChanges = true;
      }
    }

    if (!existingItem) {
      const englishValue = nextTranslations['en'] ?? '';

      if (!englishValue.trim()) {
        return {
          success: false,
          createdCount: 0,
          updatedCount: 0,
          skippedCount,
          error: `Row ${rowNumber} cannot create "${key}" without an English translation.`,
        };
      }

      createdRows.push({
        key,
        translations: nextTranslations,
        created_at: null,
        updated_at: null,
      });
      continue;
    }

    if (!hasImportedValues || !hasChanges) {
      skippedCount += 1;
      continue;
    }

    updatedRows.push({
      ...existingItem,
      translations: nextTranslations,
    });
  }

  return {
    success: true,
    createdCount: createdRows.length,
    updatedCount: updatedRows.length,
    skippedCount,
    createdRows,
    updatedRows,
  };
}
