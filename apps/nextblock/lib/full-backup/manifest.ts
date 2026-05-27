import type { Json } from "@nextblock-cms/db";

export const FULL_BACKUP_ARCHIVE_TYPE = "nextblock-full-site-backup";
export const FULL_BACKUP_VERSION = 1;
export const FULL_BACKUP_CONFIRMATION = "RESTORE FULL BACKUP";
export const FULL_BACKUP_MANIFEST_PATH = "manifest.json";
export const FULL_BACKUP_DATABASE_PATH = "database/dump.sql";
export const FULL_BACKUP_CONTENT_PATH = "content/nextblock-content-backup.json";
export const FULL_BACKUP_STORAGE_PREFIX = "storage/objects/";

export type FullBackupMediaUrlMode = "rewrite_to_destination" | "keep_exact_urls";

export interface FullBackupStorageObjectManifest {
  key: string;
  archive_path: string;
  size: number | null;
  etag: string | null;
  content_type: string | null;
  last_modified: string | null;
}

export interface FullBackupManifestV1 {
  type: typeof FULL_BACKUP_ARCHIVE_TYPE;
  version: typeof FULL_BACKUP_VERSION;
  exported_at: string;
  app: {
    name: string;
    version: string | null;
  };
  database: {
    path: typeof FULL_BACKUP_DATABASE_PATH;
    created_with: "pg_dump";
  };
  content: {
    path: typeof FULL_BACKUP_CONTENT_PATH;
    type: "nextblock-content-backup-v1";
  };
  storage: {
    bucket: string | null;
    source_base_url: string | null;
    public_url: string | null;
    objects: FullBackupStorageObjectManifest[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeMediaBaseUrl(value?: string | null) {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : "";
}

export function encodeObjectKeyForArchive(objectKey: string) {
  const normalized = objectKey.trim().replace(/^\/+/, "");
  if (!normalized) {
    throw new Error("R2 object key is required.");
  }
  if (normalized.includes("\0")) {
    throw new Error("R2 object key contains an invalid null byte.");
  }

  return Buffer.from(normalized, "utf8").toString("base64url");
}

export function decodeObjectKeyFromArchive(encoded: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error("Archive object path is not a valid encoded object key.");
  }

  const decoded = Buffer.from(encoded, "base64url").toString("utf8");
  if (!decoded || decoded.includes("\0") || decoded.startsWith("/") || decoded.includes("..")) {
    throw new Error("Archive object path decodes to an unsafe object key.");
  }

  return decoded;
}

export function archivePathForObjectKey(objectKey: string) {
  return `${FULL_BACKUP_STORAGE_PREFIX}${encodeObjectKeyForArchive(objectKey)}`;
}

export function objectKeyFromArchivePath(archivePath: string) {
  if (!archivePath.startsWith(FULL_BACKUP_STORAGE_PREFIX)) {
    throw new Error("Archive object path must be inside storage/objects.");
  }

  const encoded = archivePath.slice(FULL_BACKUP_STORAGE_PREFIX.length);
  if (!encoded || encoded.includes("/")) {
    throw new Error("Archive object path has an invalid encoded object key.");
  }

  return decodeObjectKeyFromArchive(encoded);
}

export function isValidFullBackupConfirmation(value: string) {
  return value.trim() === FULL_BACKUP_CONFIRMATION;
}

export function parseFullBackupManifest(content: string): FullBackupManifestV1 {
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Full backup manifest must be a JSON object.");
  }
  if (parsed.type !== FULL_BACKUP_ARCHIVE_TYPE || parsed.version !== FULL_BACKUP_VERSION) {
    throw new Error("Backup archive must be a NextBlock full site backup version 1.");
  }
  if (!isRecord(parsed.database) || parsed.database.path !== FULL_BACKUP_DATABASE_PATH) {
    throw new Error("Backup archive is missing its database dump entry.");
  }
  if (!isRecord(parsed.content) || parsed.content.path !== FULL_BACKUP_CONTENT_PATH) {
    throw new Error("Backup archive is missing its content bundle entry.");
  }
  if (!isRecord(parsed.storage) || !Array.isArray(parsed.storage.objects)) {
    throw new Error("Backup archive is missing its storage manifest.");
  }

  const objects = parsed.storage.objects.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Storage manifest entry ${index + 1} must be an object.`);
    }
    const key = typeof item.key === "string" ? item.key : "";
    const archivePath = typeof item.archive_path === "string" ? item.archive_path : "";
    if (!key || !archivePath) {
      throw new Error(`Storage manifest entry ${index + 1} is missing its key or archive path.`);
    }
    if (objectKeyFromArchivePath(archivePath) !== key.replace(/^\/+/, "")) {
      throw new Error(`Storage manifest entry ${index + 1} has a mismatched archive path.`);
    }

    return {
      key: key.replace(/^\/+/, ""),
      archive_path: archivePath,
      size: typeof item.size === "number" ? item.size : null,
      etag: typeof item.etag === "string" ? item.etag : null,
      content_type: typeof item.content_type === "string" ? item.content_type : null,
      last_modified: typeof item.last_modified === "string" ? item.last_modified : null,
    };
  });

  return {
    type: FULL_BACKUP_ARCHIVE_TYPE,
    version: FULL_BACKUP_VERSION,
    exported_at: typeof parsed.exported_at === "string" ? parsed.exported_at : "",
    app: {
      name: isRecord(parsed.app) && typeof parsed.app.name === "string" ? parsed.app.name : "nextblock",
      version: isRecord(parsed.app) && typeof parsed.app.version === "string" ? parsed.app.version : null,
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
      bucket: typeof parsed.storage.bucket === "string" ? parsed.storage.bucket : null,
      source_base_url:
        typeof parsed.storage.source_base_url === "string" ? parsed.storage.source_base_url : null,
      public_url: typeof parsed.storage.public_url === "string" ? parsed.storage.public_url : null,
      objects,
    },
  };
}

export function replaceMediaBaseUrlInString(value: string, sourceBaseUrl: string, destinationBaseUrl: string) {
  const source = normalizeMediaBaseUrl(sourceBaseUrl);
  const destination = normalizeMediaBaseUrl(destinationBaseUrl);
  if (!source || !destination || source === destination || !value.includes(source)) {
    return value;
  }

  return value.split(source).join(destination);
}

export function replaceMediaBaseUrlInJson(
  value: Json | null,
  sourceBaseUrl: string,
  destinationBaseUrl: string
): Json | null {
  if (value === null) return null;

  if (typeof value === "string") {
    return replaceMediaBaseUrlInString(value, sourceBaseUrl, destinationBaseUrl);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceMediaBaseUrlInJson(item as Json, sourceBaseUrl, destinationBaseUrl)) as Json;
  }

  if (isRecord(value)) {
    const rewritten: Record<string, Json | null> = {};
    for (const [key, item] of Object.entries(value)) {
      rewritten[key] = replaceMediaBaseUrlInJson(item as Json, sourceBaseUrl, destinationBaseUrl);
    }
    return rewritten as Json;
  }

  return value;
}
