import { createClient, verifyPackageOnline } from "@nextblock-cms/db/server";
import { redirect } from "next/navigation";

import { PromotionsWorkspace } from "./PromotionsWorkspace";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/cms/promotions");
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

  return <PromotionsWorkspace isEcommerceActive={isEcommerceActive} />;
}
