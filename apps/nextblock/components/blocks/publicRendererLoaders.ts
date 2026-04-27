import type { ComponentType } from "react";
import type { BlockType } from "../../lib/blocks/blockRegistry";

type PublicBlockRendererLoader = () => Promise<{
  default: ComponentType<any>;
}>;

const publicBlockRendererLoaders: Partial<
  Record<BlockType, PublicBlockRendererLoader>
> = {
  text: () => import("./renderers/TextBlockRenderer"),
  heading: () => import("./renderers/HeadingBlockRenderer"),
  image: () => import("./renderers/ImageBlockRenderer"),
  button: () => import("./renderers/ButtonBlockRenderer"),
  posts_grid: () => import("./renderers/PostsGridBlockRenderer"),
  video_embed: () => import("./renderers/VideoEmbedBlockRenderer"),
  section: () => import("./renderers/SectionBlockRenderer"),
  hero: () => import("./renderers/HeroBlockRenderer"),
  form: () => import("./renderers/FormBlockRenderer"),
  testimonial: () => import("./renderers/TestimonialBlockRenderer"),
  product_grid: () => import("./renderers/ProductGridBlockRenderer"),
  featured_product: () => import("./renderers/FeaturedProductBlockRenderer"),
  cart: () => import("./renderers/CartBlockRenderer"),
  checkout: () => import("./renderers/CheckoutBlockRenderer"),
  product_details: () => import("./renderers/ProductDetailsBlockRenderer"),
};

export function getPublicBlockRendererLoader(blockType: string) {
  return publicBlockRendererLoaders[blockType as BlockType];
}
