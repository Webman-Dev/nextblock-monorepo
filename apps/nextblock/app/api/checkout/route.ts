import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@nextblock-cms/ecommerce/server';
import { createClient } from '@nextblock-cms/db/server';

export async function POST(req: Request) {
  try {
    const { items, customerEmail } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }
    
    // 1. Get Selected Provider from Settings
    const supabase = createClient();
    const { data: settings } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'payment_provider')
        .single();
        
    // Parse provider, default to stripe
    let providerName: 'stripe' | 'lemon_squeezy' = 'stripe';
    if (settings?.value) {
        let val = settings.value;
        if (typeof val === 'string' && val.startsWith('"')) {
            try { val = JSON.parse(val); } catch { /* ignore */ }
        }
        if (val === 'lemon_squeezy') providerName = 'lemon_squeezy';
    }

    // 2. Get Provider Instance
    const provider = getPaymentProvider(providerName);

    // 3. Create Session
    const { url, error } = await provider.createCheckoutSession(items, customerEmail);

    if (error) {
      console.error('Checkout Error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Checkout API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
