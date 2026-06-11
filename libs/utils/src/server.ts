import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export {
  encodedRedirect,
  getEmailServerConfig,
  hasEnvVars,
} from './lib/server-utils';

const SERVER_ONLY_ERROR_MESSAGE =
  'This module cannot be imported from a Client Component module. It should only be used from a Server Component.';

if (typeof window !== 'undefined') {
  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

let cachedClient: S3Client | null = null;
let cachedPresignClient: S3Client | null = null;
let warnedMissingEnv = false;

// When `preferPublicEndpoint` is true, sign against R2_S3_PUBLIC_ENDPOINT if provided.
// This only matters for self-hosted MinIO, where the server reaches storage internally at
// R2_S3_ENDPOINT (http://minio:9000) but presigned URLs must be signed for the browser-facing
// host (http://localhost:9000). On Cloudflare R2 both overrides are unset, so behaviour is
// unchanged. R2_FORCE_PATH_STYLE='true' enables path-style addressing (required by MinIO).
function buildClient(preferPublicEndpoint = false): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint =
    (preferPublicEndpoint ? process.env.R2_S3_PUBLIC_ENDPOINT : undefined) ||
    process.env.R2_S3_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    if (!warnedMissingEnv) {
      console.warn(
        "R2 client environment variables are missing. File uploads will not work. Needed: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT (or construct from R2_ACCOUNT_ID)",
      );
      warnedMissingEnv = true;
    }
    return null;
  }

  return new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint,
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function getS3Client(): Promise<S3Client | null> {
  if (!cachedClient) {
    cachedClient = buildClient();
  }
  return cachedClient;
}

/**
 * S3 client used ONLY to sign upload URLs handed to the browser. Identical to getS3Client()
 * on Cloudflare R2; when R2_S3_PUBLIC_ENDPOINT is set (self-hosted MinIO) it signs URLs for
 * the browser-reachable host so direct-from-browser PUT uploads succeed.
 */
export async function getS3PresignClient(): Promise<S3Client | null> {
  if (!process.env.R2_S3_PUBLIC_ENDPOINT) {
    return getS3Client();
  }
  if (!cachedPresignClient) {
    cachedPresignClient = buildClient(true);
  }
  return cachedPresignClient;
}

export async function deleteMediaFiles(keys: string[]) {
  const s3 = await getS3Client();
  if (!s3 || !process.env['R2_BUCKET_NAME']) {
      console.warn("deleteMediaFiles: S3 client or Bucket not configured.");
      return;
  }

  if (keys.length === 0) return;

  try {
    const output = await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env['R2_BUCKET_NAME'],
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      })
    );

    if (output.Errors && output.Errors.length > 0) {
        console.error("[deleteMediaFiles] Errors reported by R2:", output.Errors);
    }
  } catch (error) {
    console.error("[deleteMediaFiles] Exception failed to delete files from R2:", error);
  }
}
