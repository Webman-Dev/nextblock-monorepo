'use client';

import { type ReactNode, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
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
  initialEnabledProviders,
  configStatus,
  saveAction,
}: {
  initialEnabledProviders: {
    stripe: boolean;
    freemius: boolean;
  };
  configStatus: ConfigStatus;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [enabledProviders, setEnabledProviders] = useState(initialEnabledProviders);

  const isStripeReady = configStatus?.stripe?.hasKeys;
  const isFreemiusReady = configStatus?.freemius?.hasKeys;

  return (
    <form action={saveAction} className="space-y-6 max-w-3xl p-8">
      <input
        type="hidden"
        name="stripe_enabled"
        value={enabledProviders.stripe ? 'true' : 'false'}
      />
      <input
        type="hidden"
        name="freemius_enabled"
        value={enabledProviders.freemius ? 'true' : 'false'}
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">
          Enable the payment providers your store needs. Physical products use Stripe and digital
          products use Freemius.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            You can run both providers at the same time. Each product picks its provider from its
            product type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProviderToggleCard
            id="stripe-enabled"
            label="Stripe for Physical Products"
            description="Use Stripe Checkout for physical merchandise and other shippable goods."
            checked={enabledProviders.stripe}
            disabled={!isStripeReady}
            onCheckedChange={(checked) =>
              setEnabledProviders((current) => ({
                ...current,
                stripe: checked,
              }))
            }
            ready={isStripeReady}
          >
            {!isStripeReady ? (
              <MissingKeysGuide
                provider="Stripe"
                missingKeys={configStatus.stripe.missing}
                docsUrl="https://dashboard.stripe.com/apikeys"
                docsLabel="Stripe Dashboard -> Developers -> API Keys"
              />
            ) : (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready to process physical product checkout</span>
              </div>
            )}
          </ProviderToggleCard>

          <ProviderToggleCard
            id="freemius-enabled"
            label="Freemius for Digital Products"
            description="Use Freemius for software licenses, SaaS plans, and other digital products."
            checked={enabledProviders.freemius}
            disabled={!isFreemiusReady}
            onCheckedChange={(checked) =>
              setEnabledProviders((current) => ({
                ...current,
                freemius: checked,
              }))
            }
            ready={isFreemiusReady}
          >
            {!isFreemiusReady ? (
              <MissingKeysGuide
                provider="Freemius"
                missingKeys={configStatus.freemius.missing}
                docsUrl="https://dashboard.freemius.com/"
                docsLabel="Freemius Dashboard -> Developers -> Credentials"
              />
            ) : (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready to process digital product checkout</span>
              </div>
            )}
          </ProviderToggleCard>

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

function ProviderToggleCard({
  id,
  label,
  description,
  checked,
  disabled,
  ready,
  onCheckedChange,
  children,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  ready: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(Boolean(value))}
          className="mt-1"
        />
        <div className="grid gap-1.5 leading-none w-full">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Label htmlFor={id} className="font-semibold text-base cursor-pointer">
              {label}
            </Label>
            <span
              className={`text-xs font-medium ${
                checked ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {checked ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {!ready && (
            <p className="text-xs text-amber-700">
              This provider cannot be enabled until all required environment variables are present.
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
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
