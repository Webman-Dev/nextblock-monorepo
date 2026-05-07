import { NextResponse, type NextRequest } from 'next/server';
import { searchPublicContent } from '../../../lib/search/server';
import type { GlobalSearchFilter } from '../../../lib/search/types';

export const dynamic = 'force-dynamic';

const VALID_FILTERS = new Set<GlobalSearchFilter>(['all', 'page', 'post', 'product']);

function readFilter(value: string | null): GlobalSearchFilter {
  return VALID_FILTERS.has(value as GlobalSearchFilter)
    ? (value as GlobalSearchFilter)
    : 'all';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const locale = searchParams.get('locale');
  const filter = readFilter(searchParams.get('type'));
  const limit = Number.parseInt(searchParams.get('limit') || '', 10);

  try {
    const response = await searchPublicContent({
      query: q,
      locale,
      filter,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Global search failed:', error);
    return NextResponse.json(
      {
        query: q,
        results: [],
        counts: { all: 0, page: 0, post: 0, product: 0 },
        error: 'Search failed',
      },
      { status: 500 }
    );
  }
}
