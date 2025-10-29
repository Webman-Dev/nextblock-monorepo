import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = body.path;

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    console.log(JSON.stringify({
      type: 'isr_revalidate',
      path: path,
    }));

    return NextResponse.json({ success: true, path: path });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Revalidation log error:', errorMessage);
    return NextResponse.json({ error: 'Invalid request body', details: errorMessage }, { status: 400 });
  }
}