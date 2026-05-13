"use server";
import { createClient } from "./supabase/server";
import { revalidatePath } from "next/cache";
import { encodedRedirect } from "@nextblock-cms/utils/server";
export async function recordMediaUpload(payload, returnJustData) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        if (returnJustData)
            return { error: "User not authenticated for media record." };
        return encodedRedirect("error", "/cms/media", "User not authenticated for media record.");
    }
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
        if (returnJustData)
            return { error: "Forbidden: Insufficient permissions to record media." };
        return encodedRedirect("error", "/cms/media", "Forbidden: Insufficient permissions to record media.");
    }
    // Determine the primary variant
    let primaryVariant = payload.r2Variants.find(v => v.variantLabel === 'original_avif') ||
        payload.r2Variants.find(v => v.variantLabel === 'xlarge_avif') ||
        payload.r2Variants[0] ||
        payload.originalImageDetails;
    if (!primaryVariant) {
        primaryVariant = payload.originalImageDetails || {
            objectKey: payload.r2OriginalKey,
            url: ``,
            width: 0,
            height: 0,
            fileType: 'application/octet-stream',
            sizeBytes: 0,
            variantLabel: 'fallback_original'
        };
    }
    const allVariantsToStore = [
        ...(payload.originalImageDetails && payload.originalImageDetails.objectKey !== primaryVariant.objectKey ? [payload.originalImageDetails] : []),
        ...payload.r2Variants,
    ].filter((variant, index, self) => index === self.findIndex((v) => v.objectKey === variant.objectKey));
    const deriveAltFromFilename = (name) => {
        const lastDot = name.lastIndexOf('.');
        const base = lastDot > 0 ? name.substring(0, lastDot) : name;
        const spaced = base.replace(/[-+_\\]+/g, ' ').replace(/\s+/g, ' ').trim();
        return spaced.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
    };
    const computedDescription = payload.description
        ?? ((primaryVariant.fileType?.startsWith('image/') || payload.originalImageDetails?.fileType?.startsWith('image/'))
            ? deriveAltFromFilename(payload.fileName)
            : null);
    const mediaData = {
        uploader_id: user.id,
        file_name: payload.fileName,
        object_key: primaryVariant.objectKey,
        file_path: primaryVariant.objectKey,
        folder: (() => {
            const match = primaryVariant.objectKey.match(/^(.*\/)?.*$/);
            const path = match && match[1] ? match[1] : null;
            return path;
        })(),
        file_type: primaryVariant.fileType,
        size_bytes: primaryVariant.sizeBytes,
        description: computedDescription,
        width: primaryVariant.width,
        height: primaryVariant.height,
        variants: allVariantsToStore,
        blur_data_url: payload.blurDataUrl || null,
    };
    const { data: newMedia, error } = await supabase
        .from("media")
        .insert(mediaData)
        .select()
        .single();
    if (error) {
        console.error("Error recording media upload:", error);
        if (returnJustData)
            return { error: `Failed to record media: ${error.message}` };
        return encodedRedirect("error", "/cms/media", `Failed to record media: ${error.message}`);
    }
    revalidatePath("/cms/media");
    if (returnJustData) {
        return { success: true, data: newMedia };
    }
    else {
        encodedRedirect("success", "/cms/media", "Media recorded successfully.");
    }
}
//# sourceMappingURL=media-actions.js.map