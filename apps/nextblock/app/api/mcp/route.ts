import { revalidatePath } from 'next/cache';

import {
  createClient,
  getServiceRoleSupabaseClient,
  verifyPackageOnline,
} from '@nextblock-cms/db/server';
import {
  CORTEX_AI_PACKAGE_ID,
  handleCortexMcpMessage,
  isLocalhostHost,
  parseBearerToken,
  resolveCortexAiMcpSettings,
  shouldTrustLocalMcpRequest,
  touchCortexAiMcpToken,
  verifyCortexAiMcpToken,
  type CortexAiMcpScope,
  type CortexMcpToolContext,
  type JsonRpcMessage,
} from '@nextblock-cms/cortex';

import { validateBlockContent } from '../../../lib/blocks/blockRegistry';
import { importExternalImageToMedia } from '../../cms/media/import-external-image';
import { captureRevisionBaseline, commitRevisionFromBaseline } from '../../cms/revisions/service';
import type { AnyFullContent } from '../../cms/revisions/utils';

/**
 * Model Context Protocol server endpoint.
 *
 * Exposes the Cortex AI tool registry over MCP Streamable HTTP so external clients
 * (Claude Code, Claude Desktop, Cursor, VS Code) can operate this CMS with the same
 * typed, validated tools the in-app dashboard agent uses. The protocol itself lives
 * in `@nextblock-cms/cortex` (`mcp-server.ts`); this file is the HTTP shim plus auth.
 *
 * Node runtime, not Edge: the tool executors reach `node:crypto`, `sharp` (via the
 * media importer) and the service-role Supabase client.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SERVER_VERSION = '1.0.0';

/**
 * Confirmation is skipped for MCP callers, deliberately.
 *
 * The in-app agent's two-phase confirm works by matching a phrase in the user's *next
 * chat message*, which has no analogue in MCP — the model calls a tool and gets a
 * result, with no channel to carry a human phrase back. Every MCP host already gates
 * tool calls behind its own approval UI, so the confirmation would be a second prompt
 * the protocol cannot satisfy, and leaving it on would simply make every mutating
 * tool return a preview forever. The real control for MCP is the token scope: a
 * read-only token never sees a mutating tool at all.
 */
const MCP_SKIP_CONFIRMATION = true;

type McpAuth = {
  actorUserId: string | null;
  scopes: CortexAiMcpScope[];
  source: 'admin-session' | 'localhost' | 'token';
};

async function importExternalImageForMcp(input: {
  url: string;
  altText?: string;
}): Promise<{ id: string } | { error: string }> {
  const result = await importExternalImageToMedia({ altText: input.altText, url: input.url });

  if ('error' in result) {
    return { error: result.error };
  }

  return { id: result.media.id };
}

/** Mirrors the global-agent route so MCP writes land in Revision History like any other edit. */
function createMcpRevisionRecorder(authorId: string | null) {
  return async function recordRevision(input: {
    baseline?: unknown;
    contentType: 'page' | 'post' | 'product';
    entityId: number | string;
    phase: 'capture' | 'commit';
  }): Promise<unknown> {
    if (input.phase === 'capture') {
      return captureRevisionBaseline(input.contentType, input.entityId);
    }

    const result = await commitRevisionFromBaseline(
      input.contentType,
      input.entityId,
      authorId,
      (input.baseline ?? null) as AnyFullContent | null
    );

    if ('error' in result) {
      console.error('Cortex AI MCP: revision not recorded —', result.error);
    }

    return undefined;
  };
}

/**
 * Reject cross-origin browser calls (DNS-rebinding defence, required by the spec).
 *
 * Only enforced when an `Origin` header is present: native MCP clients are not
 * browsers and send none, so requiring one would lock out every real caller.
 */
function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  if (isLocalhostHost(originHost)) {
    return true;
  }

  const host = request.headers.get('host');

  if (host && originHost.toLowerCase() === host.toLowerCase()) {
    return true;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).host.toLowerCase() === originHost.toLowerCase();
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Establish who is calling.
 *
 * Three accepted paths, in priority order:
 *  1. A bearer token from `mcp_access_tokens` — the path every external client uses.
 *  2. An authenticated ADMIN cookie session — lets the dashboard's own "Test
 *     connection" button reach the endpoint without minting a token first.
 *  3. Loopback in development, when the operator has left that setting on.
 */
async function authenticateMcpRequest(request: Request): Promise<McpAuth | null> {
  const serviceClient = getServiceRoleSupabaseClient();
  const settings = await resolveCortexAiMcpSettings(serviceClient);

  if (!settings.enabled) {
    return null;
  }

  const bearer = parseBearerToken(request.headers.get('authorization'));

  if (bearer) {
    const verification = await verifyCortexAiMcpToken(serviceClient, bearer);

    if (!verification.valid) {
      return null;
    }

    // Bookkeeping only — never block the call on it.
    void touchCortexAiMcpToken(serviceClient, verification.token.id);

    return {
      actorUserId: verification.token.created_by,
      scopes: verification.scopes,
      source: 'token',
    };
  }

  const adminUserId = await resolveAdminSessionUserId();

  if (adminUserId) {
    return { actorUserId: adminUserId, scopes: ['read', 'write'], source: 'admin-session' };
  }

  if (shouldTrustLocalMcpRequest({ hostHeader: request.headers.get('host'), settings })) {
    return { actorUserId: null, scopes: ['read', 'write'], source: 'localhost' };
  }

  return null;
}

async function resolveAdminSessionUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'ADMIN' ? user.id : null;
  } catch {
    return null;
  }
}

function buildToolContext(auth: McpAuth): CortexMcpToolContext {
  return {
    actorUserId: auth.actorUserId,
    importExternalImage: importExternalImageForMcp,
    // No open editor over MCP: tools that need a target take it in their arguments
    // (`cmsTarget`, `slug`, `entityId`) rather than inheriting one from a UI.
    pageContext: null,
    recordRevision: createMcpRevisionRecorder(auth.actorUserId),
    revalidatePath,
    skipConfirmation: MCP_SKIP_CONFIRMATION,
    supabase: getServiceRoleSupabaseClient(),
    validateBlockContent,
  };
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
} as const;

/**
 * 401 for an unauthenticated caller.
 *
 * The `WWW-Authenticate` value is intentionally bare. Adding a `resource_metadata`
 * parameter would advertise RFC 9728 OAuth discovery, and Claude Code responds to
 * that by starting an OAuth flow — which dead-ends against a static-token server.
 * A plain challenge tells the client "send a bearer token" and nothing more.
 */
function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: {
      ...JSON_HEADERS,
      'WWW-Authenticate': 'Bearer realm="NextBlock Cortex AI MCP"',
    },
    status: 401,
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed.' }), {
      headers: JSON_HEADERS,
      status: 403,
    });
  }

  const isCortexAiActive = await verifyPackageOnline(CORTEX_AI_PACKAGE_ID);

  if (!isCortexAiActive) {
    return new Response(
      JSON.stringify({ error: 'NextBlock Cortex AI is not active for this workspace.' }),
      { headers: JSON_HEADERS, status: 403 }
    );
  }

  const auth = await authenticateMcpRequest(request);

  if (!auth) {
    return unauthorized(
      'A valid NextBlock MCP access token is required. Generate one in CMS Settings → Cortex AI, and confirm the MCP server is enabled there.'
    );
  }

  let message: JsonRpcMessage;

  try {
    message = (await request.json()) as JsonRpcMessage;
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: -32700, message: 'Parse error: request body is not valid JSON.' },
        id: null,
        jsonrpc: '2.0',
      }),
      { headers: JSON_HEADERS, status: 400 }
    );
  }

  const response = await handleCortexMcpMessage(message, {
    context: buildToolContext(auth),
    scopes: auth.scopes,
    serverVersion: SERVER_VERSION,
  });

  // Notifications and responses: 202 Accepted with no body. Returning a JSON-RPC
  // envelope for a message that carried no `id` desyncs strict clients.
  if (response.body === null) {
    return new Response(null, { status: response.status });
  }

  return new Response(JSON.stringify(response.body), {
    headers: JSON_HEADERS,
    status: response.status,
  });
}

/**
 * The optional server→client SSE stream.
 *
 * This server never initiates requests or pushes unsolicited notifications — every
 * response is returned inline on the POST — so there is nothing to stream. The spec
 * explicitly permits answering the GET with 405 in that case.
 */
export function GET(): Response {
  return new Response(
    JSON.stringify({
      error:
        'This MCP endpoint does not offer a server-initiated SSE stream. Send JSON-RPC messages via POST.',
    }),
    { headers: { ...JSON_HEADERS, Allow: 'POST, DELETE, OPTIONS' }, status: 405 }
  );
}

/** Session termination. The server is stateless, so there is no session to tear down. */
export function DELETE(): Response {
  return new Response(null, { status: 204 });
}

export function OPTIONS(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      Allow: 'POST, DELETE, OPTIONS',
    },
    status: 204,
  });
}
