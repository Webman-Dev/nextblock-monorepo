"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Badge } from "@nextblock-monorepo/ui";
import { Folder as FolderIcon } from "lucide-react";

interface FolderNavigatorProps {
  folders: string[];
  basePath: string;
  selectedFolder?: string;
  selectedPrefix?: string;
  counts?: Record<string, number>;
}

export default function FolderNavigator({ folders, basePath, selectedFolder, selectedPrefix, counts = {} }: FolderNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build top-level groups and counts
  const groups = useMemo(() => {
    const map = new Map<string, Set<string>>();
    folders.forEach((f) => {
      const parts = f.replace(/^\/+/, "").split("/").filter(Boolean);
      const top = (parts[0] || "").toLowerCase();
      const child = parts.length >= 2 ? `${top}/${parts[1]}/` : `${top}/`;
      let set = map.get(top);
      if (!set) {
        set = new Set<string>();
        map.set(top, set);
      }
      set.add(child);
    });
    return Array.from(map.entries())
      .map(([name, children]) => ({ name, count: children.size }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders]);

  const apply = (params: { folder?: string | null; folderPrefix?: string | null }) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (params.folder !== undefined) {
      if (params.folder) current.set("folder", params.folder); else current.delete("folder");
    }
    if (params.folderPrefix !== undefined) {
      if (params.folderPrefix) current.set("folderPrefix", params.folderPrefix); else current.delete("folderPrefix");
    }
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}`);
  };

  const activeGroup = useMemo(() => {
    const firstSeg = (p: string) => p.replace(/^\/+/, '').split('/').filter(Boolean)[0] || '';
    if (selectedPrefix) return firstSeg(selectedPrefix);
    if (selectedFolder) return firstSeg(selectedFolder);
    return '';
  }, [selectedPrefix, selectedFolder]);

  const topTabs = ["logos", "pages", "posts", "uploads"].filter((t) => groups.find((g) => g.name === t));

  const getImmediateChildren = (basePrefix: string): string[] => {
    if (!basePrefix) return [];
    const base = basePrefix.replace(/^\/+/, "");
    const set = new Set<string>();
    folders.forEach((f) => {
      const norm = f.replace(/^\/+/, "");
      if (!norm.startsWith(base)) return;
      const rest = norm.slice(base.length);
      if (!rest) return;
      const seg = rest.split("/").filter(Boolean)[0];
      if (!seg) return;
      set.add(`${base}${seg}/`);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  // Build all level prefixes from the selected prefix to render rows recursively
  const levelPrefixes = useMemo(() => {
    const arr: string[] = [];
    if (!activeGroup) return arr;
    const top = `${activeGroup}/`;
    arr.push(top);
    const current = (selectedPrefix || selectedFolder || '').replace(/^\/+/, '');
    if (current && current.startsWith(top)) {
      const parts = current.replace(/\/$/, '').split('/').filter(Boolean);
      // parts includes activeGroup as first element; start after it
      for (let i = 1; i < parts.length; i++) {
        const prefix = `${activeGroup}/${parts.slice(1, i + 1).join('/')}/`;
        arr.push(prefix);
      }
    }
    return arr;
  }, [activeGroup, selectedPrefix, selectedFolder]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top-level tabs */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!selectedFolder && !selectedPrefix ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: null })}>
          All
        </Button>
        {topTabs.map((t) => {
          const isActive = selectedPrefix === `${t}/` || (!!selectedFolder && selectedFolder.startsWith(`${t}/`));
          const count = counts[`${t}/`] ?? 0;
          return (
            <Button key={t} size="sm" variant={isActive ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: `${t}/` })} className="flex items-center gap-1">
              <FolderIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="capitalize">{t}</span>
              <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">{count}</Badge>
            </Button>
          );
        })}
      </div>

      {/* Recursive rows: for each level prefix, render base + its children */}
      {levelPrefixes.map((prefix) => {
        const children = getImmediateChildren(prefix);
        if (children.length === 0) return null;
        const baseLabel = prefix.replace(/\/$/, '').split('/').pop();
        const isBaseActive = selectedPrefix === prefix;
        return (
          <div key={`row-${prefix}`} className="flex flex-wrap gap-2">
            <Button size="sm" variant={isBaseActive ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: prefix })} className="flex items-center gap-1">
              <FolderIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="capitalize">{baseLabel}</span>
              <Badge variant={isBaseActive ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">{counts[prefix] ?? 0}</Badge>
            </Button>
            {children.map((child) => {
              const label = child.replace(/\/$/, '').split('/').pop();
              const isSel = (selectedPrefix === child || selectedFolder === child);
              const c = counts[child] ?? 0;
              return (
                <Button key={child} size="sm" variant={isSel ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: child })} className="flex items-center gap-1" title={child}>
                  <FolderIcon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                  <Badge variant={isSel ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">{c}</Badge>
                </Button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
