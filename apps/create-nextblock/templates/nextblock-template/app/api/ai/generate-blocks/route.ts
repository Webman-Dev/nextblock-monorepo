import { NextResponse } from 'next/server';

import { createClient } from '@nextblock-cms/db/server';

import {
  generateEditorHtmlFragment,
  generateEditorBlocksRequestSchema,
} from '@nextblock-cms/cortex';
import {
  safeParseCortexAiModelSelection,
  summarizeCortexAiRoutingError,
} from '@nextblock-cms/cortex';

export const dynamic = 'force-dynamic';

async function requireCmsEditorAccess() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return !profileError && (profile?.role === 'ADMIN' || profile?.role === 'WRITER');
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const hasAccess = await requireCmsEditorAccess();

    if (!hasAccess) {
      return jsonError('You do not have permission to generate editor blocks.', 403);
    }

    const body = await request.json().catch(() => null);
    const parsedRequest = generateEditorBlocksRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return jsonError('Invalid Cortex AI block generation request.', 400);
    }

    const sandboxKey = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' ? request.headers.get('x-sandbox-openrouter-key') : null;
    const sandboxModelRaw = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' ? request.headers.get('x-sandbox-openrouter-model') : null;
    
    let modelSelection = null;
    if (sandboxModelRaw) {
      try {
        modelSelection = safeParseCortexAiModelSelection(JSON.parse(sandboxModelRaw));
      } catch {
        // Ignore parse errors from headers
      }
    }

    const result = await generateEditorHtmlFragment({
      ...parsedRequest.data,
      apiKey: sandboxKey || undefined,
      modelSelection: sandboxKey && modelSelection ? modelSelection : undefined,
    });

    return NextResponse.json({
      credentialSource: result.credentialSource,
      html: result.html,
      modelId: result.modelId,
    }, {
      headers: {
        'x-cortex-ai-credential-source': result.credentialSource,
        'x-cortex-ai-model': result.modelId,
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'attempts' in error) {
      console.error(
        '[Cortex AI] Failed to generate editor HTML after model attempts:',
        JSON.stringify((error as { attempts: unknown }).attempts, null, 2)
      );
    }
    console.error('[Cortex AI] Failed to generate editor HTML:', error);
    return jsonError(
      summarizeCortexAiRoutingError(error, 'Failed to generate editor HTML.'),
      500
    );
  }
}
