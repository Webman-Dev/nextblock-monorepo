import { NextResponse } from 'next/server';
import { buildUcpProfile } from '../../lib/ucp/protocol';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const baseUrl =
    process.env.NEXT_PUBLIC_URL?.replace(/\/+$/, '') || new URL(request.url).origin;

  return NextResponse.json(buildUcpProfile(baseUrl), {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
