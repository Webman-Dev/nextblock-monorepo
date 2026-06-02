import type { ComponentType } from "react";
import type { BlockType } from "../../lib/blocks/blockRegistry";

type PublicBlockRendererLoader = () => Promise<{
  default: ComponentType<any>;
}>;

const publicBlockRendererLoaders: Partial<
  Record<BlockType | "hero", PublicBlockRendererLoader>
> = {
  text: () => import("./renderers/TextBlockRenderer"),
  heading: () => import("./renderers/HeadingBlockRenderer"),
  image: () => import("./renderers/ImageBlockRenderer"),
  button: () => import("./renderers/ButtonBlockRenderer"),
  posts_grid: () => import("./renderers/PostsGridBlockRenderer"),
  video_embed: () => import("./renderers/VideoEmbedBlockRenderer"),
  section: () => import("./renderers/SectionBlockRenderer"),
  hero: () => import("./renderers/SectionBlockRenderer"),
  form: () => import("./renderers/FormBlockRenderer"),
  testimonial: () => import("./renderers/TestimonialBlockRenderer"),
};

export function getPublicBlockRendererLoader(blockType: string) {
  return publicBlockRendererLoaders[blockType as BlockType | "hero"];
}
