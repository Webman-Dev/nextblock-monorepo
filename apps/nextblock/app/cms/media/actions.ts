// app/cms/media/actions.ts
"use server";

import { createClient } from "@nextblock-monorepo/db/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@nextblock-monorepo/db";
import { encodedRedirect } from "@nextblock-monorepo/utils"; // Ensure this is correctly imported

type Media = Database['public']['Tables']['media']['Row'];

// --- recordMediaUpload and updateMediaItem functions to be updated similarly ---

// Define the structure for a single variant, mirroring what /api/process-image returns
interface ImageVariant {
  objectKey: string;
  url: string;
  width: number;
  height: number;
  fileType: string;
  sizeBytes: number;
  variantLabel: string;
}

export async function recordMediaUpload(payload: {
  fileName: string; // Original filename, can still be useful
  // objectKey: string; // This might now be derived from the primary variant
  // fileType: string; // This will come from the primary variant
  // sizeBytes: number; // This will come from the primary variant
  description?: string;
  // width?: number; // This will come from the primary variant
  // height?: number; // This will come from the primary variant
  r2OriginalKey: string; // Key of the initially uploaded file in R2
  r2Variants: ImageVariant[]; // Array of processed variants
  originalImageDetails: ImageVariant; // Details of the original uploaded image from process-image
  blurDataUrl?: string; // Optional, if generated and passed from client
}, returnJustData?: boolean): Promise<{ success: true; data: Media } | { error: string } | void>  {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    if (returnJustData) return { error: "User not authenticated for media record." };
    return encodedRedirect("error", "/cms/media", "User not authenticated for media record.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
    if (returnJustData) return { error: "Forbidden: Insufficient permissions to record media." };
    return encodedRedirect("error", "/cms/media", "Forbidden: Insufficient permissions to record media.");
  }

  // Determine the primary variant to use for the main table columns
  // This logic can be adjusted. Prioritize 'original_avif', then 'xlarge_avif', then the first variant.
  let primaryVariant =
    payload.r2Variants.find(v => v.variantLabel === 'original_avif') ||
    payload.r2Variants.find(v => v.variantLabel === 'xlarge_avif') ||
    payload.r2Variants[0] || // Fallback to the first variant if specific ones aren't found
    payload.originalImageDetails; // Fallback to original uploaded details if no variants

  if (!primaryVariant) {
    // This case should ideally not happen if originalImageDetails is always present
    // but as a safeguard:
    primaryVariant = payload.originalImageDetails || {
        objectKey: payload.r2OriginalKey,
        url: `YOUR_R2_PUBLIC_BASE_URL/${payload.r2OriginalKey}`, // Construct URL if needed
        width: 0, // Or fetch if necessary, though client sends initial dimensions
        height: 0,
        fileType: 'application/octet-stream', // A generic fallback
        sizeBytes: 0,
        variantLabel: 'fallback_original'
    };
  }
  
  // Construct the full list of variants to store, including the original uploaded file details
  const allVariantsToStore = [
    ...(payload.originalImageDetails && payload.originalImageDetails.objectKey !== primaryVariant.objectKey ? [payload.originalImageDetails] : []),
    ...payload.r2Variants,
  ].filter((variant, index, self) =>
    index === self.findIndex((v) => v.objectKey === variant.objectKey)
  ); // Ensure unique variants by objectKey

  const mediaData: Omit<Media, 'id' | 'created_at' | 'updated_at'> & { uploader_id: string } = {
    uploader_id: user.id,
    file_name: payload.fileName, // Keep original file name for reference
    object_key: primaryVariant.objectKey, // Key of the primary display version
    file_path: primaryVariant.objectKey,
    // file_url is removed as it's not in the Media type; URLs are in variants
    file_type: primaryVariant.fileType,
    size_bytes: primaryVariant.sizeBytes,
    description: payload.description || null,
    width: primaryVariant.width,
    height: primaryVariant.height,
    variants: allVariantsToStore as any, // Store all variants including the original
    blur_data_url: payload.blurDataUrl || null, // Store if provided
    // Ensure all other required fields for 'Media' type are present or nullable
  };

  const { data: newMedia, error } = await supabase
    .from("media")
    .insert(mediaData)
    .select()
    .single();

  if (error) {
    console.error("Error recording media upload:", error);
    if (returnJustData) return { error: `Failed to record media: ${error.message}` };
    return encodedRedirect("error", "/cms/media", `Failed to record media: ${error.message}`);
  }

  revalidatePath("/cms/media");
  if (returnJustData) {
    return { success: true, data: newMedia as Media };
  } else {
    encodedRedirect("success", "/cms/media", "Media recorded successfully.");
  }
}


export async function updateMediaItem(mediaId: string, payload: { description?: string; file_name?: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const mediaEditPath = `/cms/media/${mediaId}/edit`;

    if (!user) return encodedRedirect("error", mediaEditPath, "User not authenticated for media update.");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
        return encodedRedirect("error", mediaEditPath, "Forbidden to update media.");
    }

    const updateData: Partial<Pick<Media, 'description' | 'file_name' | 'updated_at'>> = {};
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.file_name !== undefined) updateData.file_name = payload.file_name;

    if (Object.keys(updateData).length === 0) {
        return encodedRedirect("error", mediaEditPath, "No updatable fields provided for media.");
    }
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from("media")
        .update(updateData)
        .eq("id", mediaId)
        .select()
        .single();

    if (error) {
        console.error("Error updating media item:", error);
        return encodedRedirect("error", mediaEditPath, `Error updating media: ${error.message}`);
    }
    revalidatePath("/cms/media");
    revalidatePath(mediaEditPath);
    encodedRedirect("success", mediaEditPath, "Media item updated successfully.");
}


export async function deleteMediaItem(mediaId: string, objectKey: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return encodedRedirect("error", "/cms/media", "User not authenticated.");
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
        return encodedRedirect("error", "/cms/media", "Forbidden: Insufficient permissions.");
    }

    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const { s3Client } = await import("@nextblock-monorepo/utils/server");
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

    if (!R2_BUCKET_NAME) {
      return encodedRedirect("error", "/cms/media", "R2 Bucket not configured for deletion.");
    }

    try {
        const deleteCommand = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: objectKey,
        });
        await s3Client.send(deleteCommand);
    } catch (r2Error: unknown) {
        console.error("Error deleting from R2:", r2Error);
        // Decide if you want to proceed with DB deletion if R2 deletion fails
        // It's often better to proceed and log, or handle more gracefully.
        // For now, we'll let it proceed to DB deletion but the error is logged.
        // You could redirect with a partial success/warning message here.
    }

    const { error: dbError } = await supabase.from("media").delete().eq("id", mediaId);

    if (dbError) {
        console.error("Error deleting media record from DB:", dbError);
        return encodedRedirect("error", "/cms/media", `Failed to delete media record: ${dbError.message}`);
    }

    revalidatePath("/cms/media");
    encodedRedirect("success", "/cms/media", "Media item deleted successfully.");
}

export async function deleteMultipleMediaItems(items: Array<{ id: string; objectKey: string }>) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "User not authenticated." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
    return { error: "Forbidden: Insufficient permissions." };
  }

  if (!items || items.length === 0) {
    return { error: "No items selected for deletion." };
  }

  const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3"); // Use DeleteObjects for batch
  const { s3Client } = await import("@nextblock-monorepo/utils/server");
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

  if (!R2_BUCKET_NAME) {
    return { error: "R2 Bucket not configured for deletion." };
  }

  const r2ObjectsToDelete = items.map(item => ({ Key: item.objectKey }));
  const itemIdsToDelete = items.map(item => item.id);
  let r2DeletionError = null;
  let dbDeletionError = null;

  // Batch delete from R2
  try {
    if (r2ObjectsToDelete.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: r2ObjectsToDelete },
      });
      const output = await s3Client.send(deleteCommand);
      if (output.Errors && output.Errors.length > 0) {
        console.error("Errors deleting some objects from R2:", output.Errors);
        // Collect specific errors if needed, for now a general message
        r2DeletionError = `Some objects failed to delete from R2: ${output.Errors.map(e => e.Key).join(', ')}`;
      }
    }
  } catch (error: unknown) {
    console.error("Error batch deleting from R2:", error);
    r2DeletionError = `Failed to delete objects from R2: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Batch delete from Supabase
  try {
    if (itemIdsToDelete.length > 0) {
      const { error } = await supabase.from("media").delete().in("id", itemIdsToDelete);
      if (error) {
        throw error;
      }
    }
  } catch (error: unknown) {
    console.error("Error batch deleting media records from DB:", error);
    dbDeletionError = `Failed to delete media records from DB: ${error instanceof Error ? error.message : String(error)}`;
  }

  if (r2DeletionError || dbDeletionError) {
    // Construct a combined error message
    const errors = [r2DeletionError, dbDeletionError].filter(Boolean).join(" | ");
    // No redirect here, return error object for client-side handling
    return { error: `Deletion process encountered issues: ${errors}` };
  }

  revalidatePath("/cms/media");
  // No redirect here, return success object for client-side handling
  return { success: "Selected media items deleted successfully." };
}


// Type for inserting media

export async function getMediaItems(
    page = 1,
    limit = 50 // Default to 50 items per page
  ): Promise<{ data?: Media[]; error?: string; hasMore?: boolean }> {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "User not authenticated." };
    }

    // Optional: Check user role if only certain roles can view all media
    // const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    // if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
    //     return { error: "Forbidden: Insufficient permissions." };
    // }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
        .from("media")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching media items:", error);
        return { error: `Failed to fetch media items: ${error.message}` };
    }

    const hasMore = count ? to < count -1 : false;

    return { data: data as Media[], hasMore };
}