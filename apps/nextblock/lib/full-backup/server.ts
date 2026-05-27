import "server-only";

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { createClient, getServiceRoleSupabaseClient } from "@nextblock-cms/db/server";
import { getS3Client } from "@nextblock-cms/utils/server";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import { exportBackupBundle } from "../cms-transfer/server";
import {
  FULL_BACKUP_CONFIRMATION,
  FULL_BACKUP_CONTENT_PATH,
  FULL_BACKUP_DATABASE_PATH,
  FULL_BACKUP_MANIFEST_PATH,
  archivePathForObjectKey,
  isValidFullBackupConfirmation,
  normalizeMediaBaseUrl,
  parseFullBackupManifest,
  replaceMediaBaseUrlInJson,
  replaceMediaBaseUrlInString,
  type FullBackupManifestV1,
  type FullBackupMediaUrlMode,
  type FullBackupStorageObjectManifest,
} from "./manifest";

type SupabaseAny = ReturnType<typeof getServiceRoleSupabaseClient>;

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface DatabaseConnectionParts {
  host: string;
  port: string;
  dbName: string;
  user: string;
  password: string;
  sslMode: string;
}

interface FullBackupArchiveInspection {
  manifest: FullBackupManifestV1;
  files: Record<string, Uint8Array>;
  warnings: string[];
  databaseDumpBytes: number;
  contentBundleBytes: number;
  missingStorageObjects: string[];
}

export interface FullBackupReviewSummary {
  success: boolean;
  error?: string;
  exportedAt?: string;
  sourceBucket?: string | null;
  sourceBaseUrl?: string | null;
  databaseDumpBytes?: number;
  contentBundleBytes?: number;
  storageObjects?: number;
  missingStorageObjects?: number;
  warnings: string[];
}

export interface FullBackupRestoreSummary extends FullBackupReviewSummary {
  databaseRestored?: boolean;
  storageObjectsUploaded?: number;
  storageObjectsDeleted?: number;
  mediaUrlRewriteMode?: FullBackupMediaUrlMode;
  mediaUrlRowsUpdated?: number;
}

export interface FullBackupArchiveExport {
  fileName: string;
  mimeType: string;
  content: Buffer;
  manifest: FullBackupManifestV1;
}

const ARCHIVE_MIME_TYPE = "application/zip";

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readAppVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
    };
    return packageJson.version || null;
  } catch {
    return null;
  }
}

async function requireAdminUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "ADMIN") {
    throw new Error("Admin role required.");
  }
}

export async function requireFullBackupAdmin() {
  await requireAdminUser();
}

function getDatabaseConnectionParts(): DatabaseConnectionParts {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("POSTGRES_URL or DATABASE_URL is required for full database backup/restore.");
  }

  let connectionUrl: URL;
  try {
    connectionUrl = new URL(dbUrl);
  } catch (error) {
    throw new Error(
      `Database connection URL is invalid: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  return {
    host: connectionUrl.hostname,
    port: connectionUrl.port || "5432",
    dbName: decodeURIComponent(connectionUrl.pathname.replace(/^\//, "")),
    user: decodeURIComponent(connectionUrl.username),
    password: decodeURIComponent(connectionUrl.password),
    sslMode: connectionUrl.searchParams.get("sslmode") || "require",
  };
}

function buildDatabaseEnv(parts: DatabaseConnectionParts) {
  return {
    ...process.env,
    PGPASSWORD: parts.password,
    PGSSLMODE: parts.sslMode,
  };
}

function appendLimited(current: string, chunk: Buffer, limit = 16_000) {
  const next = `${current}${chunk.toString()}`;
  return next.length > limit ? next.slice(next.length - limit) : next;
}

function runCommand(command: string, args: string[], options?: { env?: NodeJS.ProcessEnv; cwd?: string }) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on("error", (error) => {
      reject(new Error(`${command} could not start: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `${command} exited with code ${code}.${stderr ? `\n${stderr.trim()}` : stdout ? `\n${stdout.trim()}` : ""}`
        )
      );
    });
  });
}

async function assertCommandAvailable(command: "pg_dump" | "psql") {
  try {
    await runCommand(command, ["--version"]);
  } catch (error) {
    throw new Error(
      `${command} is required for full ZIP backup/restore but is not available to the server process. ${
        error instanceof Error ? error.message : ""
      }`.trim()
    );
  }
}

async function createDatabaseDump(dumpFile: string) {
  await assertCommandAvailable("pg_dump");
  const parts = getDatabaseConnectionParts();
  await runCommand(
    "pg_dump",
    [
      "--clean",
      "--if-exists",
      "--quote-all-identifiers",
      "-h",
      parts.host,
      "-U",
      parts.user,
      "-p",
      parts.port,
      "-d",
      parts.dbName,
      "-f",
      dumpFile,
    ],
    { env: buildDatabaseEnv(parts) }
  );
}

async function restoreDatabaseDump(dumpFile: string) {
  await assertCommandAvailable("psql");
  const parts = getDatabaseConnectionParts();
  await runCommand(
    "psql",
    ["-h", parts.host, "-U", parts.user, "-p", parts.port, "-d", parts.dbName, "-f", dumpFile],
    { env: buildDatabaseEnv(parts) }
  );
}

async function requireR2Client() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is required for full ZIP backup/restore.");
  }

  const client = await getS3Client();
  if (!client) {
    throw new Error("R2 client is not configured. Check R2 account, endpoint, and access key environment variables.");
  }

  return { client, bucket };
}

async function listR2Objects(client: S3Client, bucket: string) {
  const objects: Array<{
    key: string;
    size: number | null;
    etag: string | null;
    lastModified: string | null;
  }> = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents || []) {
      if (!item.Key) continue;
      objects.push({
        key: item.Key.replace(/^\/+/, ""),
        size: typeof item.Size === "number" ? item.Size : null,
        etag: item.ETag || null,
        lastModified: item.LastModified?.toISOString() || null,
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function r2BodyToUint8Array(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (body instanceof Uint8Array) return body;

  const maybeTransform = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof maybeTransform.transformToByteArray === "function") {
    return maybeTransform.transformToByteArray();
  }

  const maybeArrayBuffer = body as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof maybeArrayBuffer.arrayBuffer === "function") {
    return new Uint8Array(await maybeArrayBuffer.arrayBuffer());
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function addR2ObjectsToArchive(params: {
  client: S3Client;
  bucket: string;
  archiveEntries: Record<string, Uint8Array>;
}) {
  const manifestObjects: FullBackupStorageObjectManifest[] = [];
  const objects = await listR2Objects(params.client, params.bucket);

  for (const object of objects) {
    const response = await params.client.send(
      new GetObjectCommand({
        Bucket: params.bucket,
        Key: object.key,
      })
    );
    const archivePath = archivePathForObjectKey(object.key);
    params.archiveEntries[archivePath] = await r2BodyToUint8Array(response.Body);
    manifestObjects.push({
      key: object.key,
      archive_path: archivePath,
      size: object.size,
      etag: object.etag,
      content_type: response.ContentType || null,
      last_modified: object.lastModified,
    });
  }

  return manifestObjects;
}

function buildManifest(objects: FullBackupStorageObjectManifest[]): FullBackupManifestV1 {
  return {
    type: "nextblock-full-site-backup",
    version: 1,
    exported_at: new Date().toISOString(),
    app: {
      name: "nextblock",
      version: readAppVersion(),
    },
    database: {
      path: FULL_BACKUP_DATABASE_PATH,
      created_with: "pg_dump",
    },
    content: {
      path: FULL_BACKUP_CONTENT_PATH,
      type: "nextblock-content-backup-v1",
    },
    storage: {
      bucket: process.env.R2_BUCKET_NAME || null,
      source_base_url: normalizeMediaBaseUrl(process.env.NEXT_PUBLIC_R2_BASE_URL),
      public_url: normalizeMediaBaseUrl(process.env.NEXT_PUBLIC_R2_PUBLIC_URL),
      objects,
    },
  };
}

export async function exportFullBackupArchive(): Promise<FullBackupArchiveExport> {
  await requireAdminUser();
  const { client, bucket } = await requireR2Client();
  const tempDir = await mkdtemp(path.join(tmpdir(), "nextblock-full-backup-"));

  try {
    const dumpFile = path.join(tempDir, "dump.sql");
    await createDatabaseDump(dumpFile);

    const archiveEntries: Record<string, Uint8Array> = {
      [FULL_BACKUP_DATABASE_PATH]: await readFile(dumpFile),
      [FULL_BACKUP_CONTENT_PATH]: strToU8(await exportBackupBundle()),
    };

    const storageObjects = await addR2ObjectsToArchive({
      client,
      bucket,
      archiveEntries,
    });
    const manifest = buildManifest(storageObjects);
    archiveEntries[FULL_BACKUP_MANIFEST_PATH] = strToU8(JSON.stringify(manifest, null, 2));

    return {
      fileName: `nextblock-full-site-backup-${dateStamp()}.zip`,
      mimeType: ARCHIVE_MIME_TYPE,
      content: Buffer.from(zipSync(archiveEntries, { level: 0 })),
      manifest,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function inspectFullBackupArchive(archive: Uint8Array): FullBackupArchiveInspection {
  const files = unzipSync(archive);
  const manifestContent = files[FULL_BACKUP_MANIFEST_PATH];
  if (!manifestContent) {
    throw new Error("Full backup ZIP is missing manifest.json.");
  }

  const manifest = parseFullBackupManifest(strFromU8(manifestContent));
  const warnings: string[] = [];
  const missingStorageObjects: string[] = [];
  const databaseDumpBytes = files[FULL_BACKUP_DATABASE_PATH]?.byteLength || 0;
  const contentBundleBytes = files[FULL_BACKUP_CONTENT_PATH]?.byteLength || 0;

  if (!databaseDumpBytes) {
    throw new Error("Full backup ZIP is missing database/dump.sql.");
  }
  if (!contentBundleBytes) {
    warnings.push("Content JSON bundle is missing or empty. Database restore can still continue.");
  }

  for (const object of manifest.storage.objects) {
    if (!files[object.archive_path]) {
      missingStorageObjects.push(object.key);
    }
  }

  if (missingStorageObjects.length > 0) {
    warnings.push(`${missingStorageObjects.length} R2 object(s) listed in the manifest are missing from the ZIP.`);
  }

  return {
    manifest,
    files,
    warnings,
    databaseDumpBytes,
    contentBundleBytes,
    missingStorageObjects,
  };
}

export function reviewFullBackupArchive(archive: Uint8Array): FullBackupReviewSummary {
  try {
    const inspection = inspectFullBackupArchive(archive);
    return {
      success: inspection.missingStorageObjects.length === 0,
      exportedAt: inspection.manifest.exported_at,
      sourceBucket: inspection.manifest.storage.bucket,
      sourceBaseUrl: inspection.manifest.storage.source_base_url,
      databaseDumpBytes: inspection.databaseDumpBytes,
      contentBundleBytes: inspection.contentBundleBytes,
      storageObjects: inspection.manifest.storage.objects.length,
      missingStorageObjects: inspection.missingStorageObjects.length,
      warnings: inspection.warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review full backup archive.",
      warnings: [],
    };
  }
}

export async function reviewFullBackupArchiveForAdmin(archive: Uint8Array) {
  await requireAdminUser();
  return reviewFullBackupArchive(archive);
}

async function uploadR2Objects(params: {
  client: S3Client;
  bucket: string;
  files: Record<string, Uint8Array>;
  objects: FullBackupStorageObjectManifest[];
}) {
  let uploaded = 0;

  for (const object of params.objects) {
    const body = params.files[object.archive_path];
    if (!body) {
      throw new Error(`R2 object ${object.key} is missing from the backup ZIP.`);
    }

    await params.client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: object.key,
        Body: body,
        ContentType: object.content_type || undefined,
        ContentLength: body.byteLength,
      })
    );
    uploaded += 1;
  }

  return uploaded;
}

async function deleteExtraneousR2Objects(params: {
  client: S3Client;
  bucket: string;
  keepKeys: Set<string>;
}) {
  const existingObjects = await listR2Objects(params.client, params.bucket);
  const deleteKeys = existingObjects
    .map((object) => object.key)
    .filter((key) => !params.keepKeys.has(key));
  let deleted = 0;

  for (let index = 0; index < deleteKeys.length; index += 1000) {
    const batch = deleteKeys.slice(index, index + 1000);
    if (batch.length === 0) continue;
    await params.client.send(
      new DeleteObjectsCommand({
        Bucket: params.bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
        },
      })
    );
    deleted += batch.length;
  }

  return deleted;
}

async function updateJsonColumns(params: {
  supabase: SupabaseAny;
  table: string;
  idColumn: string;
  columns: string[];
  sourceBaseUrl: string;
  destinationBaseUrl: string;
}) {
  const client = params.supabase as any;
  let updatedRows = 0;
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from(params.table)
      .select([params.idColumn, ...params.columns].join(","))
      .range(from, to);

    if (error) {
      throw new Error(`Failed to scan ${params.table}: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      const patch: Record<string, unknown> = {};
      for (const column of params.columns) {
        const current = row[column] ?? null;
        const next = replaceMediaBaseUrlInJson(current, params.sourceBaseUrl, params.destinationBaseUrl);
        if (JSON.stringify(current) !== JSON.stringify(next)) {
          patch[column] = next;
        }
      }

      if (Object.keys(patch).length === 0) continue;

      const { error: updateError } = await client
        .from(params.table)
        .update(patch)
        .eq(params.idColumn, row[params.idColumn]);
      if (updateError) {
        throw new Error(`Failed to update ${params.table}: ${updateError.message}`);
      }
      updatedRows += 1;
    }

    if (data.length < pageSize) break;
  }

  return updatedRows;
}

async function rewriteMediaBaseUrls(params: {
  sourceBaseUrl: string;
  destinationBaseUrl: string;
  warnings: string[];
}) {
  const sourceBaseUrl = normalizeMediaBaseUrl(params.sourceBaseUrl);
  const destinationBaseUrl = normalizeMediaBaseUrl(params.destinationBaseUrl);
  if (!sourceBaseUrl || !destinationBaseUrl || sourceBaseUrl === destinationBaseUrl) {
    return 0;
  }

  const supabase = getServiceRoleSupabaseClient();
  const client = supabase as any;
  let updatedRows = 0;
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("media")
      .select("id, file_path, variants")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to scan media URLs: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      const nextFilePath =
        typeof row.file_path === "string"
          ? replaceMediaBaseUrlInString(row.file_path, sourceBaseUrl, destinationBaseUrl)
          : row.file_path;
      const nextVariants = replaceMediaBaseUrlInJson(row.variants ?? null, sourceBaseUrl, destinationBaseUrl);
      const patch: Record<string, unknown> = {};

      if (row.file_path !== nextFilePath) patch.file_path = nextFilePath;
      if (JSON.stringify(row.variants ?? null) !== JSON.stringify(nextVariants)) patch.variants = nextVariants;
      if (Object.keys(patch).length === 0) continue;

      const { error: updateError } = await client.from("media").update(patch).eq("id", row.id);
      if (updateError) {
        throw new Error(`Failed to update media URLs: ${updateError.message}`);
      }
      updatedRows += 1;
    }

    if (data.length < pageSize) break;
  }

  const jsonTargets = [
    { table: "blocks", idColumn: "id", columns: ["content"] },
    { table: "content_drafts", idColumn: "id", columns: ["blocks", "meta"] },
    { table: "product_drafts", idColumn: "id", columns: ["blocks", "meta"] },
    { table: "products", idColumn: "id", columns: ["description_json", "metadata"] },
    { table: "page_revisions", idColumn: "id", columns: ["content"] },
    { table: "post_revisions", idColumn: "id", columns: ["content"] },
    { table: "site_settings", idColumn: "key", columns: ["value"] },
    { table: "translations", idColumn: "key", columns: ["translations"] },
  ];

  for (const target of jsonTargets) {
    try {
      updatedRows += await updateJsonColumns({
        supabase,
        ...target,
        sourceBaseUrl,
        destinationBaseUrl,
      });
    } catch (error) {
      params.warnings.push(error instanceof Error ? error.message : `Failed to rewrite ${target.table}.`);
    }
  }

  return updatedRows;
}

export async function restoreFullBackupArchive(params: {
  archive: Uint8Array;
  confirmation: string;
  mediaUrlMode: FullBackupMediaUrlMode;
  destinationBaseUrl?: string | null;
  deleteExtraneousR2Objects?: boolean;
}): Promise<FullBackupRestoreSummary> {
  await requireAdminUser();
  if (!isValidFullBackupConfirmation(params.confirmation)) {
    return {
      success: false,
      error: `Type ${FULL_BACKUP_CONFIRMATION} to confirm full restore.`,
      warnings: [],
    };
  }

  const inspection = inspectFullBackupArchive(params.archive);
  const warnings = [...inspection.warnings];
  if (inspection.missingStorageObjects.length > 0) {
    return {
      success: false,
      error: "The full backup ZIP is missing one or more R2 objects listed in the manifest.",
      exportedAt: inspection.manifest.exported_at,
      sourceBucket: inspection.manifest.storage.bucket,
      sourceBaseUrl: inspection.manifest.storage.source_base_url,
      databaseDumpBytes: inspection.databaseDumpBytes,
      contentBundleBytes: inspection.contentBundleBytes,
      storageObjects: inspection.manifest.storage.objects.length,
      missingStorageObjects: inspection.missingStorageObjects.length,
      warnings,
    };
  }

  const { client, bucket } = await requireR2Client();
  const uploaded = await uploadR2Objects({
    client,
    bucket,
    files: inspection.files,
    objects: inspection.manifest.storage.objects,
  });
  const deleted = params.deleteExtraneousR2Objects
    ? await deleteExtraneousR2Objects({
        client,
        bucket,
        keepKeys: new Set(inspection.manifest.storage.objects.map((object) => object.key)),
      })
    : 0;

  const tempDir = await mkdtemp(path.join(tmpdir(), "nextblock-full-restore-"));
  try {
    const dumpFile = path.join(tempDir, "dump.sql");
    await writeFile(dumpFile, inspection.files[FULL_BACKUP_DATABASE_PATH]);
    await restoreDatabaseDump(dumpFile);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  const mediaUrlRowsUpdated =
    params.mediaUrlMode === "rewrite_to_destination"
      ? await rewriteMediaBaseUrls({
          sourceBaseUrl: inspection.manifest.storage.source_base_url || "",
          destinationBaseUrl: params.destinationBaseUrl || process.env.NEXT_PUBLIC_R2_BASE_URL || "",
          warnings,
        })
      : 0;

  return {
    success: true,
    exportedAt: inspection.manifest.exported_at,
    sourceBucket: inspection.manifest.storage.bucket,
    sourceBaseUrl: inspection.manifest.storage.source_base_url,
    databaseDumpBytes: inspection.databaseDumpBytes,
    contentBundleBytes: inspection.contentBundleBytes,
    storageObjects: inspection.manifest.storage.objects.length,
    missingStorageObjects: inspection.missingStorageObjects.length,
    warnings,
    databaseRestored: true,
    storageObjectsUploaded: uploaded,
    storageObjectsDeleted: deleted,
    mediaUrlRewriteMode: params.mediaUrlMode,
    mediaUrlRowsUpdated,
  };
}
