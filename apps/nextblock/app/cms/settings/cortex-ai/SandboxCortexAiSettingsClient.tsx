'use client';

import React, { useEffect, useState } from 'react';
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
  BrainCircuit,
  CheckCircle2,
  Cpu,
  KeyRound,
  ServerCog,
  ShieldCheck,
  Trash2,
  Info,
} from 'lucide-react';
import {
  createCortexAiStoredModelSelection,
  type CortexAiStoredModelSelection,
} from '@nextblock-cms/cortex/client';

const CORTEX_AI_SANDBOX_KEY_LOCAL_STORAGE = 'cortex_ai_sandbox_openrouter_api_key';
const CORTEX_AI_SANDBOX_MODEL_LOCAL_STORAGE = 'cortex_ai_sandbox_openrouter_model_selection';
const CORTEX_AI_SETTINGS_CHANGED_EVENT = 'nextblock:cortex-ai-settings-changed';

type SandboxCortexAiSettingsClientProps = {
  compatibleModels: Array<{
    id: string;
    name: string;
    pricing: Record<string, string>;
    context_length: number | null;
    created?: number | null;
    architecture?: {
      modality?: string;
      tokenizer?: string;
      instruct_type?: string | null;
    } | null;
    description?: string;
    top_provider?: {
      max_completion_tokens?: number | null;
      is_moderated?: boolean;
    } | null;
  }>;
  isPackageActive: boolean;
  hasEnvOpenRouterKey: boolean;
  maskedEnvOpenRouterKey: string | null;
  modelCatalogError: string | null;
};

function formatModelPricing(pricing: Record<string, string>) {
  const amount = Number(pricing.prompt);
  const completionAmount = Number(pricing.completion);

  if (!Number.isFinite(amount) || !Number.isFinite(completionAmount)) {
    return 'Pricing varies';
  }

  if (amount === 0 && completionAmount === 0) {
    return 'Free';
  }

  const formatPrice = (val: number) => {
    if (val === 0) return '$0';
    const perMillion = val * 1_000_000;
    return `$${perMillion < 0.01 ? perMillion.toFixed(4) : perMillion.toFixed(2)}`;
  };

  return `${formatPrice(amount)}/1M input - ${formatPrice(completionAmount)}/1M output`;
}

function getMaskedKey(key: string) {
  if (key.length <= 8) return '****';
  return `**** ${key.slice(-4)}`;
}

function notifyCortexAiSettingsChanged() {
  window.dispatchEvent(new Event(CORTEX_AI_SETTINGS_CHANGED_EVENT));
}

export function SandboxCortexAiSettingsClient({
  compatibleModels,
  isPackageActive,
  hasEnvOpenRouterKey,
  maskedEnvOpenRouterKey,
  modelCatalogError,
}: SandboxCortexAiSettingsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [sandboxKey, setSandboxKey] = useState<string | null>(null);
  const [sandboxModel, setSandboxModel] = useState<CortexAiStoredModelSelection | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [modelInput, setModelInput] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedKey = window.localStorage.getItem(CORTEX_AI_SANDBOX_KEY_LOCAL_STORAGE);
      if (storedKey) {
        setSandboxKey(storedKey);
      }

      const storedModel = window.localStorage.getItem(CORTEX_AI_SANDBOX_MODEL_LOCAL_STORAGE);
      if (storedModel) {
        const parsed = JSON.parse(storedModel) as CortexAiStoredModelSelection;
        setSandboxModel(parsed);
        setModelInput(parsed.modelId);
      }
    } catch (error) {
      console.error('Failed to read Cortex AI sandbox settings from localStorage', error);
    }
    setMounted(true);
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = inputValue.trim();
    if (!key) return;

    try {
      window.localStorage.setItem(CORTEX_AI_SANDBOX_KEY_LOCAL_STORAGE, key);
      setSandboxKey(key);
      setInputValue('');
      notifyCortexAiSettingsChanged();
      setSuccessMessage('Sandbox OpenRouter key saved to your browser.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save sandbox key', error);
    }
  };

  const handleClearKey = () => {
    try {
      window.localStorage.removeItem(CORTEX_AI_SANDBOX_KEY_LOCAL_STORAGE);
      window.localStorage.removeItem(CORTEX_AI_SANDBOX_MODEL_LOCAL_STORAGE);
      setSandboxKey(null);
      setSandboxModel(null);
      setModelInput('');
      notifyCortexAiSettingsChanged();
      setSuccessMessage('Sandbox OpenRouter key cleared from your browser.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to clear sandbox key', error);
    }
  };

  const handleSaveModel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const modelId = String(formData.get('openrouter_model_id') || '').trim();
    if (!modelId) return;

    const selectedModel = compatibleModels.find((m) => m.id === modelId);
    if (!selectedModel) return;

    try {
      // Map to the shape createCortexAiStoredModelSelection expects, or something similar.
      // createCortexAiStoredModelSelection needs a specific shape but we can mimic it.
      // We pass the raw model data to it.
      const storedSelection = createCortexAiStoredModelSelection(selectedModel as any);
      window.localStorage.setItem(CORTEX_AI_SANDBOX_MODEL_LOCAL_STORAGE, JSON.stringify(storedSelection));
      setSandboxModel(storedSelection);
      notifyCortexAiSettingsChanged();
      setSuccessMessage('Sandbox Cortex AI model selection saved to your browser.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save sandbox model', error);
    }
  };

  const handleClearModel = () => {
    try {
      window.localStorage.removeItem(CORTEX_AI_SANDBOX_MODEL_LOCAL_STORAGE);
      setSandboxModel(null);
      setModelInput('');
      notifyCortexAiSettingsChanged();
      setSuccessMessage('Sandbox Cortex AI model selection cleared.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to clear sandbox model', error);
    }
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  const selectedModelIsInCatalog = compatibleModels.some(
    (model) => model.id === sandboxModel?.modelId
  );
  
  const modelOptions =
    sandboxModel && !selectedModelIsInCatalog
      ? [
          {
            context_length: sandboxModel.contextLength,
            created: null,
            expirationDate: null,
            id: sandboxModel.modelId,
            name: `${sandboxModel.name} (saved)`,
            pricing: sandboxModel.pricing,
            supportedParameters: sandboxModel.supportedParameters,
          },
          ...compatibleModels,
        ]
      : compatibleModels;
      
  const canSelectModel = !!sandboxKey && compatibleModels.length > 0;
  const maskedSandboxKey = sandboxKey ? getMaskedKey(sandboxKey) : null;
  const isKeyDirty = inputValue.trim().length > 0;
  const isModelDirty = modelInput !== (sandboxModel?.modelId || '');

  const searchableOptions = modelOptions.map((model) => ({
    value: model.id,
    label: model.name,
    description: `${model.id} - ${formatModelPricing(model.pricing as any)}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <div>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">NextBlock Cortex AI (Sandbox)</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage premium activation and the OpenRouter key used by Cortex AI in your local browser environment.
        </p>
      </div>

      {successMessage && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Alert variant="warning" className="bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800">
        <Info className="h-4 w-4" />
        <AlertTitle>Sandbox Environment Active</AlertTitle>
        <AlertDescription>
          Keys and model selections entered here are stored <strong>only in your private browser (localStorage)</strong>. They will not be saved to the database to prevent accidental leaks in the shared sandbox area.
        </AlertDescription>
      </Alert>

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
              Sandbox BYOK
            </CardTitle>
            <CardDescription>Browser local storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={sandboxKey ? 'default' : 'outline'}>
              {sandboxKey ? 'Stored' : 'Empty'}
            </Badge>
            {maskedSandboxKey && (
              <p className="font-mono text-xs text-muted-foreground">
                {maskedSandboxKey}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4" />
              Model
            </CardTitle>
            <CardDescription>Sandbox routing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={sandboxModel ? 'default' : 'outline'}>
              {sandboxModel ? 'Selected' : 'Free registry'}
            </Badge>
            {sandboxModel && (
              <>
                <p className="text-xs font-medium">{sandboxModel.name}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {sandboxModel.modelId}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {hasEnvOpenRouterKey && !sandboxKey && (
        <Alert>
          <ServerCog className="h-4 w-4" />
          <AlertTitle>Sandbox free-model lock active</AlertTitle>
          <AlertDescription>
            Cortex AI will only use the three configured free OpenRouter models until a
            sandbox BYOK is saved to your browser.
          </AlertDescription>
        </Alert>
      )}

      {hasEnvOpenRouterKey && !!sandboxKey && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Sandbox BYOK active</AlertTitle>
          <AlertDescription>
            Cortex AI will use your browser's sandbox BYOK before the server environment key, so the
            selected compatible OpenRouter model can run across the website for you.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">OpenRouter BYOK</CardTitle>
            <CardDescription>
              The saved key is stored locally in your browser. It is not uploaded or saved to the database.
            </CardDescription>
          </div>
          {sandboxKey && (
            <form onSubmit={(e) => { e.preventDefault(); handleClearKey(); }}>
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
          <form onSubmit={handleSaveKey}>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="openrouter_api_key">OpenRouter API key</Label>
                <Input
                  id="openrouter_api_key"
                  name="openrouter_api_key"
                  type="password"
                  autoComplete="off"
                  minLength={12}
                  placeholder={sandboxKey ? 'Enter new key to overwrite...' : 'sk-or-v1-...'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={!isKeyDirty}>
                {isKeyDirty ? (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Save Key to Browser
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
              Sandbox BYOK can use compatible text models that support structured outputs and
              tool calling.
            </CardDescription>
          </div>
          {sandboxModel && (
            <form onSubmit={(e) => { e.preventDefault(); handleClearModel(); }}>
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
          {!sandboxKey && (
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertTitle>Sandbox BYOK required</AlertTitle>
              <AlertDescription>
                Save an OpenRouter key to your browser before choosing a paid model.
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

          <form onSubmit={handleSaveModel}>
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
                    Save Model to Browser
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
