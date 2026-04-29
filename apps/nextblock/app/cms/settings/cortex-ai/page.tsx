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
  Brain,
  CheckCircle2,
  Cpu,
  KeyRound,
  ServerCog,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { listCortexAiCompatibleOpenRouterModels } from '../../../../lib/ai-model-catalog';
import { getCortexAiSettingsStatus } from './actions';
import { SandboxCortexAiSettingsClient } from './SandboxCortexAiSettingsClient';
import { StoredCortexAiSettingsClient } from './StoredCortexAiSettingsClient';

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

  if (status.hasStoredOpenRouterKey || process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
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

  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    return (
      <SandboxCortexAiSettingsClient
        compatibleModels={compatibleModels as any}
        isPackageActive={status.isPackageActive}
        hasEnvOpenRouterKey={status.hasEnvOpenRouterKey}
        maskedEnvOpenRouterKey={status.maskedEnvOpenRouterKey}
        modelCatalogError={modelCatalogError}
      />
    );
  }

  return (
    <StoredCortexAiSettingsClient
      compatibleModels={compatibleModels as any}
      isPackageActive={status.isPackageActive}
      hasEnvOpenRouterKey={status.hasEnvOpenRouterKey}
      maskedEnvOpenRouterKey={status.maskedEnvOpenRouterKey}
      hasStoredOpenRouterKey={status.hasStoredOpenRouterKey}
      maskedStoredOpenRouterKey={status.maskedStoredOpenRouterKey}
      storedKeyUpdatedAt={storedKeyUpdatedAt}
      selectedModel={status.selectedModel}
      selectedModelUpdatedAt={selectedModelUpdatedAt}
      hasEncryptionKey={status.hasEncryptionKey}
      modelCatalogError={modelCatalogError}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
}
