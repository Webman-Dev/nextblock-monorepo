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
  ChevronDown,
  ChevronRight,
  Cpu,
  ImageIcon,
  KeyRound,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';

import type { CortexAiStoredModelSelection } from '@nextblock-cms/cortex/client';
import type { CortexAiAgentSettings } from '@nextblock-cms/cortex';
import {
  clearCortexAiModelSelectionAction,
  clearOpenRouterApiKeyAction,
  clearStockPhotoKeysAction,
  resetCortexAiAgentSettingsAction,
  saveCortexAiAgentSettingsAction,
  saveCortexAiModelSelectionAction,
  saveOpenRouterApiKeyAction,
  saveStockPhotoKeysAction,
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
  activeStockProvider: 'pexels' | 'unsplash' | null;
  hasStoredPexelsKey: boolean;
  maskedStoredPexelsKey: string | null;
  hasStoredUnsplashKey: boolean;
  maskedStoredUnsplashKey: string | null;
  hasEnvPexelsKey: boolean;
  hasEnvUnsplashKey: boolean;
  stockKeysUpdatedAt: string | null;
  unsplashAppName: string | null;
  agentSettings: CortexAiAgentSettings;
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
  activeStockProvider,
  hasStoredPexelsKey,
  maskedStoredPexelsKey,
  hasStoredUnsplashKey,
  maskedStoredUnsplashKey,
  hasEnvPexelsKey,
  hasEnvUnsplashKey,
  unsplashAppName,
  agentSettings,
  successMessage,
  errorMessage,
}: StoredCortexAiSettingsClientProps) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState<string>(selectedModel?.modelId || '');
  const [pexelsInput, setPexelsInput] = useState('');
  const [unsplashInput, setUnsplashInput] = useState('');
  const [appNameInput, setAppNameInput] = useState(unsplashAppName || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [unlimitedTokens, setUnlimitedTokens] = useState(agentSettings.maxOutputTokens === null);
  const [maxTokensInput, setMaxTokensInput] = useState(String(agentSettings.maxOutputTokens ?? 16000));
  const [maxStepsInput, setMaxStepsInput] = useState(String(agentSettings.maxSteps));
  const [temperatureInput, setTemperatureInput] = useState(String(agentSettings.temperature));
  const [timeoutInput, setTimeoutInput] = useState(String(Math.round(agentSettings.responseTimeoutMs / 1000)));

  const isKeyDirty = apiKeyInput.trim().length > 0;
  const isModelDirty = modelInput !== (selectedModel?.modelId || '');
  const isStockDirty =
    pexelsInput.trim().length > 0 ||
    unsplashInput.trim().length > 0 ||
    appNameInput.trim() !== (unsplashAppName || '');

  const selectedModelIsInCatalog = compatibleModels.some((model) => model.id === selectedModel?.modelId);
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

  const keySourceValue = hasStoredOpenRouterKey ? 'Stored BYOK' : hasEnvOpenRouterKey ? 'Environment' : 'None';
  // Ordered by preference (Pexels primary, Unsplash fallback). Configured = a
  // stored DB key OR an env var for that provider.
  const configuredStockProviders = (
    [
      hasStoredPexelsKey || hasEnvPexelsKey ? { name: 'Pexels', stored: hasStoredPexelsKey } : null,
      hasStoredUnsplashKey || hasEnvUnsplashKey ? { name: 'Unsplash', stored: hasStoredUnsplashKey } : null,
    ].filter(Boolean) as Array<{ name: string; stored: boolean }>
  );
  const stockValue = configuredStockProviders.length > 0
    ? configuredStockProviders.map((provider) => provider.name).join(' + ')
    : 'Off';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-2.5">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold leading-tight">NextBlock Cortex AI</h1>
          <p className="text-xs text-muted-foreground">
            Manage activation, the OpenRouter model key, and stock-photo providers.
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

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Compact status strip */}
      <div className="flex flex-wrap gap-2">
        <StatusPill label="Package" value={isPackageActive ? 'Active' : 'Inactive'} active={isPackageActive} />
        <StatusPill
          label="Model key"
          value={keySourceValue}
          active={hasStoredOpenRouterKey || hasEnvOpenRouterKey}
          detail={maskedStoredOpenRouterKey || maskedEnvOpenRouterKey}
        />
        <StatusPill
          label="Model"
          value={selectedModel ? selectedModel.name : 'Free registry'}
          active={Boolean(selectedModel)}
        />
        <StatusPill label="Stock photos" value={stockValue} active={Boolean(activeStockProvider)} />
      </div>

      {!hasEncryptionKey && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Encryption key missing</AlertTitle>
          <AlertDescription>
            Set CORTEX_AI_ENCRYPTION_KEY (or rely on the Supabase service-role fallback) before saving keys here.
          </AlertDescription>
        </Alert>
      )}

      {/* OpenRouter BYOK + Model side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">OpenRouter key</CardTitle>
              <CardDescription className="text-xs">Encrypted, masked after saving.</CardDescription>
            </div>
            {hasStoredOpenRouterKey && (
              <form action={clearOpenRouterApiKeyAction} onSubmit={notifyCortexAiSettingsChanged}>
                <Button type="submit" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
              </form>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <form action={saveOpenRouterApiKeyAction} onSubmit={notifyCortexAiSettingsChanged} className="flex items-end gap-2">
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
                  placeholder={hasStoredOpenRouterKey ? 'Enter new key to overwrite...' : 'sk-or-v1-...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
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
              <CardDescription className="text-xs">Needs a stored key; supports tools + structured output.</CardDescription>
            </div>
            {selectedModel && (
              <form action={clearCortexAiModelSelectionAction} onSubmit={notifyCortexAiSettingsChanged}>
                <Button type="submit" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
              </form>
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
            <form action={saveCortexAiModelSelectionAction} onSubmit={notifyCortexAiSettingsChanged} className="flex items-end gap-2">
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
                : 'Cortex AI uses the free registry until a stored key + model are set.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock photos */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
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
            </CardTitle>
            <CardDescription className="text-xs">
              Free Pexels/Unsplash key so Cortex inserts real photos into pages. Pexels is used first; Cortex
              automatically falls back to Unsplash if Pexels is rate-limited. Optional but recommended.
            </CardDescription>
          </div>
          {(hasStoredPexelsKey || hasStoredUnsplashKey) && (
            <form action={clearStockPhotoKeysAction} onSubmit={notifyCortexAiSettingsChanged}>
              <Button type="submit" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            </form>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Why + how */}
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <p className="font-medium">Why add a key?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                When you ask Cortex to build or revamp a page, a stock key lets it fetch relevant, high-quality
                photos for the hero and sections automatically — instant, zero image-generation cost, and you can
                save any photo into your media library with one click. Without a key Cortex still builds pages, but
                uses gradient/theme backgrounds instead of photos, and it will not call the photo tool at all.
              </p>
              <p className="mt-3 font-medium">Get a free key (pick one):</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Pexels</span> — open{' '}
                  <span className="font-mono">pexels.com/api</span>, sign in, click “Get Started / Your API Key”,
                  copy the key.
                </li>
                <li>
                  <span className="font-medium text-foreground">or Unsplash</span> — open{' '}
                  <span className="font-mono">unsplash.com/developers</span>, create a New Application, copy its
                  “Access Key”.
                </li>
                <li>Paste it on the right and Save. You only need one provider.</li>
              </ol>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Keys are encrypted and stored in your database, readable only by admins. Pexels is used first when
                both are set.
              </p>
            </div>

            {/* Key form */}
            <form
              action={saveStockPhotoKeysAction}
              onSubmit={notifyCortexAiSettingsChanged}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="pexels_api_key" className="text-xs">
                  Pexels API key{' '}
                  {hasStoredPexelsKey && maskedStoredPexelsKey && (
                    <span className="font-mono text-[11px] text-muted-foreground">({maskedStoredPexelsKey})</span>
                  )}
                  {!hasStoredPexelsKey && hasEnvPexelsKey && (
                    <span className="text-[11px] text-muted-foreground">(set via env)</span>
                  )}
                </Label>
                <Input
                  id="pexels_api_key"
                  name="pexels_api_key"
                  type="password"
                  autoComplete="off"
                  placeholder={hasStoredPexelsKey ? 'Enter new key to overwrite...' : 'Paste Pexels API key'}
                  value={pexelsInput}
                  onChange={(e) => setPexelsInput(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unsplash_access_key" className="text-xs">
                  Unsplash Access key{' '}
                  {hasStoredUnsplashKey && maskedStoredUnsplashKey && (
                    <span className="font-mono text-[11px] text-muted-foreground">({maskedStoredUnsplashKey})</span>
                  )}
                  {!hasStoredUnsplashKey && hasEnvUnsplashKey && (
                    <span className="text-[11px] text-muted-foreground">(set via env)</span>
                  )}
                </Label>
                <Input
                  id="unsplash_access_key"
                  name="unsplash_access_key"
                  type="password"
                  autoComplete="off"
                  placeholder={hasStoredUnsplashKey ? 'Enter new key to overwrite...' : 'Paste Unsplash Access key'}
                  value={unsplashInput}
                  onChange={(e) => setUnsplashInput(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unsplash_app_name" className="text-xs">
                  Unsplash app name{' '}
                  <span className="text-[11px] text-muted-foreground">
                    (for attribution links — must match your registered Unsplash app)
                  </span>
                </Label>
                <Input
                  id="unsplash_app_name"
                  name="unsplash_app_name"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. My Site Name"
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {configuredStockProviders.length > 0
                    ? `Using ${configuredStockProviders.map((provider) => provider.name).join(', ')}.`
                    : 'No provider configured yet.'}
                </span>
                <Button type="submit" disabled={!isStockDirty} size="sm">
                  <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Advanced settings (collapsed by default) */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((open) => !open)}
          className="flex w-full items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced settings
          <span className="ml-auto text-xs text-muted-foreground">
            {agentSettings.maxOutputTokens === null ? 'Unlimited output' : `${agentSettings.maxOutputTokens} tokens`} · {agentSettings.maxSteps} steps
          </span>
          {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <Card className="mt-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agent tuning</CardTitle>
              <CardDescription className="text-xs">
                Controls how much room the page-building agent has. Leave the defaults unless a big build gets cut
                off — then raise the output tokens (or set Unlimited) and steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <form action={saveCortexAiAgentSettingsAction} onSubmit={notifyCortexAiSettingsChanged} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="max_output_tokens"
                      className="text-xs"
                      title="Range 256–200,000 tokens, or Unlimited. The per-step output budget; also counts a tool call's JSON, so raise it (or use Unlimited) if a big page rewrite gets cut off. Default 16,000."
                    >
                      Max output tokens per step
                    </Label>
                    <Input
                      id="max_output_tokens"
                      name="max_output_tokens"
                      type="number"
                      min={256}
                      max={200000}
                      step={256}
                      value={maxTokensInput}
                      onChange={(e) => setMaxTokensInput(e.target.value)}
                      disabled={unlimitedTokens}
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="max_output_unlimited"
                        checked={unlimitedTokens}
                        onChange={(e) => setUnlimitedTokens(e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Unlimited (use the model&apos;s full output budget)
                    </label>
                    <p className="text-[11px] text-muted-foreground">Range 256–200,000, or Unlimited. Default 16,000.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="max_steps"
                      className="text-xs"
                      title="Range 2–100. Each step is one full model call (a page rewrite is ~3–4). This is also the runaway-loop backstop, so a high value can cost more. Default 8."
                    >
                      Max tool steps
                    </Label>
                    <Input
                      id="max_steps"
                      name="max_steps"
                      type="number"
                      min={2}
                      max={100}
                      step={1}
                      value={maxStepsInput}
                      onChange={(e) => setMaxStepsInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Range 2–100 tool-call rounds. Default 8; each step is one model call.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="temperature"
                      className="text-xs"
                      title="Range 0–2. This is Cortex's default (0.1), not the model's universal default (usually ~0.7–1.0). Low keeps structured tool-calls reliable; raise for more variety in copy."
                    >
                      Temperature
                    </Label>
                    <Input
                      id="temperature"
                      name="temperature"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperatureInput}
                      onChange={(e) => setTemperatureInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Range 0–2. Cortex default 0.1 (low = reliable; most models default higher).
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="response_timeout_seconds"
                      className="text-xs"
                      title="Range 15–600 seconds. Aborts an attempt only after this long with NO stream activity — not a hard cap on total time. Default 120."
                    >
                      Response timeout (seconds)
                    </Label>
                    <Input
                      id="response_timeout_seconds"
                      name="response_timeout_seconds"
                      type="number"
                      min={15}
                      max={600}
                      step={5}
                      value={timeoutInput}
                      onChange={(e) => setTimeoutInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Range 15–600s. Default 120; aborts only after this long with no activity.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Values are clamped to safe ranges. Applies to the global page-building agent.
                  </span>
                  <Button type="submit" size="sm">
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              </form>
              <form action={resetCortexAiAgentSettingsAction} onSubmit={notifyCortexAiSettingsChanged}>
                <Button type="submit" variant="ghost" size="sm" className="h-7 text-muted-foreground">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset to defaults
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
