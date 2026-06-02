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
