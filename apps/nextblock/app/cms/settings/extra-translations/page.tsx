import { Alert, AlertDescription } from '@nextblock-cms/ui';

import { getLanguages } from '../languages/actions';
import { getTranslations } from './actions';
import { ExtraTranslationsWorkspace } from './ExtraTranslationsWorkspace';

type Language = NonNullable<Awaited<ReturnType<typeof getLanguages>>['data']>[number];

interface ExtraTranslationsPageProps {
  searchParams?: Promise<{
    language?: string;
    status?: string;
    success?: string;
  }>;
}

function getInitialLanguageCode(languages: Language[], requestedLanguageCode?: string) {
  if (!languages.length) {
    return 'en';
  }

  const trimmedRequestedCode = requestedLanguageCode?.trim().toLowerCase();

  if (trimmedRequestedCode) {
    const matchedLanguage = languages.find(
      (language) => language.code.toLowerCase() === trimmedRequestedCode
    );

    if (matchedLanguage) {
      return matchedLanguage.code;
    }
  }

  const firstNonEnglishLanguage = languages.find(
    (language) => language.code.toLowerCase() !== 'en'
  );

  return firstNonEnglishLanguage?.code ?? languages[0]?.code ?? 'en';
}

function getInitialStatusFilter(
  requestedStatus?: string,
  requestedLanguageCode?: string
) {
  if (
    requestedStatus === 'all' ||
    requestedStatus === 'missing' ||
    requestedStatus === 'translated'
  ) {
    return requestedStatus;
  }

  return requestedLanguageCode ? 'missing' : 'all';
}

export default async function ExtraTranslationsPage(
  props: ExtraTranslationsPageProps
) {
  const searchParams = await props.searchParams;
  const [translations, languagesResult] = await Promise.all([
    getTranslations(),
    getLanguages(),
  ]);
  const languages = languagesResult.data ?? [];
  const initialLanguageCode = getInitialLanguageCode(
    languages,
    searchParams?.language
  );
  const initialStatusFilter = getInitialStatusFilter(
    searchParams?.status,
    searchParams?.language
  );
  const successMessage = searchParams?.success
    ? decodeURIComponent(searchParams.success)
    : null;

  return (
    <div className="space-y-4 p-6">
      {successMessage ? (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <ExtraTranslationsWorkspace
        initialTranslations={translations}
        languages={languages}
        initialLanguageCode={initialLanguageCode}
        initialStatusFilter={initialStatusFilter}
      />
    </div>
  );
}
