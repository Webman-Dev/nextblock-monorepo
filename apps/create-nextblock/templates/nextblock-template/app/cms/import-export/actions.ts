"use server";

import {
  applyBundleImport,
  applyCsvImport,
  buildCsvTemplate,
  dryRunBundleImport,
  dryRunCsvImport,
  exportBackupBundle,
  exportCsv,
} from "../../../lib/cms-transfer/server";
import type {
  CmsContentType,
  CmsImportApplyMode,
  CmsImportConflictMode,
  CmsTransferActionResult,
} from "../../../lib/cms-transfer/types";

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function contentLabel(contentType: CmsContentType) {
  return contentType === "pages" ? "pages" : contentType === "posts" ? "posts" : "products";
}

export async function getCmsCsvTemplateAction(
  contentType: CmsContentType
): Promise<CmsTransferActionResult> {
  try {
    return {
      success: true,
      fileName: `nextblock-${contentLabel(contentType)}-import-template.csv`,
      mimeType: "text/csv",
      content: buildCsvTemplate(contentType),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to build template.",
    };
  }
}

export async function exportCmsCsvAction(params: {
  contentType: CmsContentType;
  languageId?: number;
}): Promise<CmsTransferActionResult> {
  try {
    return {
      success: true,
      fileName: `nextblock-${contentLabel(params.contentType)}-${dateStamp()}.csv`,
      mimeType: "text/csv",
      content: await exportCsv(params),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export CSV.",
    };
  }
}

export async function dryRunCmsCsvImportAction(params: {
  contentType: CmsContentType;
  csv: string;
  conflictMode: CmsImportConflictMode;
  applyMode: CmsImportApplyMode;
  ignoreBlankFields?: boolean;
}) {
  try {
    return await dryRunCsvImport({
      contentType: params.contentType,
      csv: params.csv,
      options: {
        conflictMode: params.conflictMode,
        applyMode: params.applyMode,
        ignoreBlankFields: params.ignoreBlankFields,
      },
    });
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      preview: [],
      warnings: [],
      errors: [
        {
          row: 0,
          type: "error" as const,
          message: error instanceof Error ? error.message : "Failed to dry-run import.",
        },
      ],
    };
  }
}

export async function applyCmsCsvImportAction(params: {
  contentType: CmsContentType;
  csv: string;
  conflictMode: CmsImportConflictMode;
  applyMode: CmsImportApplyMode;
  ignoreBlankFields?: boolean;
}) {
  try {
    return await applyCsvImport({
      contentType: params.contentType,
      csv: params.csv,
      options: {
        conflictMode: params.conflictMode,
        applyMode: params.applyMode,
        ignoreBlankFields: params.ignoreBlankFields,
      },
    });
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      preview: [],
      warnings: [],
      errors: [
        {
          row: 0,
          type: "error" as const,
          message: error instanceof Error ? error.message : "Failed to apply import.",
        },
      ],
    };
  }
}

export async function exportCmsBackupBundleAction(): Promise<CmsTransferActionResult> {
  try {
    return {
      success: true,
      fileName: `nextblock-content-backup-${dateStamp()}.json`,
      mimeType: "application/json",
      content: await exportBackupBundle(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export backup bundle.",
    };
  }
}

export async function dryRunCmsBackupBundleImportAction(params: {
  bundleJson: string;
  contentTypes: CmsContentType[];
  conflictMode: CmsImportConflictMode;
  applyMode: CmsImportApplyMode;
  includeBlocks?: boolean;
}) {
  try {
    return await dryRunBundleImport({
      bundleJson: params.bundleJson,
      contentTypes: params.contentTypes,
      includeBlocks: params.includeBlocks,
      options: {
        conflictMode: params.conflictMode,
        applyMode: params.applyMode,
      },
    });
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      preview: [],
      warnings: [],
      errors: [
        {
          row: 0,
          type: "error" as const,
          message: error instanceof Error ? error.message : "Failed to dry-run backup import.",
        },
      ],
    };
  }
}

export async function applyCmsBackupBundleImportAction(params: {
  bundleJson: string;
  contentTypes: CmsContentType[];
  conflictMode: CmsImportConflictMode;
  applyMode: CmsImportApplyMode;
  includeBlocks?: boolean;
}) {
  try {
    return await applyBundleImport({
      bundleJson: params.bundleJson,
      contentTypes: params.contentTypes,
      includeBlocks: params.includeBlocks,
      options: {
        conflictMode: params.conflictMode,
        applyMode: params.applyMode,
      },
    });
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      preview: [],
      warnings: [],
      errors: [
        {
          row: 0,
          type: "error" as const,
          message: error instanceof Error ? error.message : "Failed to apply backup import.",
        },
      ],
    };
  }
}
