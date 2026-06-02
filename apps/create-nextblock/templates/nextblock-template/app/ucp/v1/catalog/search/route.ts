import { NextResponse } from 'next/server';
import {
  buildProtocolError,
  ensureEcommerceOnline,
  parseJsonBody,
  searchCatalogProducts,
} from '../../../../lib/ucp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const isOnline = await ensureEcommerceOnline();
    if (!isOnline) {
      return NextResponse.json(
        buildProtocolError(
          'ecommerce_unavailable',
          'Ecommerce module license is inactive.'
        ),
        { status: 403 }
      );
    }

    const body = await parseJsonBody(request);
    return NextResponse.json(await searchCatalogProducts(body, request));
  } catch (error) {
    console.error('UCP catalog search error:', error);
    return NextResponse.json(
      buildProtocolError('internal_server_error', 'Catalog search failed.'),
      { status: 500 }
    );
  }
}
