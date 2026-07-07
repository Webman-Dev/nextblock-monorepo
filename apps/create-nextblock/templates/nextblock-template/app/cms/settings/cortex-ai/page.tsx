import { listCortexAiCompatibleOpenRouterModels } from '@nextblock-cms/cortex';
import { getCortexAiSettingsStatus } from './actions';
import { SandboxCortexAiSettingsClient } from './SandboxCortexAiSettingsClient';
import { StoredCortexAiSettingsClient } from './StoredCortexAiSettingsClient';
import { redirect } from 'next/navigation';

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

  if (!status.isPackageActive) {
    redirect('/cms/dashboard');
  }

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
