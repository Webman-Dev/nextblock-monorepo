'use client';

import React, { useState } from 'react';
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
  SearchableSelect,
} from '@nextblock-cms/ui';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Cpu,
  KeyRound,
  ServerCog,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import type { CortexAiStoredModelSelection } from '@nextblock-cms/cortex/client';
import {
  clearCortexAiModelSelectionAction,
  clearOpenRouterApiKeyAction,
  saveCortexAiModelSelectionAction,
  saveOpenRouterApiKeyAction,
} from './actions';

const CORTEX_AI_SETTINGS_CHANGED_EVENT = 'nextblock:cortex-ai-settings-changed';

type StoredCortexAiSettingsClientProps = {
  compatibleModels: Array<{
    id: string;
    name: string;
    pricing: Record<string, string>;
    context_length: number | null;
  }>;
  isPackageActive: boolean;
  hasEnvOpenRouterKey: boolean;
  maskedEnvOpenRouterKey: string | null;
  hasStoredOpenRouterKey: boolean;
  maskedStoredOpenRouterKey: string | null;
  storedKeyUpdatedAt: string | null;
  selectedModel: CortexAiStoredModelSelection | null;
  selectedModelUpdatedAt: string | null;
  hasEncryptionKey: boolean;
  modelCatalogError: string | null;
  successMessage?: string;
  errorMessage?: string;
};

function formatTokenPrice(value: string | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  if (amount === 0) return '$0';
  const perMillion = amount * 1_000_000;
  return `$${perMillion < 0.01 ? perMillion.toFixed(4) : perMillion.toFixed(2)}`;
}

function formatModelPricing(pricing: Record<string, string>) {
  const promptPrice = formatTokenPrice(pricing.prompt);
  const completionPrice = formatTokenPrice(pricing.completion);
  if (promptPrice === '$0' && completionPrice === '$0') return 'Free';
  if (promptPrice && completionPrice) return `${promptPrice}/1M input - ${completionPrice}/1M output`;
  return 'Pricing varies';
}

function notifyCortexAiSettingsChanged() {
  window.dispatchEvent(new Event(CORTEX_AI_SETTINGS_CHANGED_EVENT));
}

export function StoredCortexAiSettingsClient({
  compatibleModels,
  isPackageActive,
  hasEnvOpenRouterKey,
  maskedEnvOpenRouterKey,
  hasStoredOpenRouterKey,
  maskedStoredOpenRouterKey,
  storedKeyUpdatedAt,
  selectedModel,
  selectedModelUpdatedAt,
  hasEncryptionKey,
  modelCatalogError,
  successMessage,
  errorMessage,
}: StoredCortexAiSettingsClientProps) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState<string>(selectedModel?.modelId || '');

  const isKeyDirty = apiKeyInput.trim().length > 0;
  const isModelDirty = modelInput !== (selectedModel?.modelId || '');

  const selectedModelIsInCatalog = compatibleModels.some(
    (model) => model.id === selectedModel?.modelId
  );
  const modelOptions =
    selectedModel && !selectedModelIsInCatalog
      ? [
          {
            context_length: selectedModel.contextLength,
            id: selectedModel.modelId,
            name: `${selectedModel.name} (saved)`,
            pricing: selectedModel.pricing,
          },
          ...compatibleModels,
        ]
      : compatibleModels;

  const canSelectModel = hasStoredOpenRouterKey && compatibleModels.length > 0;

  const searchableOptions = modelOptions.map((model) => ({
    value: model.id,
    label: model.name,
    description: `${model.id} - ${formatModelPricing(model.pricing as any)}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <div>
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">NextBlock Cortex AI</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage premium activation and the OpenRouter key used by Cortex AI.
        </p>
      </div>

      {successMessage && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
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
            <Badge variant={isPackageActive ? 'default' : 'outline'}>
              {isPackageActive ? 'Active' : 'Inactive'}
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
            <Badge variant={hasEnvOpenRouterKey ? 'default' : 'outline'}>
              {hasEnvOpenRouterKey ? 'Configured' : 'Not set'}
            </Badge>
            {maskedEnvOpenRouterKey && (
              <p className="font-mono text-xs text-muted-foreground">
                {maskedEnvOpenRouterKey}
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
            <Badge variant={hasStoredOpenRouterKey ? 'default' : 'outline'}>
              {hasStoredOpenRouterKey ? 'Stored' : 'Empty'}
            </Badge>
            {maskedStoredOpenRouterKey && (
              <p className="font-mono text-xs text-muted-foreground">
                {maskedStoredOpenRouterKey}
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
            <Badge variant={selectedModel ? 'default' : 'outline'}>
              {selectedModel ? 'Selected' : 'Free registry'}
            </Badge>
            {selectedModel && (
              <>
                <p className="text-xs font-medium">{selectedModel.name}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {selectedModel.modelId}
                </p>
                {selectedModelUpdatedAt && (
                  <p className="text-xs text-muted-foreground">{selectedModelUpdatedAt}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {hasEnvOpenRouterKey && !hasStoredOpenRouterKey && (
        <Alert>
          <ServerCog className="h-4 w-4" />
          <AlertTitle>Sandbox free-model lock active</AlertTitle>
          <AlertDescription>
            Cortex AI will only use the three configured free OpenRouter models until a
            stored BYOK is saved.
          </AlertDescription>
        </Alert>
      )}

      {hasEnvOpenRouterKey && hasStoredOpenRouterKey && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Stored BYOK active</AlertTitle>
          <AlertDescription>
            Cortex AI will use the stored BYOK before the server environment key, so the
            selected compatible OpenRouter model can run across the website.
          </AlertDescription>
        </Alert>
      )}

      {!hasEncryptionKey && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Encryption key missing</AlertTitle>
          <AlertDescription>
            Set CORTEX_AI_ENCRYPTION_KEY before saving an OpenRouter key here.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">OpenRouter BYOK</CardTitle>
            <CardDescription>
              The saved key is encrypted and masked after submission.
            </CardDescription>
          </div>
          {hasStoredOpenRouterKey && (
            <form action={clearOpenRouterApiKeyAction} onSubmit={notifyCortexAiSettingsChanged}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </form>
          )}
        </CardHeader>
        <CardContent>
          <form action={saveOpenRouterApiKeyAction} onSubmit={notifyCortexAiSettingsChanged}>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="openrouter_api_key">OpenRouter API key</Label>
                <Input
                  id="openrouter_api_key"
                  name="openrouter_api_key"
                  type="password"
                  autoComplete="off"
                  minLength={12}
                  placeholder={hasStoredOpenRouterKey ? 'Enter new key to overwrite...' : 'sk-or-v1-...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={!isKeyDirty}>
                {isKeyDirty ? (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Save Key
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Saved
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">OpenRouter Model</CardTitle>
            <CardDescription>
              Stored BYOK can use compatible text models that support structured outputs and
              tool calling.
            </CardDescription>
          </div>
          {selectedModel && (
            <form action={clearCortexAiModelSelectionAction} onSubmit={notifyCortexAiSettingsChanged}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </form>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasStoredOpenRouterKey && (
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

          <form action={saveCortexAiModelSelectionAction} onSubmit={notifyCortexAiSettingsChanged}>
            {/* We need a hidden input because SearchableSelect isn't a native form element that automatically passes 'name' inside form submission natively (unless we do) */}
            <input type="hidden" name="openrouter_model_id" value={modelInput} />
            
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="openrouter_model_id_select">Model</Label>
                <SearchableSelect
                  options={searchableOptions}
                  value={modelInput}
                  onChange={(val) => setModelInput(val)}
                  disabled={!canSelectModel}
                  placeholder="Select a compatible model..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {canSelectModel
                    ? `${compatibleModels.length} compatible models available`
                    : 'Cortex AI will use the free registry until model selection is available.'}
                </p>
              </div>
              <Button type="submit" disabled={!canSelectModel || !isModelDirty}>
                {isModelDirty ? (
                  <>
                    <Cpu className="mr-2 h-4 w-4" />
                    Save Model
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Saved
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
