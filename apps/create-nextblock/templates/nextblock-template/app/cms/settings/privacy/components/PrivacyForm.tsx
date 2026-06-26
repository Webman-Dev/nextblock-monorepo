'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Input,
  Label,
  Separator,
  Spinner,
  Textarea,
} from '@nextblock-cms/ui';
import { Message } from '../../../../../components/form-message';
import { useHotkeys } from '../../../../../hooks/use-hotkeys';
import type { PrivacySettings } from '../../../../../lib/privacy/types';
import { updatePrivacySettings } from '../actions';

interface PrivacyFormProps {
  initialSettings: PrivacySettings;
}

export default function PrivacyForm({ initialSettings }: PrivacyFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [bannerEnabled, setBannerEnabled] = useState(initialSettings.banner_enabled);
  const [legalName, setLegalName] = useState(initialSettings.corporate.legal_name);
  const [address, setAddress] = useState(initialSettings.corporate.address);
  const [supportEmail, setSupportEmail] = useState(initialSettings.corporate.support_email);

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData();
    formData.append('banner_enabled', String(bannerEnabled));
    formData.append('legal_name', legalName);
    formData.append('address', address);
    formData.append('support_email', supportEmail);

    startTransition(async () => {
      try {
        const result = await updatePrivacySettings(formData);
        setMessage({ success: result.message });
      } catch (error) {
        setMessage({
          error: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {/* Consent banner */}
      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="banner_enabled"
            checked={bannerEnabled}
            onCheckedChange={(checked) => setBannerEnabled(checked === true)}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="banner_enabled">Enable the Law 25 consent banner</Label>
            <p className="text-xs text-slate-500">
              When on, first-time visitors see a floating consent prompt and analytics
              stay disabled until they accept.
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Corporate identity */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Corporate identity (CASL footer)</h3>
          <p className="text-xs text-slate-500">
            CASL requires every commercial message and the site footer to identify the
            sender. These values are appended to the public footer automatically.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="legal_name">Legal name</Label>
          <Input
            id="legal_name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Acme Technologies Inc."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Physical mailing address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Rue Example, Montréal, QC H0H 0H0, Canada"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support_email">Support / unsubscribe email</Label>
          <Input
            id="support_email"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="privacy@example.com"
          />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            'Save Privacy Settings'
          )}
        </Button>
        {message && (
          <Alert
            variant={'success' in message ? 'success' : 'destructive'}
            className="py-2 px-4 w-auto inline-flex items-center"
          >
            <AlertDescription>
              {'success' in message
                ? message.success
                : 'error' in message
                  ? message.error
                  : ''}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}
