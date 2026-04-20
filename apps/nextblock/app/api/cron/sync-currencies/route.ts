import { NextRequest, NextResponse } from 'next/server';

import { syncStoreCurrencyRates } from '@nextblock-cms/ecommerce/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
