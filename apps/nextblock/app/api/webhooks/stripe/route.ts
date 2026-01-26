import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@nextblock-cms/ecommerce/server';

// Prevent Next.js from parsing the body automatically, needed for stripe signature verification
// BUT in App Router 'req.text()' gives us the raw body without needing config.api.bodyParser = false

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const { received, error } = await handleStripeWebhook(signature, Buffer.from(body));

    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ received });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
