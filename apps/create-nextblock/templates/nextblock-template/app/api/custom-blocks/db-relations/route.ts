import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@nextblock-cms/db/server';

import {
  getCustomBlockRelationTargetsResponse,
  searchCustomBlockRelationRows,
} from '../../../../lib/custom-block-relations';

export const dynamic = 'force-dynamic';

function parseFilters(rawFilters: string | null) {
  if (!rawFilters) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawFilters);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseValues(rawValues: string | null) {
  if (!rawValues) {
    return null;
  }

  return rawValues
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const table = searchParams.get('table')?.trim();

    if (mode === 'tables' || !table) {
      return NextResponse.json(getCustomBlockRelationTargetsResponse(), { status: 200 });
    }

    const result = await searchCustomBlockRelationRows(supabase, {
      displayColumn: searchParams.get('displayColumn'),
      filters: parseFilters(searchParams.get('filters')),
      limit: searchParams.get('limit'),
      query: searchParams.get('q'),
      table,
      valueColumn: searchParams.get('valueColumn'),
      values: parseValues(searchParams.get('values')),
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[Custom Block Relations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected relation selector error.' },
      { status: 500 }
    );
  }
}
