'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@nextblock-cms/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface ConfigStatus {
  stripe: {
    hasKeys: boolean;
    missing: string[];
  };
  freemius: {
    hasKeys: boolean;
    missing: string[];
  };
}

export function PaymentsClient({
  initialProvider,
  configStatus,
  saveAction,
}: {
  initialProvider: 'stripe' | 'freemius';
  configStatus: ConfigStatus;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [provider, setProvider] = useState<'stripe' | 'freemius'>(initialProvider);

  const isStripeReady = configStatus?.stripe?.hasKeys;
  const isFreemiusReady = configStatus?.freemius?.hasKeys;

  return (
    <form action={saveAction} className="space-y-6 max-w-3xl p-8">
      <input type="hidden" name="provider" value={provider} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how you accept payments on your store.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Provider</CardTitle>
          <CardDescription>
            Select the payment gateway to use for checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={provider} onValueChange={(v: string) => setProvider(v as 'stripe' | 'freemius')}>
            <div
              className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 ${
                provider === 'stripe' ? 'border-primary bg-accent/10' : ''
              }`}
            >
              <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
              <div className="grid gap-1.5 leading-none w-full">
                <Label htmlFor="stripe" className="font-semibold text-base cursor-pointer">
                  Physical Goods & Services (Powered by Stripe Connect)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select this provider to process payments for physical merchandise, in-person
                  consulting, and standard e-commerce. (Note: You are responsible for your own tax
                  liability).
                </p>

                {!isStripeReady && (
                  <MissingKeysGuide
                    provider="Stripe"
                    missingKeys={configStatus.stripe.missing}
                    docsUrl="https://dashboard.stripe.com/apikeys"
                    docsLabel="Stripe Dashboard -> Developers -> API Keys"
                  />
                )}
                {isStripeReady && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ready to process payments</span>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 ${
                provider === 'freemius' ? 'border-primary bg-accent/10' : ''
              }`}
            >
              <RadioGroupItem value="freemius" id="freemius" className="mt-1" />
              <div className="grid gap-1.5 leading-none w-full">
                <Label htmlFor="freemius" className="font-semibold text-base cursor-pointer">
                  Digital Goods & Software (Powered by Freemius)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select this MoR to automatically handle global tax compliance, VAT, and software
                  licensing for digital downloads and SaaS subscriptions.
                </p>

                {!isFreemiusReady && (
                  <MissingKeysGuide
                    provider="Freemius"
                    missingKeys={configStatus.freemius.missing}
                    docsUrl="https://dashboard.freemius.com/"
                    docsLabel="Freemius Dashboard -> Developers -> Credentials"
                  />
                )}
                {isFreemiusReady && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ready to process payments</span>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end pt-4">
            <SaveButton />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Changes'}</Button>;
}

function MissingKeysGuide({
  provider,
  missingKeys,
  docsUrl,
  docsLabel,
}: {
  provider: string;
  missingKeys: string[];
  docsUrl: string;
  docsLabel: string;
}) {
  return (
    <div className="mt-3 text-sm p-4 rounded-md border border-destructive/20 bg-destructive/5 text-foreground">
      <div className="flex items-center gap-2 font-semibold text-destructive mb-2">
        <AlertCircle className="w-4 h-4" />
        <span>Configuration Required</span>
      </div>
      <p className="mb-2">The {provider} integration is missing the following environment variables:</p>
      <ul className="list-disc list-inside bg-white/50 dark:bg-black/20 p-2 rounded mb-3 font-mono text-xs">
        {missingKeys.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
      <p className="mb-2">
        <strong>How to fix:</strong>
      </p>
      <ol className="list-decimal list-inside space-y-1 ml-1 mb-3">
        <li>
          Go to{' '}
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium hover:text-destructive/80"
          >
            {docsLabel}
          </a>
          .
        </li>
        <li>Copy your API keys.</li>
        <li>Open your <code>.env</code> (or variables settings in Vercel/Railway).</li>
        <li>Add the keys listed above.</li>
        <li>Restart your development server.</li>
      </ol>
    </div>
  );
}
