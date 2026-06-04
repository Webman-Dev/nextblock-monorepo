"use server";

import { createClient } from "@nextblock-cms/db/server";
import { revalidatePath } from "next/cache";

import {
  applyPromotionsImport,
  dryRunPromotionsImport,
  exportPromotionsCsv,
  getPromotionsTemplateCsv,
  type PromotionImportSummary,
  type PromotionKind,
  type PromotionTransferResult,
} from "../../../lib/promotions/server";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function kindLabel(kind: PromotionKind) {
  return kind === "sale" ? "promotions" : "price-changes";
}

export async function getPromotionsTemplateAction(
  kind: PromotionKind
): Promise<PromotionTransferResult> {
  try {
    await assertAdmin();
    return {
      success: true,
      fileName: `nextblock-${kindLabel(kind)}-import-template.csv`,
      mimeType: "text/csv",
      content: getPromotionsTemplateCsv(kind),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to build template.",
    };
  }
}

export async function exportPromotionsAction(
  kind: PromotionKind
): Promise<PromotionTransferResult> {
  try {
    await assertAdmin();
    return {
      success: true,
      fileName: `nextblock-${kindLabel(kind)}-${dateStamp()}.csv`,
      mimeType: "text/csv",
      content: await exportPromotionsCsv(kind),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export CSV.",
    };
  }
}

export async function dryRunPromotionsImportAction(params: {
  kind: PromotionKind;
  content: string;
}): Promise<{ success: boolean; summary?: PromotionImportSummary; error?: string }> {
  try {
    await assertAdmin();
    const summary = await dryRunPromotionsImport(params.kind, params.content);
    return { success: true, summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate import.",
    };
  }
}

export async function applyPromotionsImportAction(params: {
  kind: PromotionKind;
  content: string;
}): Promise<{ success: boolean; summary?: PromotionImportSummary; error?: string }> {
  try {
    await assertAdmin();
    const summary = await applyPromotionsImport(params.kind, params.content);
    revalidatePath("/cms/promotions");
    revalidatePath("/cms/products");
    return { success: true, summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply import.",
    };
  }
}
