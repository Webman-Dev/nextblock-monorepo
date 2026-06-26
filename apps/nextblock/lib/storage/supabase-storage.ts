import 'server-only';

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import { getStorageBucket } from './provider';

// Native Supabase Storage operations, authenticated with the service-role/secret key.
// Used only when getStorageBackend() === 'supabase' (the zero-S3-key Vercel path). These
// mirror what the S3 routes do via @aws-sdk/client-s3, so the upload → process → display
// → delete pipeline works identically without any S3 access keys.

// The public bucket is created once per process. Cache the in-flight promise (not a bare
// boolean) so concurrent uploads share a SINGLE createBucket call instead of racing — and
// clear it on failure so a later request can retry rather than inheriting a cached rejection.
let bucketEnsurePromise: Promise<void> | null = null;

/** Idempotently ensure a PUBLIC bucket exists for media. Safe to call concurrently. */
export function ensureStorageBucket(): Promise<void> {
  if (bucketEnsurePromise) return bucketEnsurePromise;

  bucketEnsurePromise = (async () => {
    const bucket = getStorageBucket();
    if (!bucket) throw new Error('No storage bucket name is configured.');

    const admin = getServiceRoleSupabaseClient();
    // public: true is REQUIRED — media is served from /storage/v1/object/public/<bucket>,
    // which returns 401 for a private bucket. Do not drop this flag.
    const { error } = await admin.storage.createBucket(bucket, { public: true });
    if (error && !/already exists|duplicate|resource already exists/i.test(error.message)) {
      // Non-"exists" error — confirm via getBucket before treating it as fatal.
      const { data } = await admin.storage.getBucket(bucket);
      if (!data) {
        throw new Error(`Could not ensure storage bucket "${bucket}": ${error.message}`);
      }
    }
  })();

  // On failure, drop the cached promise so the next caller retries (don't cache a rejection).
  bucketEnsurePromise.catch(() => {
    bucketEnsurePromise = null;
  });

  return bucketEnsurePromise;
}

/** Upload (or overwrite) an object. */
export async function supabaseUploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await ensureStorageBucket();
  const admin = getServiceRoleSupabaseClient();
  const { error } = await admin.storage
    .from(getStorageBucket())
    .upload(key, body, { contentType, upsert: true });
  if (error) {
    throw new Error(`Supabase Storage upload failed for "${key}": ${error.message}`);
  }
}

/** Download an object as a Buffer (used by the image processor to fetch the original). */
export async function supabaseDownloadObject(key: string): Promise<Buffer> {
  const admin = getServiceRoleSupabaseClient();
  const { data, error } = await admin.storage.from(getStorageBucket()).download(key);
  if (error || !data) {
    throw new Error(
      `Supabase Storage download failed for "${key}": ${error?.message ?? 'no data returned'}`,
    );
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Create a signed upload URL for a NEW object key. The browser PUTs the file bytes to the
 * returned URL directly (the same shape as an S3 presigned PUT), so large uploads never
 * pass through the serverless function. The token is embedded in the URL.
 */
export async function supabaseCreateSignedUpload(
  key: string,
): Promise<{ signedUrl: string; token: string }> {
  await ensureStorageBucket();
  const admin = getServiceRoleSupabaseClient();
  const { data, error } = await admin.storage
    .from(getStorageBucket())
    .createSignedUploadUrl(key);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Supabase Storage signed upload URL failed for "${key}": ${error?.message ?? 'no URL returned'}`,
    );
  }
  return { signedUrl: data.signedUrl, token: data.token };
}

/** Remove one or more objects. No-op for an empty list. */
export async function supabaseRemoveObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const admin = getServiceRoleSupabaseClient();
  const { error } = await admin.storage.from(getStorageBucket()).remove(keys);
  if (error) {
    throw new Error(`Supabase Storage remove failed: ${error.message}`);
  }
}
