'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { getTranslations, createTranslation, updateTranslation } from './actions';
import { getLanguages } from '@/app/cms/settings/languages/actions';
import { Button } from '@nextblock-cms/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nextblock-cms/ui';
import { SubmitButton } from '@/components/submit-button';

type Translation = Awaited<ReturnType<typeof getTranslations>>[number];
type Language = NonNullable<Awaited<ReturnType<typeof getLanguages>>['data']>[number];

export default function ExtraTranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isPending, startTransition] = useTransition();

  const fetchData = () => {
    startTransition(async () => {
      const translationsData = await getTranslations();
      const { data: languagesData } = await getLanguages();
      setTranslations(translationsData);
      if (languagesData) {
        setLanguages(languagesData);
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isPending && translations.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Extra Translations</h1>
        <CreateTranslationForm onSuccess={fetchData} />
      </div>
      <TranslationsTable translations={translations} languages={languages} onSuccess={fetchData} />
    </div>
  );
}

function CreateTranslationForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction] = useActionState(createTranslation, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Translation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Translation</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="key">Key</Label>
            <Input id="key" name="key" placeholder="e.g., sign_in_button" required />
            {state?.errors?.key && <p className="text-red-500 text-sm mt-1">{state.errors.key[0]}</p>}
          </div>
          <div>
            <Label htmlFor="en">English</Label>
            <Input id="en" name="en" placeholder="e.g., Sign In" required />
            {state?.errors?.en && <p className="text-red-500 text-sm mt-1">{state.errors.en[0]}</p>}
          </div>
          {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
          <DialogFooter>
            <SubmitButton>Create</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TranslationsTableProps = {
  translations: Translation[];
  languages: Language[];
  onSuccess: () => void;
};

function TranslationsTable({ translations, languages, onSuccess }: TranslationsTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            {languages.map((lang) => (
              <TableHead key={lang.code}>{lang.name}</TableHead>
            ))}
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {translations.map((t) => (
            <EditableTranslationRow key={t.key} translation={t} languages={languages} onSuccess={onSuccess} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type EditableRowProps = {
  translation: Translation;
  languages: Language[];
  onSuccess: () => void;
};

function EditableTranslationRow({ translation, languages, onSuccess }: EditableRowProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(() => translation.translations as Record<string, string>);

  useEffect(() => {
    setFormValues(translation.translations as Record<string, string>);
    setIsDirty(false);
    setError(null);
  }, [translation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || !isDirty) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('key', translation.key);
      for (const [lang, value] of Object.entries(formValues)) {
        formData.append(lang, value);
      }
      
      const result = await updateTranslation(null, formData);
      
      if (result?.success) {
        setIsDirty(false);
        onSuccess();
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{translation.key}</TableCell>
      {languages.map((lang) => (
        <TableCell key={lang.code}>
          <Input
            name={lang.code}
            value={formValues[lang.code] || ''}
            onChange={handleInputChange}
            className="w-full"
          />
        </TableCell>
      ))}
      <TableCell className="text-right">
        <form onSubmit={handleSubmit}>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </form>
      </TableCell>
    </TableRow>
  );
}