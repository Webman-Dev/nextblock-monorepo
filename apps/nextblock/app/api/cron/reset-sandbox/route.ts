import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
// Increase max duration for Vercel/Next.js (optional, but good for heavy ops)
export const maxDuration = 60; 

export async function GET(request: NextRequest) {
  // 1. Guard: Only run in Sandbox Mode
  if (process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true') {
    return NextResponse.json({ message: 'Sandbox reset skipped: Not in Sandbox Mode' });
  }

  // 2. Guard: Verify Cron Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // R2 Config
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!supabaseUrl || !supabaseServiceKey || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !siteUrl) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  // Initialize Clients
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  try {
    console.log('[Sandbox Reset] Starting Hard Reset...');

    // 3. Wipe R2 Storage
    console.log('[Sandbox Reset] Wiping R2 Bucket...');
    let continuationToken: string | undefined;
    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: r2BucketName,
        ContinuationToken: continuationToken,
      });
      const listRes = await s3.send(listCmd);
      
      if (listRes.Contents && listRes.Contents.length > 0) {
        const objectsToDelete = listRes.Contents.map((obj) => ({ Key: obj.Key }));
        await s3.send(new DeleteObjectsCommand({
          Bucket: r2BucketName,
          Delete: { Objects: objectsToDelete }
        }));
        console.log(`[Sandbox Reset] Deleted ${objectsToDelete.length} objects.`);
      }
      
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    // 4. Fetch & Upload Assets (Deterministic Naming)
    console.log('[Sandbox Reset] Fetching and re-seeding assets...');
    const assetsToSeed = [
      { source: 'images/nextblock-logo-small.webp', dest: 'images/nextblock-logo-small.webp' },
      { source: 'images/goals.webp', dest: 'images/goals.webp' },
      { source: 'images/programmer-upscaled.webp', dest: 'images/programmer-upscaled.webp' },
    ];

    for (const asset of assetsToSeed) {
      const fetchUrl = `${siteUrl}/${asset.source}`;
      console.log(`[Sandbox Reset] Fetching ${fetchUrl}...`);
      
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch asset: ${fetchUrl} (${res.status})`);
      }
      
      const buffer = Buffer.from(await res.arrayBuffer());
      
      await s3.send(new PutObjectCommand({
        Bucket: r2BucketName,
        Key: asset.dest,
        Body: buffer,
        ContentType: 'image/webp',
      }));
      console.log(`[Sandbox Reset] Uploaded ${asset.dest}`);
    }

    // 5. Reset Database
    console.log('[Sandbox Reset] Resetting Database...');
    const { error } = await supabase.rpc('reset_sandbox', { p_include_premium: true });

    if (error) {
      console.error('[Sandbox Reset] DB Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Sandbox Reset] Complete.');
    return NextResponse.json({ success: true, message: 'Sandbox hard reset completed successfully' });
  } catch (err: any) {
    console.error('[Sandbox Reset] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
