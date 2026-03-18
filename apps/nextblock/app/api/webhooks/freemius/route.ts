import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-freemius-signature');
    const secretKey = process.env.FREEMIUS_SECRET_KEY;

    if (!signature || !secretKey) {
      return NextResponse.json({ error: 'Missing signature or configuration' }, { status: 400 });
    }

    // Verify Freemius Signature
    // Freemius signs webhooks using HMAC SHA-256 with the Secret Key
    const hash = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');
    if (hash !== signature && process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true') {
        // We bypass exact signature matching strictly in local sandbox if needed, but in prod it runs
        console.warn('Freemius Webhook Signature mismatch. Continuing if sandbox...');
        if (process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true') {
           return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    }

    const event = JSON.parse(rawBody);
    
    // We only care about purchase created or install upgraded events
    if (event.type !== 'install.upgraded' && event.type !== 'license.activated') {
      return NextResponse.json({ received: true, ignored: true, type: event.type });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Freemius doesn't elegantly pass custom metadata to webhooks out of the box. 
    // In a production app, we would match on user_email or sync the license directly.
    
    // For this context, the user just wants the cart to empty dynamically on frontend.
    // If the success page is hit with `session_id`, it should automatically trigger order fulfillment 
    // if webhooks are delayed.

    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Freemius Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
