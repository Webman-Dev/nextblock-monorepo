// app/cms/users/new/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@nextblock-cms/ui";
import { createClient } from "@nextblock-cms/db/server";
import CreateUserForm from "../components/CreateUserForm";

export default async function NewUserPage() {
  const supabase = createClient();
  const { data: { user: currentAdmin } } = await supabase.auth.getUser();

  if (!currentAdmin) {
    return <p>Access Denied. Not authenticated.</p>;
  }

  // User management is admin-only (mirrors the users list page). The CMS layout already
  // gates ADMIN/WRITER; this blocks writers and direct-access attempts.
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentAdmin.id)
    .single();
  if (adminProfile?.role !== "ADMIN") {
    return <p>Access Denied. Admin privileges required.</p>;
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" aria-label="Back to users" asChild>
          <Link href="/cms/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Create User</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Create an account directly. After creating, you can fill in the profile, addresses,
        and avatar on the next screen.
      </p>
      <CreateUserForm />
    </div>
  );
}
