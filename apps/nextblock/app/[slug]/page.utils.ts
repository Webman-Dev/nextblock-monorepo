// app/[slug]/page.utils.ts
import { getSsgSupabaseClient } from "@nextblock-cms/db/server";
import type { Database } from "@nextblock-cms/db";

type PageType = Database['public']['Tables']['pages']['Row'];
type BlockType = Database['public']['Tables']['blocks']['Row'];

// Define a more specific type for the content of an Image Block
export type ImageBlockContent = {
  media_id: string | null;
  object_key?: string; // Optional because it's added later
  blur_data_url?: string | null; // Optional because it's added later
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

// Interface to represent a page object after the initial database query and selection
interface SelectedPageType extends PageType { // Assumes PageType includes fields like id, slug, status, language_id, translation_group_id
  language_details: { id: number; code: string } | null; // From the join; kept nullable due to original code's caution
  blocks: BlockType[];
}

export async function getPageDataBySlug(slug: string): Promise<(PageType & { blocks: BlockType[]; language_code: string; language_id: number; translation_group_id: string | null; }) | null> {
  const supabase = getSsgSupabaseClient();

  // Optimized query with specific field selection instead of *
  const { data: candidatePagesData, error: pageError } = await supabase
    .from("pages")
    .select(`
      id, slug, title, meta_title, meta_description, status, language_id, translation_group_id, author_id, created_at, updated_at,
      language_details:languages!inner(id, code),
      blocks (id, page_id, block_type, content, order)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .order('order', { foreignTable: 'blocks', ascending: true });

  if (pageError) {
    return null;
  }

  const candidatePages: SelectedPageType[] = (candidatePagesData || []).map(page => ({
    ...page,
    language_details: Array.isArray(page.language_details) ? page.language_details[0] : page.language_details
  })) as SelectedPageType[];

  if (candidatePages.length === 0) {
    return null;
  }

  let selectedPage: SelectedPageType | null = null;

  if (candidatePages.length === 1) {
    selectedPage = candidatePages[0];
  } else {
    const enPage = candidatePages.find(p => p.language_details && p.language_details.code === 'en');
    if (enPage) {
      selectedPage = enPage;
    } else {
      return null;
    }
  }
  
  if (!selectedPage) {
    return null;
  }
  
  let languageCode: string | undefined = selectedPage.language_details?.code;
  let languageId: number | undefined = selectedPage.language_details?.id;

  // Optimize fallback language query with specific fields
  if (!languageCode || typeof languageId !== 'number') {
    if (typeof selectedPage.language_id === 'number') {
        const { data: fallbackLang, error: langFetchError } = await supabase
            .from("languages")
            .select("id, code")
            .eq("id", selectedPage.language_id)
            .single();

        if (langFetchError) {
            return null;
        }
        
        if (fallbackLang) {
            languageCode = fallbackLang.code;
            languageId = fallbackLang.id;
        } else {
            return null;
        }
    } else {
        return null;
    }
  }

  if (typeof languageCode !== 'string' || typeof languageId !== 'number') {
      return null;
  }

  let blocksWithMediaData: BlockType[] = selectedPage.blocks || [];
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
      // Optimized media query with specific fields only
      const { data: mediaItems, error: mediaError } = await supabase
        .from('media')
        .select('id, object_key, blur_data_url')
        .in('id', mediaIds);

      if (mediaError) {
        console.error('Error fetching media data:', mediaError);
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
  
  const { language_details, blocks, ...basePageData } = selectedPage;

  return {
    ...(basePageData as PageType),
    blocks: blocksWithMediaData,
    language_code: languageCode,
    language_id: languageId,
    translation_group_id: selectedPage.translation_group_id,
  };
}