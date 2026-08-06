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
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  ImageIcon,
  Info,
  KeyRound,
  Lock,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  createCortexAiStoredModelSelection,
  type CortexAiStoredModelSelection,
} from '@nextblock-cms/cortex/client';
import type { CortexAiAgentSettings } from '@nextblock-cms/cortex';

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
  activeStockProvider: 'pexels' | 'unsplash' | null;
  hasStoredPexelsKey: boolean;
  maskedStoredPexelsKey: string | null;
  hasStoredUnsplashKey: boolean;
  maskedStoredUnsplashKey: string | null;
  hasEnvPexelsKey: boolean;
  hasEnvUnsplashKey: boolean;
  unsplashAppName: string | null;
  agentSettings: CortexAiAgentSettings;
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

function getMaskedKey(key: string) {
  if (key.length <= 8) return '****';
  return `**** ${key.slice(-4)}`;
}

function notifyCortexAiSettingsChanged() {
  window.dispatchEvent(new Event(CORTEX_AI_SETTINGS_CHANGED_EVENT));
}

function StatusPill({
  label,
  value,
  active,
  detail,
}: {
  label: string;
  value: string;
  active: boolean;
  detail?: string | null;
}) {
  return (
    <div className="flex min-w-[8rem] flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
        <span className="text-sm font-medium">{value}</span>
      </div>
      {detail && <span className="truncate font-mono text-[11px] text-muted-foreground">{detail}</span>}
    </div>
  );
}

// Sandbox mirrors the production layout, but every server-backed setting is
// read-only: the settings actions refuse to write to the shared sandbox DB, and
// only the OpenRouter key + model have a per-visitor override channel
// (localStorage -> x-sandbox-openrouter-* headers).
function ReadOnlyRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <span className="text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="text-xs text-muted-foreground">{value}</span>
        {detail && <span className="font-mono text-[11px] text-muted-foreground">{detail}</span>}
      </div>
    </div>
  );
}

export function SandboxCortexAiSettingsClient({
  compatibleModels,
  isPackageActive,
  hasEnvOpenRouterKey,
  maskedEnvOpenRouterKey,
  modelCatalogError,
  activeStockProvider,
  hasStoredPexelsKey,
  maskedStoredPexelsKey,
  hasStoredUnsplashKey,
  maskedStoredUnsplashKey,
  hasEnvPexelsKey,
  hasEnvUnsplashKey,
  unsplashAppName,
  agentSettings,
}: SandboxCortexAiSettingsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [sandboxKey, setSandboxKey] = useState<string | null>(null);
  const [sandboxModel, setSandboxModel] = useState<CortexAiStoredModelSelection | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [modelInput, setModelInput] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      const storedSelection = createCortexAiStoredModelSelection(selectedModel as any);
      window.localStorage.setItem(
        CORTEX_AI_SANDBOX_MODEL_LOCAL_STORAGE,
        JSON.stringify(storedSelection)
      );
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

  const keySourceValue = sandboxKey ? 'Sandbox BYOK' : hasEnvOpenRouterKey ? 'Environment' : 'None';
  // Ordered by preference (Pexels primary, Unsplash fallback). Configured = a
  // stored DB key OR an env var for that provider.
  const configuredStockProviders = [
    hasStoredPexelsKey || hasEnvPexelsKey ? { name: 'Pexels', stored: hasStoredPexelsKey } : null,
    hasStoredUnsplashKey || hasEnvUnsplashKey
      ? { name: 'Unsplash', stored: hasStoredUnsplashKey }
      : null,
  ].filter(Boolean) as Array<{ name: string; stored: boolean }>;
  const stockValue =
    configuredStockProviders.length > 0
      ? configuredStockProviders.map((provider) => provider.name).join(' + ')
      : 'Off';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-2.5">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold leading-tight">
            NextBlock Cortex AI{' '}
            <Badge variant="secondary" className="ml-1 align-middle font-normal">
              Sandbox
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage the OpenRouter model key used by Cortex AI in your own browser session.
          </p>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Compact status strip */}
      <div className="flex flex-wrap gap-2">
        <StatusPill
          label="Package"
          value={isPackageActive ? 'Active' : 'Inactive'}
          active={isPackageActive}
        />
        <StatusPill
          label="Model key"
          value={keySourceValue}
          active={Boolean(sandboxKey) || hasEnvOpenRouterKey}
          detail={maskedSandboxKey || maskedEnvOpenRouterKey}
        />
        <StatusPill
          label="Model"
          value={sandboxModel ? sandboxModel.name : 'Free registry'}
          active={Boolean(sandboxModel)}
        />
        <StatusPill
          label="Stock photos"
          value={stockValue}
          active={Boolean(activeStockProvider)}
        />
      </div>

      <Alert
        variant="warning"
        className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      >
        <Info className="h-4 w-4" />
        <AlertTitle>Sandbox environment active</AlertTitle>
        <AlertDescription>
          The key and model you set here are stored{' '}
          <strong>only in your own browser (localStorage)</strong> and are never written to the
          shared sandbox database. Server-backed settings below are read-only here.
        </AlertDescription>
      </Alert>

      {hasEnvOpenRouterKey && !sandboxKey && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Free-model lock active</AlertTitle>
          <AlertDescription>
            Cortex AI will only use the configured free OpenRouter models until you save a sandbox
            key to your browser.
          </AlertDescription>
        </Alert>
      )}

      {/* OpenRouter BYOK + Model side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">OpenRouter key</CardTitle>
              <CardDescription className="text-xs">
                Saved to your browser only, never uploaded.
              </CardDescription>
            </div>
            {sandboxKey && (
              <Button
                type="button"
                onClick={handleClearKey}
                variant="ghost"
                size="sm"
                className="h-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSaveKey} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="openrouter_api_key" className="text-xs">
                  API key
                </Label>
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
              <Button type="submit" disabled={!isKeyDirty} size="sm">
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">OpenRouter model</CardTitle>
              <CardDescription className="text-xs">
                Needs a sandbox key; supports tools + structured output.
              </CardDescription>
            </div>
            {sandboxModel && (
              <Button
                type="button"
                onClick={handleClearModel}
                variant="ghost"
                size="sm"
                className="h-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {modelCatalogError && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Model catalog unavailable</AlertTitle>
                <AlertDescription>{modelCatalogError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSaveModel} className="flex items-end gap-2">
              <input type="hidden" name="openrouter_model_id" value={modelInput} />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="openrouter_model_id_select" className="text-xs">
                  Model
                </Label>
                <SearchableSelect
                  options={searchableOptions}
                  value={modelInput}
                  onChange={(val) => setModelInput(val)}
                  disabled={!canSelectModel}
                  placeholder="Select a compatible model..."
                />
              </div>
              <Button type="submit" disabled={!canSelectModel || !isModelDirty} size="sm">
                <Cpu className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground">
              {canSelectModel
                ? `${compatibleModels.length} compatible models available.`
                : 'Cortex AI uses the free registry until a sandbox key + model are set.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock photos - read-only in sandbox */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            Stock photos
            {configuredStockProviders.length > 0 ? (
              configuredStockProviders.map((provider, index) => (
                <Badge
                  key={provider.name}
                  variant={index === 0 ? 'default' : 'secondary'}
                  className="ml-0.5 font-normal"
                >
                  {provider.name} · {index === 0 ? 'primary' : 'fallback'}
                  {!provider.stored && ' (env)'}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="ml-0.5">
                Not configured
              </Badge>
            )}
            <Badge variant="outline" className="ml-auto gap-1 font-normal">
              <Lock className="h-3 w-3" />
              Read-only
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            A Pexels/Unsplash key lets Cortex insert real photos into pages. Pexels is used first;
            Cortex automatically falls back to Unsplash if Pexels is rate-limited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <p className="font-medium">What this does</p>
              <p className="mt-1 text-xs text-muted-foreground">
                When you ask Cortex to build or revamp a page, a stock key lets it fetch relevant,
                high-quality photos for the hero and sections automatically — instant, zero
                image-generation cost, and you can save any photo into your media library with one
                click. Without a key Cortex still builds pages, but uses gradient/theme backgrounds
                instead of photos, and it will not call the photo tool at all.
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                In your own NextBlock install you add these keys on this page and they are encrypted
                into your database. In the shared sandbox they are provided by the host environment
                and cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <ReadOnlyRow
                label="Pexels API key"
                value={
                  hasStoredPexelsKey
                    ? 'Configured (stored)'
                    : hasEnvPexelsKey
                      ? 'Configured (env)'
                      : 'Not set'
                }
                detail={maskedStoredPexelsKey}
              />
              <ReadOnlyRow
                label="Unsplash Access key"
                value={
                  hasStoredUnsplashKey
                    ? 'Configured (stored)'
                    : hasEnvUnsplashKey
                      ? 'Configured (env)'
                      : 'Not set'
                }
                detail={maskedStoredUnsplashKey}
              />
              <ReadOnlyRow label="Unsplash app name" value={unsplashAppName || 'Not set'} />
              <p className="text-[11px] text-muted-foreground">
                {configuredStockProviders.length > 0
                  ? `Using ${configuredStockProviders.map((provider) => provider.name).join(', ')}.`
                  : 'No provider configured in this sandbox.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced settings (collapsed by default) - read-only in sandbox */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((open) => !open)}
          className="flex w-full items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced settings
          <span className="ml-auto text-xs text-muted-foreground">
            {agentSettings.maxOutputTokens === null
              ? 'Unlimited output'
              : `${agentSettings.maxOutputTokens} tokens`}{' '}
            · {agentSettings.maxSteps} steps
          </span>
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showAdvanced && (
          <Card className="mt-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                Agent tuning
                <Badge variant="outline" className="gap-1 font-normal">
                  <Lock className="h-3 w-3" />
                  Read-only
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Controls how much room the page-building agent has. These are set by the sandbox host
                and shared by every visitor, so they cannot be edited here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="max_output_tokens" className="text-xs">
                    Max output tokens per step
                  </Label>
                  <Input
                    id="max_output_tokens"
                    type="text"
                    value={
                      agentSettings.maxOutputTokens === null
                        ? 'Unlimited'
                        : String(agentSettings.maxOutputTokens)
                    }
                    readOnly
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The per-step output budget. Range 256–200,000, or Unlimited. Default 16,000.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_steps" className="text-xs">
                    Max tool steps
                  </Label>
                  <Input
                    id="max_steps"
                    type="text"
                    value={String(agentSettings.maxSteps)}
                    readOnly
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Range 2–100 tool-call rounds. Default 8; each step is one model call.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="temperature" className="text-xs">
                    Temperature
                  </Label>
                  <Input
                    id="temperature"
                    type="text"
                    value={String(agentSettings.temperature)}
                    readOnly
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Range 0–2. Cortex default 0.1 (low = reliable; most models default higher).
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="response_timeout_seconds" className="text-xs">
                    Response timeout (seconds)
                  </Label>
                  <Input
                    id="response_timeout_seconds"
                    type="text"
                    value={String(Math.round(agentSettings.responseTimeoutMs / 1000))}
                    readOnly
                    disabled
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Range 15–600s. Default 120; aborts only after this long with no activity.
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Applies to the global page-building agent. Editable on a self-hosted install.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
