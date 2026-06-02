import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@nextblock-cms/db/server';

import {
  createR2PresignedUpload,
  R2PresignedUploadError,
  validateR2PresignedUploadPayload,
} from '../../../../lib/custom-block-r2-upload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const payload = validateR2PresignedUploadPayload(await request.json());
    const upload = await createR2PresignedUpload(payload, { userId: user.id });

    return NextResponse.json(upload, { status: 200 });
  } catch (error) {
    if (error instanceof R2PresignedUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[R2 Presigned Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL.' },
      { status: 500 }
    );
  }
}
