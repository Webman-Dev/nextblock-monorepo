import { headers } from 'next/headers';

import { listCortexAiCompatibleOpenRouterModels } from '@nextblock-cms/cortex';
import { getCortexAiSettingsStatus } from './actions';
import { CortexAiSettingsClient } from './CortexAiSettingsClient';
import { getMcpSettingsStatus, type McpSettingsStatus } from './mcp-actions';
import { McpServerSettingsCard } from './McpServerSettingsCard';
import { redirect } from 'next/navigation';

type CortexAiSettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

const SANDBOX_MCP_NOTICE =
  'This is a shared sandbox, so the switches and the token list are locked — enabling a remote ' +
  'write surface or minting a token here would apply to every visitor at once. Everything else ' +
  'works: the endpoint and the client snippets below are exactly what you get on your own ' +
  'NextBlock install, where you flip the switch, mint a token, and paste the config into Claude ' +
  'Code, Claude Desktop, Cursor, or VS Code.';

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

  const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';
  const params: { error?: string; success?: string } = searchParams
    ? await searchParams
    : {};

  let compatibleModels: Awaited<ReturnType<typeof listCortexAiCompatibleOpenRouterModels>> = [];
  let modelCatalogError: string | null = null;

  if (status.hasStoredOpenRouterKey || isSandbox) {
    try {
      compatibleModels = await listCortexAiCompatibleOpenRouterModels();
    } catch (error) {
      modelCatalogError =
        error instanceof Error ? error.message : 'Failed to load compatible OpenRouter models.';
    }
  }

  const [mcpStatus, siteOrigin, localOrigin] = await Promise.all([
    getMcpSettingsStatus(),
    resolveSiteOrigin(),
    resolveLocalOrigin(),
  ]);

  // The sandbox sees the card, the endpoint, and the snippets — but never the token
  // list. Those rows belong to whoever runs the sandbox, and every visitor here shares
  // one admin login, so listing another visitor's token names would be a leak with no
  // upside (the card is read-only anyway, so nothing in it is actionable).
  const visibleMcpStatus: McpSettingsStatus = isSandbox
    ? { settings: mcpStatus.settings, tokens: [] }
    : mcpStatus;

  return (
    <CortexAiSettingsClient
      isSandbox={isSandbox}
      compatibleModels={compatibleModels}
      isPackageActive={status.isPackageActive}
      hasEnvOpenRouterKey={status.hasEnvOpenRouterKey}
      maskedEnvOpenRouterKey={status.maskedEnvOpenRouterKey}
      hasStoredOpenRouterKey={status.hasStoredOpenRouterKey}
      maskedStoredOpenRouterKey={status.maskedStoredOpenRouterKey}
      selectedModel={status.selectedModel}
      hasEncryptionKey={status.hasEncryptionKey}
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
      successMessage={params.success}
      errorMessage={params.error}
    >
      <McpServerSettingsCard
        allowLocalhostWithoutToken={visibleMcpStatus.settings.allowLocalhostWithoutToken}
        enabled={visibleMcpStatus.settings.enabled}
        localMcpUrl={`${localOrigin}/api/mcp`}
        mcpUrl={`${siteOrigin}/api/mcp`}
        readOnly={isSandbox}
        readOnlyNotice={isSandbox ? SANDBOX_MCP_NOTICE : undefined}
        tokens={visibleMcpStatus.tokens}
      />
    </CortexAiSettingsClient>
  );
}
