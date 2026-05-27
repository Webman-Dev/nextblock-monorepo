import { NextResponse } from 'next/server';
import {
  buildProtocolError,
  ensureEcommerceOnline,
  getCatalogProduct,
  parseJsonBody,
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
    const result = await getCatalogProduct(body, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('UCP catalog product error:', error);
    return NextResponse.json(
      buildProtocolError('internal_server_error', 'Catalog product lookup failed.'),
      { status: 500 }
    );
  }
}
