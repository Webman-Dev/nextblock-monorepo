"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nextblock-monorepo/ui";

interface FolderListProps {
  folders: string[];
  selectedFolder?: string;
  basePath: string;
}

export default function FolderList({ folders, selectedFolder, basePath }: FolderListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const applyFolder = (folder?: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!folder) current.delete("folder");
    else current.set("folder", folder);
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}`);
  };

  const isSelected = (f?: string) => (selectedFolder || "") === (f || "");

  const unique = Array.from(new Set(folders));

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={isSelected(undefined) ? "default" : "outline"}
        onClick={() => applyFolder(undefined)}
      >
        All Folders
      </Button>
      {unique.map((f) => (
        <Button
          key={f}
          size="sm"
          variant={isSelected(f) ? "default" : "outline"}
          onClick={() => applyFolder(f)}
          title={f}
        >
          {f}
        </Button>
      ))}
    </div>
  );
}

