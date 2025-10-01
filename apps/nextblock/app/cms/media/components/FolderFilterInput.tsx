"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Label } from "@nextblock-monorepo/ui";

interface FolderFilterInputProps {
  basePath: string; // e.g., "/cms/media"
  initialFolder?: string;
}

export default function FolderFilterInput({ basePath, initialFolder = "" }: FolderFilterInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [folder, setFolder] = useState<string>(initialFolder);

  useEffect(() => {
    setFolder(initialFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFolder]);

  const applyFilter = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (folder && folder.trim()) {
      current.set("folder", folder.trim());
    } else {
      current.delete("folder");
    }
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}`);
  };

  const clearFilter = () => {
    setFolder("");
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("folder");
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="folder-filter" className="text-xs">Folder</Label>
        <Input
          id="folder-filter"
          placeholder="uploads/ or images/summer/"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="h-9"
        />
      </div>
      <Button size="sm" onClick={applyFilter}>Apply</Button>
      <Button size="sm" variant="secondary" onClick={clearFilter}>Clear</Button>
    </div>
  );
}

