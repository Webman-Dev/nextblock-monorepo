'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  Checkbox,
  Input,
  Label,
  Separator,
  Spinner,
} from '@nextblock-cms/ui';
import { Message } from '../../../../../components/form-message';
import {
  MAX_TRUSTED_DEVICE_DAYS,
  MIN_TRUSTED_DEVICE_DAYS,
} from '../../../../../lib/privacy/types';
import {
  disableMfa,
  revokeTrustedDeviceAction,
  sendEmailEnrollmentCode,
  startTotpEnrollment,
  updateAutoAcceptSignups,
  updateGlobalSecuritySettings,
  verifyEmailEnrollment,
  verifyTotpEnrollment,
  type SecurityPanelData,
} from '../actions';

type EnrollMode = 'idle' | 'totp' | 'email';

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function SecurityPanel({ data }: { data: SecurityPanelData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [mode, setMode] = useState<EnrollMode>('idle');
  const [totp, setTotp] = useState<{ factorId: string; qrCode: string; secret: string } | null>(
    null,
  );
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState('');

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = (await fn()) as { message?: string } | undefined;
        if (result?.message) setMessage({ success: result.message });
        after?.();
        router.refresh();
      } catch (error) {
        setMessage({
          error: error instanceof Error ? error.message : 'Something went wrong.',
        });
      }
    });
  };

  const resetEnrollment = () => {
    setMode('idle');
    setTotp(null);
    setEmailSent(false);
    setCode('');
  };

  // --- Enrollment handlers ------------------------------------------------------

  const beginTotp = () => {
    setMessage(null);
    setMode('totp');
    setEmailSent(false);
    startTransition(async () => {
      const result = await startTotpEnrollment();
      if (result.ok) {
        setTotp({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret });
      } else {
        setMessage({ error: result.error });
        setMode('idle');
      }
    });
  };

  const submitTotpCode = () => {
    if (!totp) return;
    const formData = new FormData();
    formData.append('factorId', totp.factorId);
    formData.append('code', code);
    run(() => verifyTotpEnrollment(formData), resetEnrollment);
  };

  const beginEmail = () => {
    setMode('email');
    setTotp(null);
    run(async () => {
      const result = await sendEmailEnrollmentCode();
      setEmailSent(true);
      return result;
    });
  };

  const submitEmailCode = () => {
    const formData = new FormData();
    formData.append('code', code);
    run(() => verifyEmailEnrollment(formData), resetEnrollment);
  };

  const messageAlert = message && (
    <Alert
      variant={'success' in message ? 'success' : 'destructive'}
      className="py-2 px-4"
    >
      <AlertDescription>
        {'success' in message
          ? message.success
          : 'error' in message
            ? message.error
            : ''}
      </AlertDescription>
    </Alert>
  );

  return (
    <>
      {/* Status + per-user MFA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Two-Factor Authentication
            {data.mfaEnabled ? (
              <Badge variant="default">
                Enabled · {data.mfaType === 'totp' ? 'Authenticator app' : 'Email code'}
              </Badge>
            ) : (
              <Badge variant="secondary">Off</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Add a second step when you sign in to the CMS. You can use an authenticator
            app (TOTP) or a one-time code sent to <strong>{data.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {messageAlert}

          {data.mfaEnabled ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="text-sm">
                <p className="font-medium">
                  {data.mfaType === 'totp'
                    ? 'Authenticator app is protecting your account.'
                    : 'Email verification is protecting your account.'}
                </p>
                <p className="text-slate-500">
                  Disabling 2FA also forgets all of your trusted devices.
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => run(() => disableMfa(), resetEnrollment)}
              >
                {isPending ? <Spinner className="h-4 w-4 animate-spin" /> : 'Disable 2FA'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Method chooser */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={beginTotp}
                  className={`rounded-lg border p-4 text-left transition hover:border-primary ${
                    mode === 'totp' ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <p className="font-medium text-sm">Authenticator App (TOTP)</p>
                  <p className="text-xs text-slate-500">
                    Scan a QR code with Google Authenticator, 1Password, Authy, etc.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={beginEmail}
                  className={`rounded-lg border p-4 text-left transition hover:border-primary ${
                    mode === 'email' ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <p className="font-medium text-sm">Secure Email Code</p>
                  <p className="text-xs text-slate-500">
                    Receive a 6-digit code at your account email each time you sign in.
                  </p>
                </button>
              </div>

              {/* TOTP enrollment */}
              {mode === 'totp' && (
                <div className="rounded-lg border p-4 space-y-4">
                  {totp ? (
                    <>
                      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={totp.qrCode}
                          alt="Authenticator setup QR code"
                          className="h-44 w-44 rounded bg-white p-2"
                        />
                        <div className="text-sm space-y-2">
                          <p>1. Scan this QR code with your authenticator app.</p>
                          <p>
                            2. Or enter this key manually:
                            <br />
                            <code className="break-all text-xs bg-muted px-1 py-0.5 rounded">
                              {totp.secret}
                            </code>
                          </p>
                          <p>3. Enter the current 6-digit code below.</p>
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="totp_code">6-digit code</Label>
                          <Input
                            id="totp_code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-32 tracking-widest"
                            placeholder="000000"
                          />
                        </div>
                        <Button onClick={submitTotpCode} disabled={isPending || code.length !== 6}>
                          {isPending ? <Spinner className="h-4 w-4 animate-spin" /> : 'Verify & enable'}
                        </Button>
                        <Button variant="ghost" onClick={resetEnrollment} disabled={isPending}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Spinner className="h-4 w-4 animate-spin" /> Generating your QR code…
                    </div>
                  )}
                </div>
              )}

              {/* Email enrollment */}
              {mode === 'email' && (
                <div className="rounded-lg border p-4 space-y-4">
                  <p className="text-sm">
                    {emailSent
                      ? `Enter the 6-digit code we sent to ${data.email}.`
                      : 'Sending a verification code to your email…'}
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="email_code">6-digit code</Label>
                      <Input
                        id="email_code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="w-32 tracking-widest"
                        placeholder="000000"
                        disabled={!emailSent}
                      />
                    </div>
                    <Button
                      onClick={submitEmailCode}
                      disabled={isPending || code.length !== 6 || !emailSent}
                    >
                      {isPending ? <Spinner className="h-4 w-4 animate-spin" /> : 'Verify & enable'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={beginEmail}
                      disabled={isPending}
                      title="Send a new code"
                    >
                      Resend
                    </Button>
                    <Button variant="ghost" onClick={resetEnrollment} disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trusted devices */}
      <Card>
        <CardHeader>
          <CardTitle>Trusted Devices</CardTitle>
          <CardDescription>
            Devices where you chose &ldquo;Remember this device&rdquo; skip 2FA until the
            trust expires. Revoke any you no longer recognize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.trustedDevices.length === 0 ? (
            <p className="text-sm text-slate-500">No trusted devices.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {data.trustedDevices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-4 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {device.browser_metadata || 'Unknown device'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Trusted {formatDate(device.created_at)} · expires{' '}
                      {formatDate(device.expires_at)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      const formData = new FormData();
                      formData.append('id', device.id);
                      run(() => revokeTrustedDeviceAction(formData));
                    }}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Admin global policy */}
      {data.isAdmin && (
        <AdminPolicyCard
          initial={data.globalSettings}
          isPending={isPending}
          onSave={(formData) => run(() => updateGlobalSecuritySettings(formData))}
        />
      )}

      {/* Sign-up policy (admin only) */}
      {data.isAdmin && (
        <SignupPolicyCard
          initial={data.autoAcceptSignups}
          isPending={isPending}
          onSave={(formData) => run(() => updateAutoAcceptSignups(formData))}
        />
      )}
    </>
  );
}

function SignupPolicyCard({
  initial,
  isPending,
  onSave,
}: {
  initial: boolean;
  isPending: boolean;
  onSave: (formData: FormData) => void;
}) {
  const [enabled, setEnabled] = useState(initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-up Policy (Admin)</CardTitle>
        <CardDescription>
          Controls how new public registrations are handled across the whole site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('auto_accept_signups', String(enabled));
            onSave(formData);
          }}
          className="space-y-6"
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="auto_accept_signups"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="auto_accept_signups">
                Auto-approve registrations (skip outbound email verification)
              </Label>
              <p className="text-xs text-slate-500">
                New accounts become active immediately, even without SMTP configured. Convenient
                for local / self-hosted use; leave off for public production sites.
              </p>
            </div>
          </div>

          <Separator />

          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Policy
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AdminPolicyCard({
  initial,
  isPending,
  onSave,
}: {
  initial: SecurityPanelData['globalSettings'];
  isPending: boolean;
  onSave: (formData: FormData) => void;
}) {
  const [days, setDays] = useState(String(initial.trusted_device_days));
  const [enforce, setEnforce] = useState(initial.enforce_staff_2fa);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Policy (Admin)</CardTitle>
        <CardDescription>
          Applies to every staff member. Trusted-device trust is server-validated and
          revocable at any time from this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('trusted_device_days', days);
            formData.append('enforce_staff_2fa', String(enforce));
            onSave(formData);
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="trusted_device_days">Remember-device duration (days)</Label>
            <Input
              id="trusted_device_days"
              type="number"
              min={MIN_TRUSTED_DEVICE_DAYS}
              max={MAX_TRUSTED_DEVICE_DAYS}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-40"
            />
            <p className="text-xs text-slate-500">
              How long a &ldquo;Remember this device&rdquo; choice lasts before 2FA is
              required again. Default 30 days, up to {MAX_TRUSTED_DEVICE_DAYS} (10 years).
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="enforce_staff_2fa"
              checked={enforce}
              onCheckedChange={(checked) => setEnforce(checked === true)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="enforce_staff_2fa">Encourage staff to enable 2FA</Label>
              <p className="text-xs text-slate-500">
                Shows a reminder banner across the CMS to ADMIN/WRITER accounts that
                haven&rsquo;t set up a second factor. On by default.
              </p>
            </div>
          </div>

          <Separator />

          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Policy
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
