// apps/nextblock/app/api/upload/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@nextblock-cms/db/server';
import { getS3Client } from '@nextblock-cms/utils/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!R2_BUCKET_NAME) {
    console.error('R2_BUCKET_NAME is not set.');
    return NextResponse.json({ error: 'Server configuration error for file uploads.' }, { status: 500 });
  }

  try {
    const s3Client = await getS3Client();
    if (!s3Client) {
      console.error('R2 client is not configured. Check your R2 environment variables.');
      return NextResponse.json({ error: 'File uploads are not configured on this server.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = (formData.get('folder') as string | null) ?? undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop() || '';
    const baseFilename = fileExtension ? file.name.substring(0, file.name.length - (fileExtension.length + 1)) : file.name;
    const sanitizedBaseFilename = baseFilename.toLowerCase().replace(/\s+/g, '-').replace(/[^\w.-]+/g, '');
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    // Sanitize and normalize folder path
    const sanitizeFolder = (input?: string | null) => {
      const f = (input ?? '').toString().trim();
      if (!f) return 'uploads/';
      let cleaned = f.replace(/^\/+/, '');
      cleaned = cleaned.replace(/\\/g, '/');
      cleaned = cleaned.replace(/\.{2,}/g, '');
      cleaned = cleaned.replace(/[^a-zA-Z0-9_\-/]+/g, '-');
      if (cleaned && !cleaned.endsWith('/')) cleaned += '/';
      return cleaned || 'uploads/';
    };
    const folder = sanitizeFolder(rawFolder);

    const uniqueKey = `${folder}${sanitizedBaseFilename}_${timestamp}${fileExtension ? '.' + fileExtension : ''}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        'uploader-user-id': user.id,
      },
    });

    await s3Client.send(command);

    return NextResponse.json({
      objectKey: uniqueKey,
      message: 'File uploaded successfully.',
    });

  } catch (error) {
    console.error('Error proxying file upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Upload failed on server: ${errorMessage}` }, { status: 500 });
  }
}
