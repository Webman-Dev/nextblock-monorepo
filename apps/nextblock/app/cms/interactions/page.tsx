import { redirect } from "next/navigation";
import { createClient, getProfileWithRoleServerSide } from "@nextblock-cms/db/server";
import InteractionsModerationClient from "./InteractionsModerationClient";

export const dynamic = "force-dynamic";

export default async function InteractionsPage() {
  const supabase = createClient();
  
  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect_to=/cms/interactions");
  }

  // 2. Authorize user (requires ADMIN or WRITER roles to access CMS)
  const profile = await getProfileWithRoleServerSide(user.id);
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "WRITER")) {
    redirect("/cms/dashboard");
  }

  // 3. Fetch initial interactions (reviews and comments)
  const { data: interactions, error } = await supabase
    .from("cms_interactions" as any)
    .select(`
      id,
      type,
      status,
      content,
      rating,
      reactions,
      created_at,
      product_id,
      post_id,
      profiles(full_name, avatar_url, github_username),
      products(title, slug),
      posts(title, slug)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching initial interactions:", error);
  }

  return (
    <InteractionsModerationClient
      initialInteractions={interactions || []}
      isAdmin={profile.role === "ADMIN"}
    />
  );
}
