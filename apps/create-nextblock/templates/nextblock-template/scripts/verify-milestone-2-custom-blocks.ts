import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';

import {
  buildR2UploadObjectKey,
  validateR2PresignedUploadPayload,
} from '../lib/custom-block-r2-upload-shared';
import { searchCustomBlockRelationRows } from '../lib/custom-block-relations';

async function main() {
  const uploadPayload = validateR2PresignedUploadPayload({
    contentType: 'image/webp',
    filename: 'Testimonial Portrait.webp',
    folder: 'custom-blocks/testimonials',
    size: 128_000,
  });
  const objectKey = buildR2UploadObjectKey(uploadPayload, {
    nonce: 'verify',
    now: new Date('2026-05-28T12:00:00.000Z'),
  });

  console.log('[Milestone 2] Mock R2 upload space');
  console.log(
    JSON.stringify(
      {
        headers: { 'Content-Type': uploadPayload.contentType },
        method: 'PUT',
        objectKey,
        publicUrl: `/${objectKey}`,
      },
      null,
      2
    )
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('[Milestone 2] Supabase env vars not present; skipping live relation lookup.');
    return;
  }

  const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const relationResult = await searchCustomBlockRelationRows(supabase, {
    limit: 3,
    query: '',
    table: 'pages',
  });

  console.log('[Milestone 2] Relation lookup sample');
  console.log(JSON.stringify(relationResult, null, 2));
}

main().catch((error) => {
  console.error('[Milestone 2] Verification failed:', error);
  process.exitCode = 1;
});
