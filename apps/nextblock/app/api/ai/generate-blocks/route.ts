import { NextResponse } from 'next/server';

import { createClient } from '@nextblock-cms/db/server';

import {
  generateEditorBlockDocument,
  generateEditorBlocksRequestSchema,
} from '../../../../lib/ai-block-generation';

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

    const result = await generateEditorBlockDocument(parsedRequest.data);

    return NextResponse.json(result.document, {
      headers: {
        'x-cortex-ai-credential-source': result.credentialSource,
        'x-cortex-ai-model': result.modelId,
      },
    });
  } catch (error) {
    console.error('[Cortex AI] Failed to generate editor blocks:', error);
    return jsonError(
      error instanceof Error ? error.message : 'Failed to generate editor blocks.',
      500
    );
  }
}
