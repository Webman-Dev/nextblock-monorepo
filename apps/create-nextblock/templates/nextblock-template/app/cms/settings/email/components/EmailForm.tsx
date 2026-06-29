'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Input,
  Label,
  Spinner,
} from '@nextblock-cms/ui';
import type { EmailSettingsView } from '../../../../../lib/config/email-settings';
import { updateEmailSettings, sendTestEmail } from '../actions';
import type { Message } from '../../../../../components/form-message';
import { useHotkeys } from '../../../../../hooks/use-hotkeys';

interface EmailFormProps {
  initialSettings: EmailSettingsView;
}

export default function EmailForm({ initialSettings }: EmailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [host, setHost] = useState(initialSettings.host);
  const [port, setPort] = useState(initialSettings.port);
  const [fromEmail, setFromEmail] = useState(initialSettings.fromEmail);
  const [fromName, setFromName] = useState(initialSettings.fromName);
  const [secure, setSecure] = useState(initialSettings.secure);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [testTo, setTestTo] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData();
    formData.append('host', host);
    formData.append('port', port);
    formData.append('fromEmail', fromEmail);
    formData.append('fromName', fromName);
    formData.append('secure', secure ? 'on' : '');
    // Only send credentials when changed — blank keeps the stored secret.
    if (user.trim()) formData.append('user', user.trim());
    if (pass.trim()) formData.append('pass', pass.trim());

    startTransition(async () => {
      try {
        const result = await updateEmailSettings(formData);
        setMessage({ success: result.message });
        setUser('');
        setPass('');
      } catch (error) {
        setMessage({ error: error instanceof Error ? error.message : 'Failed to save settings.' });
      }
    });
  };

  const handleSendTest = () => {
    setMessage(null);
    const formData = new FormData();
    formData.append('to', testTo.trim());
    startTestTransition(async () => {
      try {
        const result = await sendTestEmail(formData);
        setMessage({ success: result.message });
      } catch (error) {
        setMessage({ error: error instanceof Error ? error.message : 'Failed to send test email.' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {initialSettings.envFallbackActive && (
        <Alert className="py-2 px-4">
          <AlertDescription className="text-xs">
            SMTP is currently read from environment variables (<code>SMTP_*</code>). Saving here
            moves it into the database and takes precedence.
          </AlertDescription>
        </Alert>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP host</Label>
            <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="465" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From email</Label>
            <Input id="fromEmail" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="no-reply@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromName">From name</Label>
            <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="My Site" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">
              Username{' '}
              {initialSettings.hasUser && (
                <span className="text-xs text-muted-foreground">
                  (stored{initialSettings.userLast4 ? ` ••••${initialSettings.userLast4}` : ''} — leave blank to keep)
                </span>
              )}
            </Label>
            <Input id="user" autoComplete="off" value={user} onChange={(e) => setUser(e.target.value)} placeholder={initialSettings.hasUser ? '••••••••' : 'smtp username'} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass">
              Password{' '}
              {initialSettings.hasPass && (
                <span className="text-xs text-muted-foreground">(stored — leave blank to keep)</span>
              )}
            </Label>
            <Input id="pass" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={initialSettings.hasPass ? '••••••••' : 'smtp password'} />
          </div>
        </div>

        <label className="flex items-start gap-3">
          <Checkbox checked={secure} onCheckedChange={(c) => setSecure(c === true)} className="mt-1" />
          <span className="text-sm">
            <span className="font-medium">Use implicit TLS (SMTPS)</span>
            <span className="block text-xs text-muted-foreground">
              Enable for port 465. Disable for STARTTLS on ports like 587.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? (<><Spinner className="mr-2 h-4 w-4" /> Saving…</>) : 'Save settings'}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="testTo">Send a test email</Label>
          <p className="text-xs text-muted-foreground">
            Save your settings first, then send a test message to confirm delivery.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            id="testTo"
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="sm:max-w-xs"
          />
          <Button type="button" variant="outline" onClick={handleSendTest} disabled={isTesting || !testTo.trim()}>
            {isTesting ? (<><Spinner className="mr-2 h-4 w-4" /> Sending…</>) : 'Send test email'}
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={'error' in message ? 'destructive' : 'success'} className="py-2 px-4">
          <AlertDescription>
            {'error' in message
              ? message.error
              : 'success' in message
                ? message.success
                : message.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
