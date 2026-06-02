import { NextResponse } from 'next/server';
import {
  buildProtocolError,
  createUcpCart,
  ensureEcommerceOnline,
  parseJsonBody,
} from '../../../lib/ucp/server';

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
    const result = await createUcpCart(body, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('UCP create cart error:', error);
    return NextResponse.json(
      buildProtocolError('internal_server_error', 'Cart creation failed.'),
      { status: 500 }
    );
  }
}
