"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nextblock-cms/ui";

interface FolderTreeProps {
  folders: string[];
  basePath: string;
  selectedFolder?: string; // exact folder filter
  selectedPrefix?: string; // prefix filter (e.g., pages/)
}

type Group = {
  name: string; // top-level segment, e.g., 'pages'
  count: number; // number of folders under this group
  children: string[]; // immediate subfolders like 'pages/slug/'
};

export default function FolderTree({ folders, basePath, selectedFolder, selectedPrefix }: FolderTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Set<string>>();
    folders.forEach((f) => {
      const parts = f.replace(/^\/+/, '').split('/').filter(Boolean);
      const top = parts[0] || '';
      const childPrefix = parts.length >= 2 ? `${top}/${parts[1]}/` : `${top}/`;
      if (!map.has(top)) {
        map.set(top, new Set<string>());
      }
      const childSet = map.get(top);
      if (childSet) {
        childSet.add(childPrefix);
      }
    });
    return Array.from(map.entries()).map(([name, children]) => ({
      name,
      count: children.size,
      children: Array.from(children).sort((a, b) => a.localeCompare(b)),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [folders]);

  const apply = (params: Record<string, string | undefined>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (params.folder !== undefined) {
      if (params.folder) current.set('folder', params.folder); else current.delete('folder');
    }
    if (params.folderPrefix !== undefined) {
      if (params.folderPrefix) current.set('folderPrefix', params.folderPrefix); else current.delete('folderPrefix');
    }
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ''}`);
  };

  const isPrefixActive = (prefix: string) => selectedPrefix === prefix && !selectedFolder;
  const isFolderActive = (folder: string) => selectedFolder === folder;

  const topLevel = groups.map((g) => `${g.name}/`);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!selectedFolder && !selectedPrefix ? 'default' : 'outline'} onClick={() => apply({ folder: undefined, folderPrefix: undefined })}>All</Button>
        {topLevel.map((prefix) => (
          <Button
            key={prefix}
            size="sm"
            variant={isPrefixActive(prefix) ? 'default' : 'outline'}
            onClick={() => apply({ folder: undefined, folderPrefix: prefix })}
            title={`${prefix}*`}
          >
            {prefix}*
          </Button>
        ))}
      </div>

      {/* Collapsible children (first N by default) */}
      {groups.map((g) => {
        const prefix = `${g.name}/`;
        const open = !!expanded[prefix];
        const children = g.children;
        const limit = 10;
        const visible = open ? children : children.slice(0, limit);
        return (
          <div key={g.name} className="border rounded-md p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{prefix}</span>
                <span className="text-xs text-muted-foreground">{g.count} subfolder(s)</span>
              </div>
              {g.count > limit && (
                <Button size="sm" variant="outline" onClick={() => setExpanded((e) => ({ ...e, [prefix]: !open }))}>
                  {open ? 'Show less' : `Show all ${g.count}`}
                </Button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {visible.map((child) => (
                <Button
                  key={child}
                  size="sm"
                  variant={isFolderActive(child) ? 'default' : 'outline'}
                  onClick={() => apply({ folder: child, folderPrefix: undefined })}
                  title={child}
                >
                  {child}
                </Button>
              ))}
              {visible.length === 0 && (
                <span className="text-xs text-muted-foreground">No subfolders yet</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

