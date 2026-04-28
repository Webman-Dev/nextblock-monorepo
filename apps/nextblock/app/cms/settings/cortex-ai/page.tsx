import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@nextblock-cms/ui';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  KeyRound,
  ServerCog,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import {
  clearOpenRouterApiKeyAction,
  getCortexAiSettingsStatus,
  saveOpenRouterApiKeyAction,
} from './actions';

type CortexAiSettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function CortexAiSettingsPage({
  searchParams,
}: CortexAiSettingsPageProps) {
  const status = await getCortexAiSettingsStatus();
  const params: { error?: string; success?: string } = searchParams
    ? await searchParams
    : {};
  const storedKeyUpdatedAt = formatDate(status.storedOpenRouterKeyUpdatedAt);

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">NextBlock Cortex AI</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage premium activation and the OpenRouter key used by Cortex AI.
        </p>
      </div>

      {params.success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      )}

      {params.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Package
            </CardTitle>
            <CardDescription>Premium access</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={status.isPackageActive ? 'default' : 'outline'}>
              {status.isPackageActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="h-4 w-4" />
              Environment
            </CardTitle>
            <CardDescription>OPENROUTER_API_KEY</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={status.hasEnvOpenRouterKey ? 'default' : 'outline'}>
              {status.hasEnvOpenRouterKey ? 'Configured' : 'Not set'}
            </Badge>
            {status.maskedEnvOpenRouterKey && (
              <p className="font-mono text-xs text-muted-foreground">
                {status.maskedEnvOpenRouterKey}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Stored BYOK
            </CardTitle>
            <CardDescription>Encrypted database key</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={status.hasStoredOpenRouterKey ? 'default' : 'outline'}>
              {status.hasStoredOpenRouterKey ? 'Stored' : 'Empty'}
            </Badge>
            {status.maskedStoredOpenRouterKey && (
              <p className="font-mono text-xs text-muted-foreground">
                {status.maskedStoredOpenRouterKey}
              </p>
            )}
            {storedKeyUpdatedAt && (
              <p className="text-xs text-muted-foreground">{storedKeyUpdatedAt}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {status.hasEnvOpenRouterKey && (
        <Alert>
          <ServerCog className="h-4 w-4" />
          <AlertTitle>Environment override active</AlertTitle>
          <AlertDescription>
            Cortex AI will use the server environment key before the stored BYOK key.
          </AlertDescription>
        </Alert>
      )}

      {!status.hasEncryptionKey && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Encryption key missing</AlertTitle>
          <AlertDescription>
            Set CORTEX_AI_ENCRYPTION_KEY before saving an OpenRouter key here.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OpenRouter BYOK</CardTitle>
          <CardDescription>
            The saved key is encrypted and masked after submission.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={saveOpenRouterApiKeyAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="openrouter_api_key">OpenRouter API key</Label>
              <Input
                id="openrouter_api_key"
                name="openrouter_api_key"
                type="password"
                autoComplete="off"
                minLength={12}
                placeholder="sk-or-v1-..."
                required
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                <KeyRound className="mr-2 h-4 w-4" />
                Save Key
              </Button>
            </div>
          </form>

          <form action={clearOpenRouterApiKeyAction}>
            <Button
              type="submit"
              variant="outline"
              disabled={!status.hasStoredOpenRouterKey}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Stored Key
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
