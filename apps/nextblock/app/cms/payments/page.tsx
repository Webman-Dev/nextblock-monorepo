'use client';

import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, RadioGroup, RadioGroupItem } from '@nextblock-cms/ui';
import { getStoreConfigStatus, getPaymentSettings, updatePaymentSettings } from './actions';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PaymentSettingsPage() {
  const [provider, setProvider] = useState<'stripe' | 'lemon_squeezy'>('stripe');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [settings, status] = await Promise.all([
        getPaymentSettings(),
        getStoreConfigStatus()
      ]);
      
      // settings.value is the JSON string value from DB, e.g. "stripe" (with quotes if simple jsonb)
      // or just the string if supabase client parsed it.
      // Let's assume it comes back as a string, check if it needs parsing or trimming quotes.
      let current = settings;
      if (typeof current === 'string' && current.startsWith('"') && current.endsWith('"')) {
          try {
             current = JSON.parse(current);
          } catch { /* empty */ }
      }
      
      setProvider(current as 'stripe' | 'lemon_squeezy');
      setConfigStatus(status);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePaymentSettings(provider);
      // Optional: Toast success
    } catch (err) {
      console.error(err);
      // Optional: Toast error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading settings...</div>;
  }

  const isStripeReady = configStatus?.stripe?.hasKeys;
  const isLemonReady = configStatus?.lemonSqueezy?.hasKeys;

  return (
    <div className="space-y-6 max-w-3xl">
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
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as any)}>
            <div className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 ${provider === 'stripe' ? 'border-primary bg-accent/10' : ''}`}>
               <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
               <div className="grid gap-1.5 leading-none w-full">
                  <Label htmlFor="stripe" className="font-semibold text-base cursor-pointer">
                    Stripe
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Accept credit cards, Apple Pay, and Google Pay.
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

            <div className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 ${provider === 'lemon_squeezy' ? 'border-primary bg-accent/10' : ''}`}>
               <RadioGroupItem value="lemon_squeezy" id="lemon_squeezy" className="mt-1" />
               <div className="grid gap-1.5 leading-none w-full">
                  <Label htmlFor="lemon_squeezy" className="font-semibold text-base cursor-pointer">
                    Lemon Squeezy
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Tax handling, global payments, and SaaS features.
                  </p>
                  
                  {!isLemonReady && (
                      <MissingKeysGuide 
                        provider="Lemon Squeezy" 
                        missingKeys={configStatus.lemonSqueezy.missing} 
                        docsUrl="https://app.lemonsqueezy.com/settings/api"
                        docsLabel="Lemon Squeezy -> Settings -> API"
                      />
                  )}
                  {isLemonReady && (
                      <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ready to process payments</span>
                      </div>
                  )}
               </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MissingKeysGuide({ provider, missingKeys, docsUrl, docsLabel }: { provider: string, missingKeys: string[], docsUrl: string, docsLabel: string }) {
    return (
        <div className="mt-3 text-sm p-4 rounded-md border border-destructive/20 bg-destructive/5 text-foreground">
            <div className="flex items-center gap-2 font-semibold text-destructive mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>Configuration Required</span>
            </div>
            <p className="mb-2">
                The {provider} integration is missing the following environment variables:
            </p>
            <ul className="list-disc list-inside bg-white/50 dark:bg-black/20 p-2 rounded mb-3 font-mono text-xs">
                {missingKeys.map(key => <li key={key}>{key}</li>)}
            </ul>
            <p className="mb-2">
                <strong>How to fix:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1 mb-3">
                <li>Go to <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-destructive/80">{docsLabel}</a>.</li>
                <li>Copy your API keys.</li>
                <li>Open your <code>.env</code> (or variables settings in Vercel/Railway).</li>
                <li>Add the keys listed above.</li>
                <li>Restart your development server.</li>
            </ol>
        </div>
    );
}
