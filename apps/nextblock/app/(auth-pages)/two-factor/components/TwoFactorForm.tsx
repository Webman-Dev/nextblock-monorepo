'use client';

import { useEffect, useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { Alert, AlertDescription, Button, Input, Label, Spinner } from '@nextblock-cms/ui';
import { resendEmailCode, verifyEmailCode, verifyTotpChallenge } from '../actions';

/** Matches the security panel: relays queue, so parking the button beats spamming it. */
const RESEND_COOLDOWN_SECONDS = 30;

interface TwoFactorFormProps {
  type: 'totp' | 'email';
  email: string;
  redirectTo: string;
  pendingEmailCode: boolean;
}

export default function TwoFactorForm({
  type,
  email,
  redirectTo,
  pendingEmailCode,
}: TwoFactorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    type === 'email' && pendingEmailCode ? `Enter the code we sent to ${email}.` : null,
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = (codeToSubmit: string = code) => {
    if (codeToSubmit.length !== 6) return;
    setError(null);
    const formData = new FormData();
    formData.append('code', codeToSubmit);
    formData.append('redirect_to', redirectTo);
    startTransition(async () => {
      try {
        const action = type === 'totp' ? verifyTotpChallenge : verifyEmailCode;
        const result = await action(formData);
        // A successful action redirects server-side; only failures return here.
        if (result?.error) setError(result.error);
      } catch (err) {
        // A successful verify ends in redirect(), which Next signals by throwing a
        // NEXT_REDIRECT control-flow error. Let Next handle it (perform the navigation)
        // instead of surfacing it as a red error flash; only real errors fall through.
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : 'Verification failed.');
      }
    });
  };

  const resend = () => {
    if (cooldown > 0) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const result = await resendEmailCode();
        if (result?.error) setError(result.error);
        else if (result?.message) {
          setInfo(result.message);
          setCooldown(RESEND_COOLDOWN_SECONDS);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send a code.');
      }
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Two-step verification</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {type === 'totp'
          ? 'Enter the 6-digit code from your authenticator app to finish signing in.'
          : `For your security, enter the 6-digit code sent to ${email || 'your email'}.`}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(next);
              // Auto-submit the moment a full 6-digit code is entered (typed, pasted,
              // or filled by the OS one-time-code autofill) — no button press needed.
              if (next.length === 6 && !isPending) submit(next);
            }}
            placeholder="000000"
            className="tracking-[0.5em] text-center text-lg"
          />
        </div>

        {error && (
          <Alert variant="destructive" className="py-2 px-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {info && !error && (
          <Alert variant="success" className="py-2 px-4">
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isPending || code.length !== 6} className="w-full">
          {isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify &amp; continue
        </Button>
      </form>

      {type === 'email' && (
        <>
          <button
            type="button"
            onClick={resend}
            disabled={isPending || cooldown > 0}
            className="mt-4 w-full text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-50"
          >
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : pendingEmailCode
                ? 'Resend code'
                : 'Send me a code'}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Codes can take a minute to arrive. If you request another, the earlier one still
            works — enter whichever reaches you first.
          </p>
        </>
      )}
    </div>
  );
}
