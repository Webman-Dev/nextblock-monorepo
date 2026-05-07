import { NextResponse } from 'next/server';
import {
  syncFreemiusOrderFromWebhookEvent,
  verifyFreemiusWebhookSignature,
} from '@nextblock-cms/ecommerce/server';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-signature') ?? req.headers.get('x-freemius-signature');

    if (!signature && process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true') {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (
      signature &&
      !verifyFreemiusWebhookSignature(rawBody, signature) &&
      process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true'
    ) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const result = await syncFreemiusOrderFromWebhookEvent({ event });

    return NextResponse.json({ received: true, ...result });
    
  } catch (error) {
    console.error('Freemius Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
