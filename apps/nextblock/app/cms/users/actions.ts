// app/cms/users/actions.ts
"use server";

import { createClient } from "@nextblock-cms/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@nextblock-cms/db";

type UserRole = Database['public']['Enums']['user_role'];

// Helper to check admin role using the server client
async function verifyAdmin(supabase: ReturnType<typeof createClient>): Promise<{ isAdmin: boolean; error?: string; userId?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { isAdmin: false, error: "Authentication required." };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, error: "Profile not found or error fetching profile." };
  }
  if (profile.role !== "ADMIN") {
    return { isAdmin: false, error: "Admin privileges required." };
  }
  return { isAdmin: true, userId: user.id };
}

type UpdateUserProfilePayload = {
  role: UserRole;
  username?: string | null;
  full_name?: string | null;
  // Add other editable profile fields here if needed
};

export async function updateUserProfile(userIdToUpdate: string, formData: FormData) {
  const supabase = createClient();
  const adminCheck = await verifyAdmin(supabase);
  if (!adminCheck.isAdmin) {
    return { error: adminCheck.error || "Unauthorized" };
  }

  const rawFormData = {
    role: formData.get("role") as UserRole,
    username: formData.get("username") as string || null,
    full_name: formData.get("full_name") as string || null,
  };

  if (!rawFormData.role) {
    return { error: "Role is a required field." };
  }
  if (!['ADMIN', 'WRITER', 'USER'].includes(rawFormData.role)) {
      return { error: "Invalid role specified." };
  }

  // Prevent an admin from accidentally removing their own admin role if they are the only admin
  // This is a basic check; a more robust system might count admins.
  if (userIdToUpdate === adminCheck.userId && rawFormData.role !== 'ADMIN') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ADMIN');
      if (count === 1) {
          return { error: "Cannot remove the last admin's role." };
      }
  }


  const profileData: UpdateUserProfilePayload = {
    role: rawFormData.role,
    username: rawFormData.username,
    full_name: rawFormData.full_name,
  };

  const { error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userIdToUpdate);

  if (error) {
    console.error("Error updating user profile:", error);
    return { error: `Failed to update profile: ${error.message}` };
  }

  revalidatePath("/cms/users");
  revalidatePath(`/cms/users/${userIdToUpdate}/edit`);
  redirect(`/cms/users/${userIdToUpdate}/edit?success=User profile updated successfully`);
}

export async function deleteUserAndProfile(userIdToDelete: string) {

  // For deleting a user, we need to use the Supabase Admin API,
  // which requires a client initialized with the SERVICE_ROLE_KEY.
  // This ensures the operation has the necessary privileges.
  // IMPORTANT: Ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local and Vercel env vars.
  const supabaseAdmin = createClient(
    // Re-create client with service role. This is a common pattern.
    // Ensure your createClient function can be called without args to use env vars,
    // or pass them explicitly if needed. The one from the template should work.
    // If your createClient is specific to user context (cookies), you might need a separate
    // admin client factory. For now, assuming `createClient()` can make a service client
    // if called in a server action without user cookie context, or if it defaults to service key.
    // A safer way:
    // const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    // However, the template's createClient for server components/actions should handle this by not having cookie access.
    // Let's assume for now createClient() is sufficient if it can use service role.
    // A more explicit way for admin actions:
    // import { createClient as createAdminClient } from '@supabase/supabase-js';
    // const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  );


  const adminCheck = await verifyAdmin(supabaseAdmin); // Verify current user is admin
  if (!adminCheck.isAdmin) {
    return { error: adminCheck.error || "Unauthorized" };
  }

  if (userIdToDelete === adminCheck.userId) {
    return { error: "Admins cannot delete their own account through this panel." };
  }

  // Use the Supabase Auth Admin API to delete the user
  // This requires the `SERVICE_ROLE_KEY` to be configured for the Supabase client.
  // The standard `createClient` from `utils/supabase/server` might not use the service role by default.
  // You might need a dedicated admin client instance.
  // For this example, we'll assume `supabase.auth.admin.deleteUser` is available and configured.
  // If not, this part needs adjustment to use a service_role client.

  // The `createClient()` from `@supabase/ssr` for server context doesn't directly expose `auth.admin`.
  // We need to create a standard Supabase client with the service role key.
  const { createClient: createServiceRoleClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables');
  }
  
  const serviceSupabase = createServiceRoleClient(supabaseUrl, serviceRoleKey);


  const { error: deletionError } = await serviceSupabase.auth.admin.deleteUser(userIdToDelete);

  if (deletionError) {
    console.error("Error deleting user:", deletionError);
    // If the profile was deleted by cascade but auth user deletion failed, this is an inconsistent state.
    return { error: `Failed to delete user: ${deletionError.message}` };
  }

  // The `profiles` table has ON DELETE CASCADE for the user ID, so it should be deleted automatically.
  revalidatePath("/cms/users");
  redirect("/cms/users?success=User deleted successfully");
}