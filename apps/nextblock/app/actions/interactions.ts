"use server";

import { createClient, getServiceRoleSupabaseClient, getProfileWithRoleServerSide } from "@nextblock-cms/db/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export interface SubmitInteractionInput {
  type: "review" | "comment";
  content: string;
  rating?: number;
  productId?: string;
  postId?: number;
}

/**
 * Submits a new comment or review. Default status is 'pending' for moderation.
 */
export async function submitInteraction(input: SubmitInteractionInput) {
  const supabase = createClient();
  
  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in to submit a review or comment." };
  }

  // 2. Validate inputs
  if (!input.content || input.content.trim().length < 5) {
    return { error: "Content must be at least 5 characters long." };
  }

  if (input.type === "review") {
    if (!input.productId) {
      return { error: "Product ID is required for a review." };
    }
    if (!input.rating || input.rating < 1 || input.rating > 5) {
      return { error: "Rating must be between 1 and 5 stars." };
    }
  } else if (input.type === "comment") {
    if (!input.postId) {
      return { error: "Post ID is required for a comment." };
    }
  } else {
    return { error: "Invalid interaction type." };
  }

  try {
    // 3. Insert interaction
    const { data, error } = await supabase
      .from("cms_interactions" as any)
      .insert({
        type: input.type,
        status: "pending",
        content: input.content.trim(),
        rating: input.type === "review" ? input.rating : null,
        user_id: user.id,
        product_id: input.type === "review" ? input.productId : null,
        post_id: input.type === "comment" ? input.postId : null,
        reactions: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting interaction:", error);
      return { error: `Failed to submit: ${error.message}` };
    }

    // 4. Revalidate moderation panel path
    revalidatePath("/cms/interactions");

    return { success: true, data };
  } catch (err: any) {
    console.error("Submit interaction failed:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Toggles a reaction (like) on a comment or review. Rate-limited and validated using cookies.
 */
export async function toggleReaction(interactionId: string, reactionType = "likes") {
  if (!interactionId) return { error: "Interaction ID is required." };

  try {
    // Rate limit / duplicate prevention using cookies
    const cookieStore = await cookies();
    const reactedCookie = cookieStore.get("reacted_interactions")?.value;
    let reactedList: string[] = [];

    try {
      if (reactedCookie) {
        reactedList = JSON.parse(reactedCookie);
      }
    } catch {
      reactedList = [];
    }

    const hasReacted = reactedList.includes(interactionId);

    // Call service role client since visitors don't have update RLS policies
    const admin = getServiceRoleSupabaseClient();
    
    // Fetch current reactions
    const { data: interaction, error: fetchError } = await admin
      .from("cms_interactions")
      .select("reactions, type, product_id, post_id, products(slug), posts(slug)")
      .eq("id", interactionId)
      .single();

    if (fetchError || !interaction) {
      return { error: "Interaction not found." };
    }

    const reactions = (interaction.reactions as Record<string, number>) || {};
    const currentCount = reactions[reactionType] || 0;
    const newCount = hasReacted ? Math.max(0, currentCount - 1) : currentCount + 1;
    reactions[reactionType] = newCount;

    // Save back to db
    const { error: updateError } = await admin
      .from("cms_interactions")
      .update({ reactions })
      .eq("id", interactionId);

    if (updateError) {
      console.error("Error updating reactions:", updateError);
      return { error: "Failed to update reaction." };
    }

    // Update the cookie
    if (hasReacted) {
      reactedList = reactedList.filter(id => id !== interactionId);
    } else {
      reactedList.push(interactionId);
    }
    
    cookieStore.set("reacted_interactions", JSON.stringify(reactedList), {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    // Revalidate paths to reflect reaction count updates
    const resolvedProduct = interaction.products as any;
    const resolvedPost = interaction.posts as any;

    if (interaction.product_id && resolvedProduct?.slug) {
      revalidatePath(`/product/${resolvedProduct.slug}`);
    } else if (interaction.post_id && resolvedPost?.slug) {
      revalidatePath(`/article/${resolvedPost.slug}`);
    }
    revalidatePath("/cms/interactions");

    return { success: true, count: newCount, hasReacted: !hasReacted };
  } catch (err: any) {
    console.error("Toggle reaction failed:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Updates an interaction's status (approved or denied). Admin/Moderator only.
 */
export async function updateInteractionStatus(interactionId: string, status: "approved" | "denied") {
  const supabase = createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // 2. Authorize as Admin or Writer
  const profile = await getProfileWithRoleServerSide(user.id);
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "WRITER")) {
    return { error: "Unauthorized. Admin or Writer permissions required." };
  }

  // 3. Admin-only rule for denying/approving if strict
  if (profile.role !== "ADMIN") {
    // If writers are not allowed to moderate, block it. The spec says:
    // "Admin-only permission action to switch states between approved or denied."
    // So let's enforce STRICT Admin only for status updates.
    return { error: "Unauthorized. Admin permissions required to moderate." };
  }

  try {
    const admin = getServiceRoleSupabaseClient();
    
    // Fetch interaction details for path revalidation
    const { data: interaction, error: fetchError } = await admin
      .from("cms_interactions")
      .select("product_id, post_id, products(slug), posts(slug)")
      .eq("id", interactionId)
      .single();

    if (fetchError || !interaction) {
      return { error: "Interaction not found." };
    }

    // 4. Update status
    const { error: updateError } = await admin
      .from("cms_interactions")
      .update({ status })
      .eq("id", interactionId);

    if (updateError) {
      console.error("Error updating status:", updateError);
      return { error: `Failed to update status: ${updateError.message}` };
    }

    // 5. Revalidate paths
    const resolvedProduct = interaction.products as any;
    const resolvedPost = interaction.posts as any;

    if (interaction.product_id && resolvedProduct?.slug) {
      revalidatePath(`/product/${resolvedProduct.slug}`);
    } else if (interaction.post_id && resolvedPost?.slug) {
      revalidatePath(`/article/${resolvedPost.slug}`);
    }
    revalidatePath("/cms/interactions");

    return { success: true };
  } catch (err: any) {
    console.error("Update interaction status failed:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}
