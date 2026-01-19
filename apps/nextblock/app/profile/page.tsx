import { createClient } from "@nextblock-cms/db/server";
import { redirect } from "next/navigation";
import { CustomerProfileForm } from "@nextblock-cms/ecommerce";
import MediaPickerDialog from "../cms/media/components/MediaPickerDialog";

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
      // Should not happen usually, but handle gracefully
      return <div>Profile not found.</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information, contact details, and billing address.
        </p>
      </div>
      
      <CustomerProfileForm 
        initialData={{
            full_name: profile.full_name || '',
            avatar_url: profile.avatar_url || '',
            website: profile.website || '',
            github_username: profile.github_username || '',
            phone: profile.phone || '',
            billing_address: profile.billing_address as any,
        }} 
        MediaPickerComponent={MediaPickerDialog}
      />
    </div>
  );
}
