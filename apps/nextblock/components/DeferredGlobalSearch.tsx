"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@nextblock-cms/ui/button";
import { cn } from "@nextblock-cms/utils";

type TriggerVariant = "desktop" | "mobile";

interface DeferredGlobalSearchProps {
  isEcommerceActive: boolean;
  variant: TriggerVariant;
}

const GlobalSearch = dynamic(() => import("./GlobalSearch"), {
  ssr: false,
  loading: () => null,
});

export function DeferredGlobalSearch(props: DeferredGlobalSearchProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [openOnMount, setOpenOnMount] = useState(false);

  const openSearch = () => {
    setOpenOnMount(true);
    setShouldLoad(true);
  };

  useEffect(() => {
    if (props.variant !== "desktop") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.variant]);

  if (shouldLoad) {
    return <GlobalSearch {...props} openOnMount={openOnMount} />;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={props.variant === "mobile" ? "icon" : "default"}
      className={cn(
        "shrink-0 border-foreground/15 bg-background/70",
        props.variant === "desktop" && "h-9 gap-2 px-3 text-sm",
        props.variant === "mobile" && "h-10 w-10"
      )}
      aria-label="Search"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={openSearch}
    >
      <Search className="h-4 w-4" />
      {props.variant === "desktop" ? <span>Search</span> : null}
    </Button>
  );
}
