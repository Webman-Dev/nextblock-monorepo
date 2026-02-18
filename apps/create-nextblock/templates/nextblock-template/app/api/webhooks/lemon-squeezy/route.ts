import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const clone = req.clone();
    const event = await req.json();
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
        return NextResponse.json({ error: 'Lemon Squeezy Webhook Secret not set' }, { status: 500 });
    }

    // Verification
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(await clone.text()).digest('hex');
    const signature = req.headers.get('X-Signature');

    if (!signature || signature !== digest) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { meta, data } = event;
    const eventName = meta.event_name;
    
    // Logging as requested for debugging
    console.log('LS Webhook Payload:', JSON.stringify(event, null, 2));

    if (eventName === 'order_created') {
        const orderId = meta.custom_data?.order_id;
        const userId = meta.custom_data?.user_id || null;
        
        if (!orderId) {
             console.error('No order_id found in Lemon Squeezy webhook metadata');
             return NextResponse.json({ error: 'No order_id' }, { status: 400 });
        }

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
        
        // Update Order
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'paid', // Map 'paid' from LS to 'paid' in our DB
                provider: 'lemon_squeezy',
                customer_details: data.attributes.user_email ? { email: data.attributes.user_email } : undefined,
                user_id: userId // Update user_id if present
            })
            .eq('id', orderId);

        if (error) {
            console.error('Error updating order:', error);
            return NextResponse.json({ error: 'Db Error' }, { status: 500 });
        }
        
        // Decrement stock? logic from Stripe webhook
        // We'd need to fetch order items and decrement.
        // Reusing logic from stripe webhook or extracting it would be best.
        // For now, let's implement the basic status update.
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Lemon Squeezy Webhook Error:', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
