import { NextResponse } from 'next/server';
import {
  buildProtocolError,
  cancelUcpCart,
  ensureEcommerceOnline,
} from '../../../../../lib/ucp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CartCancelRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: CartCancelRouteContext) {
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
    const result = await cancelUcpCart(id, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('UCP cancel cart error:', error);
    return NextResponse.json(
      buildProtocolError('internal_server_error', 'Cart cancellation failed.'),
      { status: 500 }
    );
  }
}
