'use client';

import { useState, useTransition } from 'react';
import type { Database } from '@nextblock-cms/db';

type Language = Database['public']['Tables']['languages']['Row'];
import { CopyrightSettings, updateCopyrightSettings } from '../actions';
import { Label } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Button } from '@nextblock-cms/ui';
import { Alert, AlertDescription, Spinner } from '@nextblock-cms/ui';
import { type Message } from '@/components/form-message';
import { useRef } from 'react';
import { useHotkeys } from '@/hooks/use-hotkeys';

interface CopyrightFormProps {
  languages: Language[];
  initialSettings: CopyrightSettings;
}

export default function CopyrightForm({ languages, initialSettings }: CopyrightFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);
  const [settings, setSettings] = useState<CopyrightSettings>(initialSettings);

  const handleInputChange = (langCode: string, value: string) => {
    setSettings(prev => ({ ...prev, [langCode]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData();
    for (const lang of languages) {
        const value = settings[lang.code] || '';
        formData.append(`copyright_${lang.code}`, value);
    }

    startTransition(async () => {
      try {
        const result = await updateCopyrightSettings(formData);
        if (result.success) {
          setMessage({ success: result.message });
        } else {
          setMessage({ error: 'An unexpected error occurred.' });
        }
      } catch (error) {
        setMessage({ error: error instanceof Error ? error.message : 'An unknown error occurred.' });
      }
    });
  };

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {languages.map(lang => (
          <div key={lang.id} className="space-y-2">
            <Label htmlFor={`copyright_${lang.code}`}>
              {lang.name} ({lang.code})
            </Label>
            <Input
              id={`copyright_${lang.code}`}
              name={`copyright_${lang.code}`}
              value={settings[lang.code] || ''}
              onChange={(e) => handleInputChange(lang.code, e.target.value)}
              placeholder="e.g., © {year} Copyright"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
        {message && (
          <Alert variant={'success' in message ? 'success' : 'destructive'} className="py-2 px-4 w-auto inline-flex items-center">
             <AlertDescription>{'success' in message ? (message as any).success : (message as any).error}</AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}