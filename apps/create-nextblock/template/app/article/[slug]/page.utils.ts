// app/article/[slug]/page.utils.ts
import { createClient } from "@nextblock-cms/db/server";
import type { Database } from "@nextblock-cms/db";

type PostType = Database['public']['Tables']['posts']['Row'];
type BlockType = Database['public']['Tables']['blocks']['Row'];

// Define a more specific type for the content of an Image Block
export type ImageBlockContent = {
  media_id: string | null;
  object_key?: string; // Optional because it's added later
  blur_data_url?: string | null;
};

interface SectionOrHeroBlockContent {
  [key: string]: unknown;
  background?: {
    type?: 'image' | 'color';
    image?: {
      media_id?: string;
      object_key?: string;
      blur_data_url?: string;
    };
  };
}
// Includes logic to fetch object_key for image blocks.
const buildMediaUrl = (objectKey?: string | null) => {
  if (!objectKey) return null;
  if (objectKey.startsWith('/')) return objectKey;
  const base = process.env.NEXT_PUBLIC_R2_BASE_URL || '';
  return base ? `${base}/${objectKey}` : objectKey;
};

export async function getPostDataBySlug(slug: string): Promise<(PostType & { blocks: BlockType[]; language_code: string; language_id: number; translation_group_id: string; feature_image_url?: string | null; feature_image_blur_data_url?: string | null; }) | null> {
  const supabase = createClient();

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(`
      *,
      languages!inner (id, code),
      blocks (*),
      media ( object_key, blur_data_url )
    `)
    .eq("slug", slug) // Find the post by its unique slug for this language
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`) // Check published_at
    .order('order', { foreignTable: 'blocks', ascending: true })
    .maybeSingle();

  if (postError || !postData) {
    if(postError) console.error(`Error fetching post data for slug '${slug}':`, postError);
    return null;
  }

  // Ensure language information is correctly extracted
  const langInfo = postData.languages as unknown as { id: number; code: string };
  if (!langInfo || !langInfo.id || !langInfo.code) {
      console.error(`Language information missing or incomplete for post slug '${slug}'. DB response:`, postData.languages);
      if (!postData.language_id) return null; 
      const {data: fallbackLang} = await supabase.from("languages").select("code").eq("id", postData.language_id).single();
      if (!fallbackLang) return null;
      Object.assign(langInfo, {id: postData.language_id, code: fallbackLang.code });
  }
  
  if (!postData.translation_group_id) {
      console.error(`Post with slug '${slug}' is missing a translation_group_id.`);
      return null;
  }

  let blocksWithMediaData: BlockType[] = postData.blocks || [];
  if (blocksWithMediaData.length > 0) {
    const mediaIds = blocksWithMediaData
      .map(block => {
        if (block.block_type === 'image') {
          return (block.content as ImageBlockContent)?.media_id;
        }
        if (block.block_type === 'section' || block.block_type === 'hero') {
          const content = block.content as SectionOrHeroBlockContent;
          if (content.background?.type === 'image' && content.background?.image?.media_id) {
            return content.background.image.media_id;
          }
        }
        return null;
      })
      .filter((id): id is string => id !== null && typeof id === 'string');

    if (mediaIds.length > 0) {
      const { data: mediaItems, error: mediaError } = await supabase
        .from('media')
        .select('id, object_key, blur_data_url')
        .in('id', mediaIds);

      if (mediaError) {
        console.error("SSG (Posts): Error fetching media items for blocks:", mediaError);
      } else if (mediaItems) {
        const mediaMap = new Map(mediaItems.map(m => [m.id, { object_key: m.object_key, blur_data_url: m.blur_data_url }]));
        blocksWithMediaData = blocksWithMediaData.map(block => {
          if (block.block_type === 'image') {
            const content = block.content as ImageBlockContent;
            if (content.media_id) {
              const mediaData = mediaMap.get(content.media_id);
              if (mediaData) {
                return { ...block, content: { ...content, object_key: mediaData.object_key, blur_data_url: mediaData.blur_data_url } };
              }
            }
          }
          if (block.block_type === 'section' || block.block_type === 'hero') {
            const content = block.content as SectionOrHeroBlockContent;
            if (content.background?.type === 'image' && content.background?.image?.media_id) {
              const mediaData = mediaMap.get(content.background.image.media_id);
              if (mediaData) {
                const newContent = {
                  ...content,
                  background: {
                    ...content.background,
                    image: {
                      ...content.background.image,
                      object_key: mediaData.object_key,
                      blur_data_url: mediaData.blur_data_url,
                    },
                  },
                };
                return { ...block, content: newContent };
              }
            }
          }
          return block;
        });
      }
    }
  }

  return {
    ...postData,
    blocks: blocksWithMediaData,
    language_code: langInfo.code,
    language_id: langInfo.id,
    translation_group_id: postData.translation_group_id,
    feature_image_url: buildMediaUrl(postData.media?.object_key),
    feature_image_blur_data_url: postData.media?.blur_data_url,
  } as (PostType & { blocks: BlockType[]; language_code: string; language_id: number; translation_group_id: string; feature_image_url?: string | null; feature_image_blur_data_url?: string | null; });
}
