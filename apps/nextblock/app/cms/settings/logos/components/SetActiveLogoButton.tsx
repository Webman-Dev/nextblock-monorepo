"use client";

import { DropdownMenuItem } from "@nextblock-cms/ui";
import { CheckCircle2 } from "lucide-react";
import { setActiveLogo } from "../actions";
import { useTransition } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface SetActiveLogoButtonProps {
  logoId: string;
}

export default function SetActiveLogoButton({ logoId }: SetActiveLogoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSetActive = () => {
    startTransition(async () => {
      const result = await setActiveLogo(logoId);
      if (result?.error) {
        toast.error(`Error: ${result.error}`);
      } else {
        toast.success("Active logo updated");
        router.refresh();
      }
    });
  };

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      // Keep the menu from closing before the transition starts.
      onSelect={(e) => e.preventDefault()}
      onClick={() => !isPending && handleSetActive()}
      disabled={isPending}
    >
      <CheckCircle2 className="mr-2 h-4 w-4" />
      {isPending ? "Setting active..." : "Set as active"}
    </DropdownMenuItem>
  );
}
