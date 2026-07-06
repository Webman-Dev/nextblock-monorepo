"use server";

import { createClient, getServiceRoleSupabaseClient, getProfileWithRoleServerSide } from "@nextblock-cms/db/server";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { sendEmail } from "./email";

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

    // 5. Send email notification asynchronously if emails are configured
    try {
      const admin = getServiceRoleSupabaseClient();
      if (admin) {
        const { data: config } = await admin
          .from("site_settings")
          .select("value")
          .eq("key", "interactions_notification_emails")
          .maybeSingle();

        const emailsString = (config?.value as any)?.emails || "";

        if (emailsString) {
          const host = (await headers()).get("host");
          const protocol = host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https";
          const origin = `${protocol}://${host}`;

          const capitalizedType = input.type.charAt(0).toUpperCase() + input.type.slice(1);
          const subject = `New Pending ${capitalizedType} Submitted`;

          const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
              {{brand_header}}
              <h2 style="color: #6366f1; margin-top: 0;">New Pending ${capitalizedType} Submitted</h2>
              <p>Hello,</p>
              <p>A new content interaction has been submitted and is currently <strong>pending moderation</strong>.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${capitalizedType}</p>
                ${input.type === "review" && input.rating ? `<p style="margin: 0 0 8px 0;"><strong>Rating:</strong> ${input.rating} / 5</p>` : ""}
                <p style="margin: 0 0 8px 0;"><strong>Content:</strong></p>
                <blockquote style="margin: 0; padding-left: 10px; border-left: 3px solid #6366f1; color: #555; font-style: italic;">
                  ${input.content.trim()}
                </blockquote>
              </div>
              <p>Please log in to the moderation dashboard to approve or deny this interaction:</p>
              <p style="margin-top: 20px;">
                <a href="${origin}/cms/interactions" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Moderation Dashboard
                </a>
              </p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #888;">This is an automated notification from your CMS.</p>
            </div>
          `;

          const text = `
New Pending ${capitalizedType} Submitted

A new ${input.type} has been submitted and is currently pending moderation.

Type: ${capitalizedType}
${input.type === "review" && input.rating ? `Rating: ${input.rating} / 5\n` : ""}
Content: "${input.content.trim()}"

Moderation Dashboard: ${origin}/cms/interactions
          `;

          sendEmail({
            to: emailsString,
            subject,
            text,
            html,
          }).catch((err) =>
            console.error("Failed to send pending interaction email notification:", err)
          );
        }
      }
    } catch (emailErr) {
      console.error("Failed to process email notifications:", emailErr);
    }

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

/**
 * Fetches the interactions notification emails from site_settings.
 */
export async function getNotificationEmails() {
  const supabase = createClient();
  
  // Authenticate & authorize
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profile = await getProfileWithRoleServerSide(user.id);
  if (!profile || profile.role !== "ADMIN") {
    return { error: "Unauthorized. Admin role required." };
  }

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "interactions_notification_emails")
      .maybeSingle();

    if (error) throw error;
    
    return { success: true, emails: (data?.value as any)?.emails || "" };
  } catch (err: any) {
    console.error("Failed to fetch notification emails:", err);
    return { error: err.message || "Failed to fetch settings." };
  }
}

/**
 * Saves the interactions notification emails to site_settings.
 */
export async function saveNotificationEmails(emails: string) {
  const supabase = createClient();

  // Authenticate & authorize
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profile = await getProfileWithRoleServerSide(user.id);
  if (!profile || profile.role !== "ADMIN") {
    return { error: "Unauthorized. Admin role required." };
  }

  // Basic validation of emails
  const cleaned = emails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .join(", ");

  try {
    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: "interactions_notification_emails",
        value: { emails: cleaned },
      });

    if (error) throw error;

    return { success: true, emails: cleaned };
  } catch (err: any) {
    console.error("Failed to save notification emails:", err);
    return { error: err.message || "Failed to save settings." };
  }
}
