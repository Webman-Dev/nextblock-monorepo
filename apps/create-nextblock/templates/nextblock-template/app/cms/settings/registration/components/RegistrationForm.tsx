'use client';

import { useRef, useState, useTransition } from 'react';
import { Alert, AlertDescription, Button, Checkbox, Spinner } from '@nextblock-cms/ui';
import { updateRegistrationSettings } from '../actions';
import type { Message } from '../../../../../components/form-message';
import { useHotkeys } from '../../../../../hooks/use-hotkeys';

interface RegistrationFormProps {
  initialSettings: { autoAcceptSignups: boolean };
}

export default function RegistrationForm({ initialSettings }: RegistrationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);
  const [autoAccept, setAutoAccept] = useState(initialSettings.autoAcceptSignups);

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData();
    formData.append('autoAcceptSignups', autoAccept ? 'on' : '');

    startTransition(async () => {
      try {
        const result = await updateRegistrationSettings(formData);
        setMessage({ success: result.message });
      } catch (error) {
        setMessage({ error: error instanceof Error ? error.message : 'Failed to save settings.' });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <label className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox checked={autoAccept} onCheckedChange={(c) => setAutoAccept(c === true)} className="mt-1" />
        <span className="text-sm">
          <span className="font-medium">Auto-approve new registrations (skip email verification)</span>
          <span className="block text-xs text-muted-foreground">
            New sign-ups become active immediately, even without SMTP configured. Convenient for
            local / self-hosted use. Leave off for public production sites so new accounts must
            confirm their email address.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (<><Spinner className="mr-2 h-4 w-4" /> Saving…</>) : 'Save settings'}
        </Button>
        {message && (
          <Alert variant={'error' in message ? 'destructive' : 'success'} className="py-2 px-4 w-auto inline-flex items-center">
            <AlertDescription>
              {'error' in message ? message.error : 'success' in message ? message.success : message.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}
