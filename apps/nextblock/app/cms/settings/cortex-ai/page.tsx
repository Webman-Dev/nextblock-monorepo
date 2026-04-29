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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nextblock-cms/ui';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  KeyRound,
  ServerCog,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { listCortexAiCompatibleOpenRouterModels } from '../../../../lib/ai-model-catalog';
import {
  clearCortexAiModelSelectionAction,
  clearOpenRouterApiKeyAction,
  getCortexAiSettingsStatus,
  saveCortexAiModelSelectionAction,
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

function formatTokenPrice(value: string | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (amount === 0) {
    return '$0';
  }

  const perMillion = amount * 1_000_000;
  return `$${perMillion < 0.01 ? perMillion.toFixed(4) : perMillion.toFixed(2)}`;
}

function formatModelPricing(pricing: Record<string, string>) {
  const promptPrice = formatTokenPrice(pricing.prompt);
  const completionPrice = formatTokenPrice(pricing.completion);

  if (promptPrice === '$0' && completionPrice === '$0') {
    return 'Free';
  }

  if (promptPrice && completionPrice) {
    return `${promptPrice}/1M input - ${completionPrice}/1M output`;
  }

  return 'Pricing varies';
}

export default async function CortexAiSettingsPage({
  searchParams,
}: CortexAiSettingsPageProps) {
  const status = await getCortexAiSettingsStatus();
  const params: { error?: string; success?: string } = searchParams
    ? await searchParams
    : {};
  const storedKeyUpdatedAt = formatDate(status.storedOpenRouterKeyUpdatedAt);
  const selectedModelUpdatedAt = formatDate(status.selectedModel?.updatedAt || null);
  let compatibleModels: Awaited<ReturnType<typeof listCortexAiCompatibleOpenRouterModels>> = [];
  let modelCatalogError: string | null = null;

  if (status.hasStoredOpenRouterKey) {
    try {
      compatibleModels = await listCortexAiCompatibleOpenRouterModels();
    } catch (error) {
      modelCatalogError =
        error instanceof Error ? error.message : 'Failed to load compatible OpenRouter models.';
    }
  }

  const selectedModelIsInCatalog = compatibleModels.some(
    (model) => model.id === status.selectedModel?.modelId
  );
  const modelOptions =
    status.selectedModel && !selectedModelIsInCatalog
      ? [
          {
            contextLength: status.selectedModel.contextLength,
            created: null,
            expirationDate: null,
            id: status.selectedModel.modelId,
            name: `${status.selectedModel.name} (saved)`,
            pricing: status.selectedModel.pricing,
            supportedParameters: status.selectedModel.supportedParameters,
          },
          ...compatibleModels,
        ]
      : compatibleModels;
  const canSelectModel = status.hasStoredOpenRouterKey && compatibleModels.length > 0;

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

      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4" />
              Model
            </CardTitle>
            <CardDescription>Stored BYOK routing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={status.selectedModel ? 'default' : 'outline'}>
              {status.selectedModel ? 'Selected' : 'Free registry'}
            </Badge>
            {status.selectedModel && (
              <>
                <p className="text-xs font-medium">{status.selectedModel.name}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {status.selectedModel.modelId}
                </p>
                {selectedModelUpdatedAt && (
                  <p className="text-xs text-muted-foreground">{selectedModelUpdatedAt}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {status.hasEnvOpenRouterKey && !status.hasStoredOpenRouterKey && (
        <Alert>
          <ServerCog className="h-4 w-4" />
          <AlertTitle>Sandbox free-model lock active</AlertTitle>
          <AlertDescription>
            Cortex AI will only use the three configured free OpenRouter models until a
            stored BYOK is saved.
          </AlertDescription>
        </Alert>
      )}

      {status.hasEnvOpenRouterKey && status.hasStoredOpenRouterKey && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Stored BYOK active</AlertTitle>
          <AlertDescription>
            Cortex AI will use the stored BYOK before the server environment key, so the
            selected compatible OpenRouter model can run across the website.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OpenRouter Model</CardTitle>
          <CardDescription>
            Stored BYOK can use compatible text models that support structured outputs and
            tool calling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status.hasStoredOpenRouterKey && (
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertTitle>Stored BYOK required</AlertTitle>
              <AlertDescription>
                Save an encrypted OpenRouter key before choosing a paid model.
              </AlertDescription>
            </Alert>
          )}

          {modelCatalogError && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Model catalog unavailable</AlertTitle>
              <AlertDescription>{modelCatalogError}</AlertDescription>
            </Alert>
          )}

          <form action={saveCortexAiModelSelectionAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="openrouter_model_id">Model</Label>
              <Select
                name="openrouter_model_id"
                defaultValue={status.selectedModel?.modelId}
                disabled={!canSelectModel}
              >
                <SelectTrigger id="openrouter_model_id">
                  <SelectValue placeholder="Select a compatible model" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {modelOptions.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex flex-col gap-0.5">
                        <span>{model.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {model.id} - {formatModelPricing(model.pricing)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {canSelectModel
                  ? `${compatibleModels.length} compatible models available`
                  : 'Cortex AI will use the free registry until model selection is available.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={!canSelectModel}>
                <Cpu className="mr-2 h-4 w-4" />
                Save Model
              </Button>
            </div>
          </form>

          <form action={clearCortexAiModelSelectionAction}>
            <Button
              type="submit"
              variant="outline"
              disabled={!status.selectedModel}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Model Selection
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
