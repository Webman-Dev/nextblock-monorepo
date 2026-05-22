import { NextResponse } from 'next/server';
import { syncFreemiusCheckoutOrder } from '@nextblock-cms/ecommerce/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId : null;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing Freemius order ID' },
        { status: 400 }
      );
    }

    const result = await syncFreemiusCheckoutOrder({
      orderId,
      checkoutResponse: body.checkoutResponse ?? body.response ?? null,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[Freemius Checkout Sync] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Freemius checkout sync failed' },
      { status: 500 }
    );
  }
}
