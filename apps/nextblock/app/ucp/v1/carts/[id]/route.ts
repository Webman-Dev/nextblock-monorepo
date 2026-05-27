import { NextResponse } from 'next/server';
import {
  buildProtocolError,
  ensureEcommerceOnline,
  getUcpCart,
  parseJsonBody,
  updateUcpCart,
} from '../../../../lib/ucp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CartRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: CartRouteContext) {
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

    const { id } = await context.params;
    const result = await getUcpCart(id, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('UCP get cart error:', error);
    return NextResponse.json(
      buildProtocolError('internal_server_error', 'Cart retrieval failed.'),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: CartRouteContext) {
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

    const { id } = await context.params;
    const body = await parseJsonBody(request);
    const result = await updateUcpCart(id, body, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('UCP update cart error:', error);
    return NextResponse.json(
      buildProtocolError('internal_server_error', 'Cart update failed.'),
      { status: 500 }
    );
  }
}

export const PATCH = PUT;
