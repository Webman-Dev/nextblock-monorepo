// app/cms/blocks/actions.ts
"use server";

import { createClient } from "@nextblock-cms/db/server";
import { revalidatePath } from "next/cache";
import type { Database, Json } from "@nextblock-cms/db";
import { getInitialContent, isValidBlockType } from "../../../lib/blocks/blockRegistry";
import { getFullPageContent, getFullPostContent } from "../revisions/utils";
import { createPageRevision, createPostRevision } from "../revisions/service";

type Block = Database['public']['Tables']['blocks']['Row'];
type BlockType = Database['public']['Tables']['blocks']['Row']['block_type'];

// Helper to verify user can edit the parent (page/post)
async function canEditParent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pageId?: number | null,
  postId?: number | null
): Promise<boolean> {
  void pageId;
  void postId;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || !["ADMIN", "WRITER"].includes(profile.role)) {
    return false;
  }
  // Further checks could be added here to see if a WRITER owns the page/post
  return true;
}

interface CreateBlockPayload {
  page_id?: number | null;
  post_id?: number | null;
  language_id: number;
  block_type: BlockType;
  content: object; // Content structure defined by block registry
  order: number;
}

export async function createBlockForPage(pageId: number, languageId: number, blockType: BlockType, order: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated." };
  if (!(await canEditParent(supabase, user.id, pageId, null))) {
    return { error: "Unauthorized to add blocks to this page." };
  }

  // Validate block type using registry
  if (!isValidBlockType(blockType)) {
    return { error: "Unknown block type." };
  }

  // Get initial content from registry
  const initialContent = getInitialContent(blockType);
  if (!initialContent) {
    return { error: "Failed to get initial content for block type." };
  }

  const payload: CreateBlockPayload = {
    page_id: pageId,
    language_id: languageId,
    block_type: blockType,
    content: initialContent,
    order: order,
  };

  // capture previous state for revision (before insert)
  const previousContent = await getFullPageContent(pageId);

  const { data, error } = await supabase.from("blocks").insert(payload).select().single();

  if (error) {
    console.error("Error creating block:", error);
    return { error: `Failed to create block: ${error.message}` };
  }

  // create revision (after successful insert)
  if (previousContent && user) {
    const newContent = await getFullPageContent(pageId);
    if (newContent) {
      await createPageRevision(pageId, user.id, previousContent, newContent);
    }
  }

  revalidatePath(`/cms/pages/${pageId}/edit`);
  return { success: true, newBlock: data as Block };
}

export async function createBlockForPost(postId: number, languageId: number, blockType: BlockType, order: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated." };
  if (!(await canEditParent(supabase, user.id, null, postId))) {
    return { error: "Unauthorized to add blocks to this post." };
  }

  // Validate block type using registry
  if (!isValidBlockType(blockType)) {
    return { error: "Unknown block type." };
  }

  // Get initial content from registry
  const initialContent = getInitialContent(blockType);
  if (!initialContent) {
    return { error: "Failed to get initial content for block type." };
  }

  const payload: CreateBlockPayload = {
    post_id: postId,
    language_id: languageId,
    block_type: blockType,
    content: initialContent,
    order: order,
  };

  // capture previous content
  const previousContent = await getFullPostContent(postId);

  const { data, error } = await supabase.from("blocks").insert(payload).select().single();

  if (error) {
    console.error("Error creating block:", error);
    return { error: `Failed to create block: ${error.message}` };
  }

  if (previousContent && user) {
    const newContent = await getFullPostContent(postId);
    if (newContent) {
      await createPostRevision(postId, user.id, previousContent, newContent);
    }
  }

  revalidatePath(`/cms/posts/${postId}/edit`);
  return { success: true, newBlock: data as Block };
}

export async function updateBlock(blockId: number, newContent: unknown, pageId?: number | null, postId?: number | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated." };
  if (!(await canEditParent(supabase, user.id, pageId, postId))) {
    return { error: "Unauthorized to update this block." };
  }

  // fetch current block to identify parent and previous state
  const { data: existingBlock, error: fetchError } = await supabase
    .from('blocks')
    .select('id, page_id, post_id, content')
    .eq('id', blockId)
    .single();
  if (fetchError || !existingBlock) {
    return { error: "Block not found." };
  }

  let prevContentAggregate: Awaited<ReturnType<typeof getFullPageContent>> | Awaited<ReturnType<typeof getFullPostContent>> | null = null;
  if (existingBlock.page_id) {
    prevContentAggregate = await getFullPageContent(existingBlock.page_id);
  } else if (existingBlock.post_id) {
    prevContentAggregate = await getFullPostContent(existingBlock.post_id);
  }

  const { data, error } = await supabase
    .from("blocks")
    .update({ content: newContent, updated_at: new Date().toISOString() })
    .eq("id", blockId)
    .select()
    .single();

  if (error) {
    console.error("Error updating block:", error);
    return { error: `Failed to update block: ${error.message}` };
  }

  // create revision after successful update
  if (user && prevContentAggregate) {
    if (existingBlock.page_id) {
      const nextContentAggregate = await getFullPageContent(existingBlock.page_id, { overrideBlockId: blockId, overrideBlockContent: newContent });
      if (nextContentAggregate) {
        await createPageRevision(existingBlock.page_id, user.id, prevContentAggregate, nextContentAggregate);
      }
    } else if (existingBlock.post_id) {
      const nextContentAggregate = await getFullPostContent(existingBlock.post_id, { overrideBlockId: blockId, overrideBlockContent: newContent });
      if (nextContentAggregate) {
        await createPostRevision(existingBlock.post_id, user.id, prevContentAggregate as any, nextContentAggregate as any);
      }
    }
  }

  return { success: true, updatedBlock: data as Block };
}

export async function updateMultipleBlockOrders(
    updates: Array<{ id: number; order: number }>,
    pageId?: number | null,
    postId?: number | null
) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "User not authenticated." };
    if (!(await canEditParent(supabase, user.id, pageId, postId))) {
        return { error: "Unauthorized to reorder blocks." };
    }

    // Supabase upsert can be used for batch updates if primary key `id` is included.
    // Or loop through updates (less efficient for many updates but simpler to write without complex SQL).
    const updatePromises = updates.map(update =>
        supabase.from('blocks').update({ order: update.order, updated_at: new Date().toISOString() }).eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter(result => result.error);

    if (errors.length > 0) {
        console.error("Error updating block orders:", errors.map(e => e.error?.message).join(", "));
        return { error: `Failed to update some block orders: ${errors.map(e => e.error?.message).join(", ")}` };
    }

    if (pageId) revalidatePath(`/cms/pages/${pageId}/edit`);
    if (postId) revalidatePath(`/cms/posts/${postId}/edit`);

    return { success: true };
}


export async function deleteBlock(blockId: number, pageId?: number | null, postId?: number | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "User not authenticated." };
  if (!(await canEditParent(supabase, user.id, pageId, postId))) {
    return { error: "Unauthorized to delete this block." };
  }

  // fetch parent and capture previous aggregate
  const { data: existingBlock, error: fetchError } = await supabase
    .from('blocks')
    .select('id, page_id, post_id')
    .eq('id', blockId)
    .single();
  if (fetchError || !existingBlock) {
    return { error: "Block not found." };
  }

  let previousAggregate: Awaited<ReturnType<typeof getFullPageContent>> | Awaited<ReturnType<typeof getFullPostContent>> | null = null;
  if (existingBlock.page_id) {
    previousAggregate = await getFullPageContent(existingBlock.page_id);
  } else if (existingBlock.post_id) {
    previousAggregate = await getFullPostContent(existingBlock.post_id);
  }

  const { error } = await supabase.from("blocks").delete().eq("id", blockId);

  if (error) {
    console.error("Error deleting block:", error);
    return { error: `Failed to delete block: ${error.message}` };
  }

  // create revision after delete
  if (user && previousAggregate) {
    if (existingBlock.page_id) {
      const nextAggregate = await getFullPageContent(existingBlock.page_id, { excludeDeletedBlockId: blockId });
      if (nextAggregate) {
        await createPageRevision(existingBlock.page_id, user.id, previousAggregate, nextAggregate);
      }
    } else if (existingBlock.post_id) {
      const nextAggregate = await getFullPostContent(existingBlock.post_id, { excludeDeletedBlockId: blockId });
      if (nextAggregate) {
        await createPostRevision(existingBlock.post_id, user.id, previousAggregate as any, nextAggregate as any);
      }
    }
  }

  if (pageId) revalidatePath(`/cms/pages/${pageId}/edit`);
  if (postId) revalidatePath(`/cms/posts/${postId}/edit`);

  return { success: true };
}

export async function copyBlocksFromLanguage(
  parentId: number, // ID of the page or post being edited
  parentType: "page" | "post",
  sourceLanguageId: number,
  targetLanguageId: number, // Language of the current page/post being edited
  targetTranslationGroupId: string
) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated." };
  }

  if (!(await canEditParent(supabase, user.id, parentType === "page" ? parentId : null, parentType === "post" ? parentId : null))) {
    return { error: "Unauthorized to modify blocks for this target." };
  }

  let sourceParentId: number | null = null;

  // 1. Fetch Source Page/Post ID
  try {
    if (parentType === "page") {
      const { data: sourcePage, error: sourcePageError } = await supabase
        .from("pages")
        .select("id")
        .eq("translation_group_id", targetTranslationGroupId)
        .eq("language_id", sourceLanguageId)
        .single();

      if (sourcePageError || !sourcePage) {
        console.error("Error fetching source page:", sourcePageError);
        return { error: "Source page not found or error fetching it." };
      }
      sourceParentId = sourcePage.id;
    } else if (parentType === "post") {
      const { data: sourcePost, error: sourcePostError } = await supabase
        .from("posts")
        .select("id")
        .eq("translation_group_id", targetTranslationGroupId)
        .eq("language_id", sourceLanguageId)
        .single();

      if (sourcePostError || !sourcePost) {
        console.error("Error fetching source post:", sourcePostError);
        return { error: "Source post not found or error fetching it." };
      }
      sourceParentId = sourcePost.id;
    } else {
      return { error: "Invalid parent type specified." };
    }

    if (!sourceParentId) {
        return { error: "Could not determine source parent ID." };
    }

    // 2. Fetch Blocks from Source
    const { data: sourceBlocks, error: sourceBlocksError } = await supabase
      .from("blocks")
      .select("page_id, post_id, language_id, block_type, content, order") // Select only existing columns
      .eq(parentType === "page" ? "page_id" : "post_id", sourceParentId)
      .order("order", { ascending: true });

    if (sourceBlocksError) {
      console.error("Error fetching source blocks:", sourceBlocksError);
      return { error: `Failed to fetch blocks from source: ${sourceBlocksError.message}` };
    }

    // 3. Delete Existing Blocks from Target
    const { error: deleteError } = await supabase
      .from("blocks")
      .delete()
      .eq(parentType === "page" ? "page_id" : "post_id", parentId)
      .eq("language_id", targetLanguageId); // Ensure we only delete for the target language

    if (deleteError) {
      console.error("Error deleting existing blocks:", deleteError);
      return { error: `Failed to delete existing blocks: ${deleteError.message}` };
    }

    // 4. Re-create Blocks for Target
    if (sourceBlocks && sourceBlocks.length > 0) {
      const newBlocksToInsert = sourceBlocks.map((block: {
        page_id: number | null;
        post_id: number | null;
        language_id: number;
        block_type: BlockType;
        content: Json;
        order: number;
      }) => ({
        // id, created_at, updated_at will be set by DB
        page_id: parentType === "page" ? parentId : null,
        post_id: parentType === "post" ? parentId : null,
        language_id: targetLanguageId,
        block_type: block.block_type,
        content: block.content, // Directly copy content, which includes any type-specific configs like cols_config
        order: block.order,
      }));

      const { error: insertError } = await supabase.from("blocks").insert(newBlocksToInsert);

      if (insertError) {
        console.error("Error re-creating blocks:", insertError);
        return { error: `Failed to re-create blocks: ${insertError.message}` };
      }
    }

    // 5. Revalidation
    let targetSlug: string | null = null;
    if (parentType === "page") {
        const { data: pageData, error: pageError } = await supabase
            .from("pages")
            .select("slug")
            .eq("id", parentId)
            .single();
        if (pageError || !pageData) {
            console.warn("Could not fetch target page slug for revalidation:", pageError);
        } else {
            targetSlug = pageData.slug;
            if (targetSlug) revalidatePath(`/${targetSlug}`);
        }
        revalidatePath(`/cms/pages/${parentId}/edit`); // Revalidate edit page
    } else if (parentType === "post") {
        const { data: postData, error: postError } = await supabase
            .from("posts")
            .select("slug")
            .eq("id", parentId)
            .single();
        if (postError || !postData) {
            console.warn("Could not fetch target post slug for revalidation:", postError);
        } else {
            targetSlug = postData.slug;
            if (targetSlug) revalidatePath(`/article/${targetSlug}`);
        }
        revalidatePath(`/cms/posts/${parentId}/edit`); // Revalidate edit page
    }


    return { success: true, message: "Blocks copied successfully." };

  } catch (e: unknown) {
    console.error("Unexpected error in copyBlocksFromLanguage:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    return { error: `An unexpected error occurred: ${errorMessage}` };
  }
}
