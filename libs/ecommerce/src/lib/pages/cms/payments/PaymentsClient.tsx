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
  Input,
  Label,
} from '@nextblock-cms/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import type { PaymentCredentialsView } from '../../../payment-config';

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
  credentials,
  saveAction,
  saveCredentialsAction,
}: {
  initialEnabledProviders: {
    stripe: boolean;
    freemius: boolean;
  };
  configStatus: ConfigStatus;
  credentials: PaymentCredentialsView;
  saveAction: (formData: FormData) => Promise<void>;
  saveCredentialsAction: (formData: FormData) => Promise<void>;
}) {
  const [enabledProviders, setEnabledProviders] = useState(initialEnabledProviders);

  const isStripeReady = configStatus?.stripe?.hasKeys;
  const isFreemiusReady = configStatus?.freemius?.hasKeys;

  return (
    <div className="space-y-6 max-w-3xl p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">
          Enter your provider API keys, then enable the providers your store needs. Physical
          products use Stripe and digital products use Freemius.
        </p>
      </div>

      <ProviderCredentialsCard credentials={credentials} saveAction={saveCredentialsAction} />

      <form action={saveAction} className="space-y-6">
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
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Changes'}</Button>;
}

function CredentialField({
  id,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  hint,
}: {
  id: string;
  label: ReactNode;
  type?: 'text' | 'password';
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProviderCredentialsCard({
  credentials,
  saveAction,
}: {
  credentials: PaymentCredentialsView;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const storedPlaceholder = '•••••••• (stored — leave blank to keep)';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider API Keys</CardTitle>
        <CardDescription>
          Keys are encrypted at rest and used DB-first (these override any <code>.env</code>{' '}
          values). Leave a secret blank to keep the stored value.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveAction} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Stripe (physical products)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <CredentialField
                id="stripe_publishableKey"
                label="Publishable key"
                defaultValue={credentials.stripe.publishableKey}
                placeholder="pk_live_…"
              />
              <CredentialField
                id="stripe_secretKey"
                label="Secret key"
                type="password"
                placeholder={credentials.stripe.hasSecretKey ? storedPlaceholder : 'sk_live_…'}
              />
              <CredentialField
                id="stripe_webhookSecret"
                label="Webhook signing secret"
                type="password"
                placeholder={credentials.stripe.hasWebhookSecret ? storedPlaceholder : 'whsec_…'}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Freemius (digital products)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <CredentialField
                id="freemius_developerId"
                label="Developer ID"
                defaultValue={credentials.freemius.developerId}
              />
              <CredentialField
                id="freemius_productId"
                label="Product ID"
                defaultValue={credentials.freemius.productId}
              />
              <CredentialField
                id="freemius_publicKey"
                label="Public key"
                defaultValue={credentials.freemius.publicKey}
                placeholder="pk_…"
              />
              <CredentialField
                id="freemius_secretKey"
                label="Secret key"
                type="password"
                placeholder={credentials.freemius.hasSecretKey ? storedPlaceholder : 'sk_…'}
              />
              <CredentialField
                id="freemius_apiKey"
                label="API key"
                type="password"
                placeholder={credentials.freemius.hasApiKey ? storedPlaceholder : 'API key'}
              />
            </div>
          </div>

          {credentials.envFallbackActive && (
            <p className="text-xs text-amber-700">
              Stripe keys are currently read from environment variables. Saving here moves them into
              the database and takes precedence.
            </p>
          )}

          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
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
      <p className="mb-2">The {provider} integration still needs the following:</p>
      <ul className="list-disc list-inside bg-white/50 dark:bg-black/20 p-2 rounded mb-3 text-xs">
        {missingKeys.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
      <p className="mb-2">
        <strong>How to fix:</strong>
      </p>
      <ol className="list-decimal list-inside space-y-1 ml-1 mb-3">
        <li>
          Get your API keys from{' '}
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
        <li>Enter them in the <strong>Provider API Keys</strong> section above and save.</li>
        <li>This provider can then be enabled.</li>
      </ol>
    </div>
  );
}
