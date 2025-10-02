"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Badge } from "@nextblock-monorepo/ui";
import { Folder as FolderIcon } from "lucide-react";

interface FolderNavigatorProps {
  folders: string[];
  basePath: string;
  selectedFolder?: string; // exact
  selectedPrefix?: string; // prefix
}

export default function FolderNavigator({ folders, basePath, selectedFolder, selectedPrefix }: FolderNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const groups = useMemo(() => {
    const map = new Map<string, Set<string>>();
    folders.forEach((f) => {
      const parts = f.replace(/^\/+/, "").split("/").filter(Boolean);
      const top = (parts[0] || "").toLowerCase();
      const child = parts.length >= 2 ? `${top}/${parts[1]}/` : `${top}/`;
      if (!map.has(top)) map.set(top, new Set());
      map.get(top)!.add(child);
    });
    return Array.from(map.entries()).map(([name, children]) => ({
      name,
      children: Array.from(children).sort((a, b) => a.localeCompare(b)),
      count: children.size,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [folders]);

  const apply = (params: { folder?: string | null; folderPrefix?: string | null }) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (params.folder !== undefined) {
      if (params.folder) current.set("folder", params.folder); else current.delete("folder");
    }
    if (params.folderPrefix !== undefined) {
      if (params.folderPrefix) current.set("folderPrefix", params.folderPrefix); else current.delete("folderPrefix");
    }
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}`);
  };

  // Determine active group from selectedPrefix or selectedFolder
  const activeGroup = useMemo(() => {
    if (selectedPrefix) return selectedPrefix.replace(/\/$/, "");
    if (selectedFolder) {
      const top = selectedFolder.replace(/^\/+/, "").split("/").filter(Boolean)[0] || "";
      return top.toLowerCase();
    }
    // When "All" is selected, no group is active
    return "";
  }, [selectedPrefix, selectedFolder]);

  const topTabs = ["logos", "pages", "posts", "uploads"]
    .filter((t) => groups.find((g) => g.name === t));

  const activeChildren = activeGroup ? (groups.find((g) => g.name === activeGroup)?.children ?? []) : [];
  const MAX_CHILDREN = 10;
  const visibleChildren = activeChildren.slice(0, MAX_CHILDREN);

  return (
    <div className="flex flex-col gap-3">
      {/* Top-level tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!selectedFolder && !selectedPrefix ? "default" : "outline"}
          onClick={() => apply({ folder: null, folderPrefix: null })}
        >
          All
        </Button>
        {topTabs.map((t) => {
          const isActive = (selectedPrefix === `${t}/`) || (!!selectedFolder && selectedFolder.startsWith(`${t}/`));
          const count = groups.find((g) => g.name === t)?.count ?? 0;
          return (
            <Button
              key={t}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => apply({ folder: null, folderPrefix: `${t}/` })}
              className="flex items-center gap-1"
            >
              <FolderIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="capitalize">{t}</span>
              {typeof count === 'number' && (
                <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* First-level children for the active group (compact pills) */}
      {activeChildren.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleChildren.map((child) => (
            <Button
              key={child}
              size="sm"
              variant={selectedFolder === child ? "default" : "outline"}
              onClick={() => apply({ folder: child, folderPrefix: null })}
              title={child}
            >
              <FolderIcon className="h-3.5 w-3.5 mr-1" aria-hidden />
              {child}
            </Button>
          ))}
          {activeChildren.length > MAX_CHILDREN && (
            <Button size="sm" variant="outline" onClick={() => apply({ folder: null, folderPrefix: `${activeGroup}/` })}>
              View all…
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
