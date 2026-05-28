import { createClient, verifyPackageOnline } from "@nextblock-cms/db/server";
import { redirect } from "next/navigation";

import { BackupRestoreWorkspace } from "./BackupRestoreWorkspace";

export default async function BackupRestorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/cms/settings/backup-restore");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    redirect("/unauthorized?reason=admin_required");
  }

  const isEcommerceActive = await verifyPackageOnline("ecommerce").catch(() => false);

  return <BackupRestoreWorkspace isEcommerceActive={isEcommerceActive} />;
}
