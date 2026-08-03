export const availableBlockTypes = [
  "text",
  "heading",
  "image",
  "button",
  "posts_grid",
  "video_embed",
  "section",
  "form",
  "testimonial",
  "product_grid",
  "featured_product",
  "cart",
  "checkout",
  "product_details",
] as const;

export type BlockType = (typeof availableBlockTypes)[number];

/**
 * Block types provided by the premium `ecommerce` package. They are hidden from
 * the block picker when the package is not activated — see
 * `app/cms/blocks/components/BlockTypeSelector.tsx`.
 */
export const ecommerceBlockTypes = [
  "product_grid",
  "featured_product",
  "cart",
  "checkout",
  "product_details",
] as const satisfies readonly BlockType[];

export type EcommerceBlockType = (typeof ecommerceBlockTypes)[number];

export function isEcommerceBlockType(type: string): type is EcommerceBlockType {
  return (ecommerceBlockTypes as readonly string[]).includes(type);
}
