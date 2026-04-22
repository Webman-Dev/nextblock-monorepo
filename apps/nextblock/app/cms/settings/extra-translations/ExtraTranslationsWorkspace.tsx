'use client';

import {
  type FormEvent,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Textarea,
} from '@nextblock-cms/ui';
import {
  Download,
  FileSpreadsheet,
  Languages as LanguagesIcon,
  PlusCircle,
  Save,
  Search,
  Upload,
} from 'lucide-react';
import {
  buildTranslationsCsvContent,
  deriveTranslationCategory,
  filterAndSortTranslations,
  formatTranslationCategoryLabel,
  getOrderedTranslationLanguageCodes,
  getTranslationCategoryOptions,
  getTranslationValue,
  groupTranslationsByCategory,
  isTranslationMissing,
  type TranslationStatusFilter,
  type TranslationSortOption,
} from '@nextblock-cms/utils';

import { SubmitButton } from '../../../../components/submit-button';
import { useHotkeys } from '../../../../hooks/use-hotkeys';
import { createTranslation, importTranslationsCsvAction, updateTranslation } from './actions';

type Translation = Awaited<
  ReturnType<(typeof import('./actions'))['getTranslations']>
>[number];
type Language = NonNullable<
  Awaited<ReturnType<(typeof import('../languages/actions'))['getLanguages']>>['data']
>[number];

interface ExtraTranslationsWorkspaceProps {
  initialTranslations: Translation[];
  languages: Language[];
  initialLanguageCode: string;
  initialStatusFilter: TranslationStatusFilter;
}

function formatLanguageLabel(language: Language) {
  if (language.code.toLowerCase() === 'en') {
    return `${language.name} (${language.code.toUpperCase()})`;
  }

  return `${language.name} (${language.code.toUpperCase()})`;
}

function formatUpdatedAt(updatedAt?: string | null) {
  if (!updatedAt) {
    return 'Not updated yet';
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown update time';
  }

  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

function shouldUseTextarea(englishValue: string, currentValue: string) {
  return (
    englishValue.includes('\n') ||
    currentValue.includes('\n') ||
    englishValue.length > 90 ||
    currentValue.length > 90
  );
}

function buildImportSuccessMessage(params: {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
}) {
  return `Import complete: ${params.createdCount} created, ${params.updatedCount} updated, ${params.skippedCount} skipped.`;
}

function CreateTranslationDialog({
  onCreate,
}: {
  onCreate: (translation: Translation) => void;
}) {
  const [state, formAction, isPending] = useActionState(createTranslation, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useHotkeys(
    'ctrl+s',
    () => {
      if (open) {
        formRef.current?.requestSubmit();
      }
    },
    [open]
  );

  useEffect(() => {
    if (state && state.success && state.translation) {
      onCreate(state.translation);
      setOpen(false);
      formRef.current?.reset();
      toast.success(`Created translation key "${state.translation.key}".`);
    }
  }, [onCreate, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Translation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Translation</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              name="key"
              placeholder="e.g., ecommerce.shipping_eta"
              required
            />
            {state?.errors?.key ? (
              <p className="text-sm text-red-600">{state.errors.key[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="en">English</Label>
            <Textarea
              id="en"
              name="en"
              placeholder="English source text"
              required
            />
            {state?.errors?.en ? (
              <p className="text-sm text-red-600">{state.errors.en[0]}</p>
            ) : null}
          </div>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <SubmitButton pendingText="Creating..." disabled={isPending}>
              Create
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TranslationEditorCardProps {
  language: Language;
  translation: Translation;
  onUpdate: (translation: Translation) => void;
}

function TranslationEditorCard({
  language,
  translation,
  onUpdate,
}: TranslationEditorCardProps) {
  const [draftValue, setDraftValue] = useState(
    getTranslationValue(translation, language.code)
  );
  const [error, setError] = useState<string | null>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const englishValue = getTranslationValue(translation, 'en');
  const persistedValue = getTranslationValue(translation, language.code);
  const missing = isTranslationMissing(translation, language.code);
  const isDirty = draftValue !== persistedValue;
  const usesTextarea = shouldUseTextarea(englishValue, draftValue);
  const sourcePreview =
    language.code.toLowerCase() === 'en'
      ? 'English source'
      : englishValue || 'No English reference yet.';

  useEffect(() => {
    setDraftValue(persistedValue);
    setError(null);
  }, [language.code, persistedValue, translation.key]);

  useHotkeys(
    'ctrl+s',
    () => {
      if (hasFocus && isDirty && !isPending) {
        formRef.current?.requestSubmit();
      }
    },
    [draftValue, hasFocus, isDirty, isPending, language.code, translation.key]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isDirty) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('key', translation.key);
      formData.set(language.code, draftValue);

      const result = await updateTranslation(null, formData);

      if (!result || !result.success || !result.translation) {
        setError(result?.error ?? 'Failed to save translation.');
        return;
      }

      onUpdate(result.translation);
      toast.success(`Saved ${language.code.toUpperCase()} for ${translation.key}.`);
    });
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="space-y-2 p-3">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-xs font-semibold">
                {translation.key}
              </code>
              <Badge variant="outline">
                {formatTranslationCategoryLabel(
                  deriveTranslationCategory(translation.key)
                )}
              </Badge>
              <Badge variant={missing ? 'secondary' : 'outline'}>
                {missing ? 'Missing' : 'Translated'}
              </Badge>
              <span className="min-w-0 text-xs text-muted-foreground">
                Updated {formatUpdatedAt(translation.updated_at)}
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isDirty || isPending}
              onClick={() => setDraftValue(persistedValue)}
            >
              Reset
            </Button>
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div
              className="min-w-0 xl:w-80 rounded-md border bg-muted/30 px-3 py-2 text-xs center"
              title={sourcePreview}
            >
              <span className="mr-1 text-foreground">
                {language.code.toLowerCase() === 'en' ? 'Label:' : 'EN:'}
              </span>
              <span className="truncate font-medium">{sourcePreview}</span>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              {usesTextarea ? (
                <Textarea
                  id={`${translation.key}-${language.code}`}
                  rows={2}
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onFocus={() => setHasFocus(true)}
                  onBlur={() => setHasFocus(false)}
                  className="min-h-[44px] max-h-[72px] resize-y py-2"
                  placeholder={
                    language.code.toLowerCase() === 'en'
                      ? 'Enter English source text'
                      : `Enter ${language.name.toLowerCase()} translation`
                  }
                />
              ) : (
                <Input
                  id={`${translation.key}-${language.code}`}
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onFocus={() => setHasFocus(true)}
                  onBlur={() => setHasFocus(false)}
                  className="h-10"
                  placeholder={
                    language.code.toLowerCase() === 'en'
                      ? 'Enter English source text'
                      : `Enter ${language.name.toLowerCase()} translation`
                  }
                />
              )}

              <Button type="submit" size="sm" disabled={!isDirty || isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {isDirty ? (
            <p className="truncate text-xs text-muted-foreground">
              Unsaved changes. Press Ctrl/Cmd+S to save the active editor.
            </p>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function ExtraTranslationsWorkspace({
  initialTranslations,
  languages,
  initialLanguageCode,
  initialStatusFilter,
}: ExtraTranslationsWorkspaceProps) {
  const [translations, setTranslations] = useState(initialTranslations);
  const [selectedLanguageCode, setSelectedLanguageCode] =
    useState(initialLanguageCode);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] =
    useState<TranslationStatusFilter>(initialStatusFilter);
  const [sortOption, setSortOption] =
    useState<TranslationSortOption>('category-key');
  const [isImportPending, startImportTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedUrlState = useRef(false);

  const orderedLanguages = useMemo(() => {
    const orderedCodes = getOrderedTranslationLanguageCodes(languages);

    return orderedCodes
      .map((code) => languages.find((language) => language.code === code))
      .filter((language): language is Language => Boolean(language));
  }, [languages]);

  const selectedLanguage =
    orderedLanguages.find((language) => language.code === selectedLanguageCode) ??
    orderedLanguages[0] ??
    null;

  useEffect(() => {
    if (!selectedLanguage) {
      return;
    }

    if (!hasInitializedUrlState.current) {
      hasInitializedUrlState.current = true;
      return;
    }

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('language', selectedLanguage.code);

    if (statusFilter === 'all') {
      currentUrl.searchParams.delete('status');
    } else {
      currentUrl.searchParams.set('status', statusFilter);
    }

    window.history.replaceState(window.history.state, '', currentUrl);
  }, [selectedLanguage, statusFilter]);

  useEffect(() => {
    if (!selectedLanguage && orderedLanguages.length > 0) {
      setSelectedLanguageCode(orderedLanguages[0].code);
    }
  }, [orderedLanguages, selectedLanguage]);

  const categoryOptions = useMemo(
    () => getTranslationCategoryOptions(translations),
    [translations]
  );

  const visibleTranslations = useMemo(() => {
    if (!selectedLanguage) {
      return [];
    }

    return filterAndSortTranslations({
      items: translations,
      categoryFilter,
      searchTerm,
      selectedLanguageCode: selectedLanguage.code,
      sortOption,
      statusFilter,
    });
  }, [
    categoryFilter,
    searchTerm,
    selectedLanguage,
    sortOption,
    statusFilter,
    translations,
  ]);

  const groupedTranslations = useMemo(
    () => groupTranslationsByCategory(visibleTranslations),
    [visibleTranslations]
  );

  const missingCount = useMemo(() => {
    if (!selectedLanguage) {
      return 0;
    }

    return translations.filter((translation) =>
      isTranslationMissing(translation, selectedLanguage.code)
    ).length;
  }, [selectedLanguage, translations]);

  const handleDownloadCsv = () => {
    const csv = buildTranslationsCsvContent(
      translations,
      orderedLanguages.map((language) => language.code)
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'extra-translations-export.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    const csvText = await file.text();

    startImportTransition(async () => {
      const result = await importTranslationsCsvAction(csvText);

      if (!result.success) {
        toast.error(result.error ?? 'Failed to import translation CSV.');
        return;
      }

      setTranslations(result.translations);
      toast.success(
        buildImportSuccessMessage({
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
        })
      );
    });
  };

  if (!selectedLanguage) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Add at least one language before managing extra translations.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Extra Translations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Search by key or source text, focus on one language at a time, and
            round-trip the full translation set through CSV.
          </p>
        </div>
        <CreateTranslationDialog
          onCreate={(translation) =>
            setTranslations((previousTranslations) =>
              [...previousTranslations, translation].sort((left, right) =>
                left.key.localeCompare(right.key)
              )
            )
          }
        />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Translation Workspace</CardTitle>
              <CardDescription>
                English stays visible as the source reference while you edit one
                target language at a time.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void handleImportFile(file);
                  }

                  event.currentTarget.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isImportPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImportPending ? 'Importing...' : 'Import CSV'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={translations.length === 0 || isImportPending}
                onClick={handleDownloadCsv}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{translations.length} total keys</Badge>
            <Badge variant="secondary">{visibleTranslations.length} visible</Badge>
            <Badge variant="secondary">
              {missingCount} missing in {selectedLanguage.code.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by key, English text, or selected translation..."
                className="pl-9"
              />
            </div>

            <Select
              value={selectedLanguage.code}
              onValueChange={setSelectedLanguageCode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {orderedLanguages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {formatLanguageLabel(language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {formatTranslationCategoryLabel(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as TranslationStatusFilter)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="missing">Missing Only</SelectItem>
                <SelectItem value="translated">Translated Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOption}
              onValueChange={(value) =>
                setSortOption(value as TranslationSortOption)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category-key">Category + Key</SelectItem>
                <SelectItem value="missing-first">Missing First</SelectItem>
                <SelectItem value="recently-updated">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
            CSV imports are non-destructive for blank cells. Use the exported
            matrix to fill a new language in bulk, then import it back here.
          </div>
        </CardContent>
      </Card>

      {groupedTranslations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No translations match these filters.</p>
              <p className="text-sm text-muted-foreground">
                Try clearing the search, switching category filters, or showing
                translated rows again.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedTranslations.map((group) => {
            const missingInGroup = group.items.filter((item) =>
              isTranslationMissing(item, selectedLanguage.code)
            ).length;

            return (
              <section key={group.category} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <LanguagesIcon className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">
                        {formatTranslationCategoryLabel(group.category)}
                      </h2>
                    </div>
                    <Badge variant="outline">{group.items.length} keys</Badge>
                    <Badge variant="outline">{missingInGroup} missing</Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {group.items.map((translation) => (
                    <TranslationEditorCard
                      key={`${translation.key}:${selectedLanguage.code}`}
                      language={selectedLanguage}
                      translation={translation}
                      onUpdate={(updatedTranslation) =>
                        setTranslations((previousTranslations) =>
                          previousTranslations.map((candidate) =>
                            candidate.key === updatedTranslation.key
                              ? updatedTranslation
                              : candidate
                          )
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
