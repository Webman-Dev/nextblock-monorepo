import { NextRequest, NextResponse } from 'next/server';

import { syncStoreCurrencyRates } from '@nextblock-cms/ecommerce/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // CRON_SECRET is optional: when set we enforce Vercel's `Authorization: Bearer`
  // header, but a zero-config deploy can leave it unset (the job only does low-harm
  // FX-rate sync). Set CRON_SECRET in the project env to lock the endpoint down.
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
    });
  }

  try {
    const result = await syncStoreCurrencyRates();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to sync currency exchange rates.',
      },
      { status: 500 }
    );
  }
}
