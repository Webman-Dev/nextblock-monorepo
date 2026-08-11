import { headers } from 'next/headers';

import { listCortexAiCompatibleOpenRouterModels } from '@nextblock-cms/cortex';
import { getCortexAiSettingsStatus } from './actions';
import { getMcpSettingsStatus } from './mcp-actions';
import { McpServerSettingsCard } from './McpServerSettingsCard';
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

/**
 * The origin an external MCP client should dial.
 *
 * Prefers NEXT_PUBLIC_URL (the deployed canonical origin) and falls back to the
 * request's own host, so the snippet is correct on a preview deployment or a custom
 * domain that was never written into the env.
 */
async function resolveSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const headerList = await headers();
  const host = headerList.get('host');

  if (!host) {
    return 'https://your-site.com';
  }

  const protocol = headerList.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

/**
 * The loopback origin to show in the "Localhost" client snippets.
 *
 * Ports differ per setup — `nx serve nextblock` uses Nx's default 4200, not Next's
 * plain 3000 — and a snippet pointing at the wrong port fails with a bare connection
 * error that gives the reader nothing to go on. When this page is itself being viewed
 * over loopback, that request's own host is the authoritative answer.
 */
async function resolveLocalOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('host')?.trim();

  if (host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) {
    return `http://${host}`;
  }

  return 'http://localhost:4200';
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
  const stockKeysUpdatedAt = formatDate(status.stockKeysUpdatedAt);
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
        activeStockProvider={status.activeStockProvider}
        hasStoredPexelsKey={status.hasStoredPexelsKey}
        maskedStoredPexelsKey={status.maskedStoredPexelsKey}
        hasStoredUnsplashKey={status.hasStoredUnsplashKey}
        maskedStoredUnsplashKey={status.maskedStoredUnsplashKey}
        hasEnvPexelsKey={status.hasEnvPexelsKey}
        hasEnvUnsplashKey={status.hasEnvUnsplashKey}
        unsplashAppName={status.unsplashAppName}
        agentSettings={status.agentSettings}
      />
    );
  }

  const [mcpStatus, siteOrigin, localOrigin] = await Promise.all([
    getMcpSettingsStatus(),
    resolveSiteOrigin(),
    resolveLocalOrigin(),
  ]);

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
      activeStockProvider={status.activeStockProvider}
      hasStoredPexelsKey={status.hasStoredPexelsKey}
      maskedStoredPexelsKey={status.maskedStoredPexelsKey}
      hasStoredUnsplashKey={status.hasStoredUnsplashKey}
      maskedStoredUnsplashKey={status.maskedStoredUnsplashKey}
      hasEnvPexelsKey={status.hasEnvPexelsKey}
      hasEnvUnsplashKey={status.hasEnvUnsplashKey}
      stockKeysUpdatedAt={stockKeysUpdatedAt}
      unsplashAppName={status.unsplashAppName}
      agentSettings={status.agentSettings}
      successMessage={params.success}
      errorMessage={params.error}
    >
      <McpServerSettingsCard
        allowLocalhostWithoutToken={mcpStatus.settings.allowLocalhostWithoutToken}
        enabled={mcpStatus.settings.enabled}
        localMcpUrl={`${localOrigin}/api/mcp`}
        mcpUrl={`${siteOrigin}/api/mcp`}
        tokens={mcpStatus.tokens}
      />
    </StoredCortexAiSettingsClient>
  );
}
