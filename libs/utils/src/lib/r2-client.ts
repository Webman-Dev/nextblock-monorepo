'use server';

const SERVER_ONLY_ERROR_MESSAGE =
  'This module cannot be imported from a Client Component module. It should only be used from a Server Component.';

if (typeof window !== 'undefined') {
  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;
let warnedMissingEnv = false;

function buildClient(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint =
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
