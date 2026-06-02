import { NextResponse } from 'next/server';
import { createClient } from '@nextblock-cms/db/server';

import { loadDynamicCustomBlockExtensionDefinitions } from '../../../../lib/editor/dynamic-extension-loader';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const definitions = await loadDynamicCustomBlockExtensionDefinitions();

    return NextResponse.json({ definitions }, { status: 200 });
  } catch (error) {
    console.error('[Custom Block Editor Definitions API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected custom block editor definition error.' },
      { status: 500 }
    );
  }
}
