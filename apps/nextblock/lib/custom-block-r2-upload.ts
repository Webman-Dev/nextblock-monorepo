import 'server-only';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3PresignClient } from '@nextblock-cms/utils/server';

import { resolveMediaUrl } from './media/resolveMediaUrl';
import { getStorageBackend, getStorageBucket } from './storage/provider';
import { supabaseCreateSignedUpload } from './storage/supabase-storage';
import {
  buildR2UploadObjectKey,
  R2_PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
  R2PresignedUploadError,
  type R2PresignedUploadResult,
  type ValidR2PresignedUploadPayload,
} from './custom-block-r2-upload-shared';

export {
  buildR2UploadObjectKey,
  R2_PRESIGNED_UPLOAD_ALLOWED_CONTENT_TYPES,
  R2_PRESIGNED_UPLOAD_DEFAULT_FOLDER,
  R2_PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
  R2_PRESIGNED_UPLOAD_MAX_BYTES,
  R2PresignedUploadError,
  sanitizeR2UploadFolder,
  validateR2PresignedUploadPayload,
  type R2PresignedUploadResult,
  type ValidR2PresignedUploadPayload,
} from './custom-block-r2-upload-shared';

export async function createR2PresignedUpload(
  payload: ValidR2PresignedUploadPayload,
  options: { now?: Date; nonce?: string; userId: string }
): Promise<R2PresignedUploadResult> {
  const backend = getStorageBackend();
  const bucketName = getStorageBucket();
  if (!bucketName) {
    throw new R2PresignedUploadError('File uploads are not configured on this server.', 500);
  }

  const objectKey = buildR2UploadObjectKey(payload, options);
  const publicUrl = resolveMediaUrl(objectKey) ?? `/${objectKey}`;

  if (backend === 'supabase') {
    // Native Supabase Storage: a signed upload URL the browser PUTs to directly.
    const { signedUrl } = await supabaseCreateSignedUpload(objectKey);
    return {
      expiresIn: R2_PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
      headers: {
        'Content-Type': payload.contentType,
      },
      method: 'PUT',
      objectKey,
      presignedUrl: signedUrl,
      publicUrl,
      uploadUrl: signedUrl,
    };
  }

  const s3Client = await getS3PresignClient();
  if (!s3Client) {
    throw new R2PresignedUploadError('File uploads are not configured on this server.', 500);
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    ContentType: payload.contentType,
    Key: objectKey,
    Metadata: {
      'uploader-user-id': options.userId,
    },
  });
  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: R2_PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
  });

  return {
    expiresIn: R2_PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
    headers: {
      'Content-Type': payload.contentType,
    },
    method: 'PUT',
    objectKey,
    presignedUrl,
    publicUrl,
    uploadUrl: presignedUrl,
  };
}
