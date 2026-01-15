import { z } from 'zod';
export declare const productSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    sku: z.ZodString;
    price: z.ZodNumber;
    sale_price: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    stock: z.ZodNumber;
    short_description: z.ZodOptional<z.ZodString>;
    description_json: z.ZodOptional<z.ZodAny>;
    media_id: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    sku: string;
    price: number;
    stock: number;
    status: "draft" | "active" | "archived";
    sale_price?: number | null | undefined;
    short_description?: string | undefined;
    description_json?: any;
    media_id?: string | undefined;
}, {
    title: string;
    slug: string;
    sku: string;
    price: number;
    stock: number;
    sale_price?: number | null | undefined;
    short_description?: string | undefined;
    description_json?: any;
    media_id?: string | undefined;
    status?: "draft" | "active" | "archived" | undefined;
}>;
export type ProductFormValues = z.infer<typeof productSchema>;
