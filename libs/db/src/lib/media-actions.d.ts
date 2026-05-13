import type { Database } from "./supabase/types";
type Media = Database['public']['Tables']['media']['Row'];
export interface ImageVariant {
    objectKey: string;
    url: string;
    width: number;
    height: number;
    fileType: string;
    sizeBytes: number;
    variantLabel: string;
}
export declare function recordMediaUpload(payload: {
    fileName: string;
    description?: string;
    r2OriginalKey: string;
    r2Variants: ImageVariant[];
    originalImageDetails: ImageVariant;
    blurDataUrl?: string;
}, returnJustData?: boolean): Promise<{
    success: true;
    data: Media;
} | {
    error: string;
} | void>;
export {};
