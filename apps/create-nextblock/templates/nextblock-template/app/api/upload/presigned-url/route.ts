// app/api/upload/presigned-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@nextblock-cms/db/server"; // Server client for auth
import { getS3Client } from "@nextblock-cms/utils/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role - only WRITER or ADMIN can upload
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  if (!R2_BUCKET_NAME) {
    console.error("R2_BUCKET_NAME is not set.");
    return NextResponse.json({ error: "Server configuration error for file uploads." }, { status: 500 });
  }

  try {
    const s3Client = await getS3Client();
    if (!s3Client) {
      console.error('R2 client is not configured. Check your R2 environment variables.');
      return NextResponse.json({ error: 'File uploads are not configured on this server.' }, { status: 500 });
    }

    const { filename, contentType, size, folder: rawFolder } = await request.json();

    if (!filename || !contentType || !size) {
      return NextResponse.json({ error: "Missing filename, contentType, or size" }, { status: 400 });
    }

    // Basic validation (you can enhance this)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024*1024)}MB.` }, { status: 400 });
    }
    // Add content type validation if needed

    const fileExtension = filename.split('.').pop() || '';
    const baseFilename = fileExtension ? filename.substring(0, filename.length - (fileExtension.length + 1)) : filename;

    // Sanitize baseFilename to remove characters not suitable for URLs/filenames, replace spaces with hyphens
    const sanitizedBaseFilename = baseFilename
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^\w.-]+/g, ''); // Remove non-alphanumeric characters except hyphen and period

    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

    // Sanitize and normalize folder path
    const sanitizeFolder = (input?: string | null) => {
      const f = (input ?? '').toString().trim();
      if (!f) return 'uploads/';
      // remove leading slashes, collapse .. and illegal chars
      let cleaned = f.replace(/^\/+/, '');
      cleaned = cleaned.replace(/\\/g, '/');
      cleaned = cleaned.replace(/\.{2,}/g, '');
      cleaned = cleaned.replace(/[^a-zA-Z0-9_\-/]+/g, '-');
      if (cleaned && !cleaned.endsWith('/')) cleaned += '/';
      return cleaned || 'uploads/';
    };
    const folder = sanitizeFolder(rawFolder);

    const uniqueKey = `${folder}${sanitizedBaseFilename}_${timestamp}${fileExtension ? '.' + fileExtension : ''}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
      // ACL: 'public-read', // R2 objects are private by default unless bucket is public or presigned URL for GET is used
                           // For direct PUT, ACL is not typically set this way with R2. Permissions are on bucket/token.
      Metadata: { // Optional: add any metadata
        'uploader-user-id': user.id,
      }
    });

    const expiresIn = 300; // 5 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return NextResponse.json({
      presignedUrl,
      objectKey: `${uniqueKey}`, // Send back the key prefixed with bucket name
      method: "PUT",
    });

  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
  }
}
