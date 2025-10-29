"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Badge, Input } from "@nextblock-cms/ui";
import { Folder as FolderIcon, Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface FolderNavigatorProps {
  folders: string[];
  basePath: string;
  selectedFolder?: string;
  selectedPrefix?: string;
  counts?: Record<string, number>;
  searchTerm?: string;
}

export default function FolderNavigator({ folders, basePath, selectedFolder, selectedPrefix, counts = {}, searchTerm = "" }: FolderNavigatorProps) {
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

  const lastPushedRef = useRef<string | null>(null);

  const apply = (params: { folder?: string | null; folderPrefix?: string | null }, clearSearch?: boolean) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (params.folder !== undefined) {
      if (params.folder) current.set("folder", params.folder); else current.delete("folder");
    }
    if (params.folderPrefix !== undefined) {
      if (params.folderPrefix) current.set("folderPrefix", params.folderPrefix); else current.delete("folderPrefix");
    }
    if (clearSearch) {
      current.delete('q');
      if (query) setQuery("");
    }
    const nextUrl = `${basePath}${current.toString() ? `?${current.toString()}` : ""}`;
    const currentUrl = `${basePath}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (nextUrl === currentUrl || nextUrl === lastPushedRef.current) return;
    lastPushedRef.current = nextUrl;
    router.push(nextUrl);
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

  // --- Search as filter: update query param 'q' to filter server results ---
  const [query, setQuery] = useState(searchTerm);
  useEffect(() => setQuery(searchTerm), [searchTerm]);
  useEffect(() => {
    const handler = setTimeout(() => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      const term = query.trim();
      if (term) {
        // Auto-select best matching folder path when searching folders
        // Heuristic scoring so partial matches on the last segment still work well.
        const t = term.toLowerCase();
        const minLen = 2; // avoid over-eager matching for 1-char inputs
        const candidates = folders.filter((f) => f.toLowerCase().includes(t));

        // Compute a score for each candidate
        let best: { key: string; score: number } | null = null;
        for (const f of candidates) {
          const full = f.toLowerCase();
          const last = f.replace(/\/$/, '').split('/').filter(Boolean).pop()?.toLowerCase() ?? '';
          let score = 0;
          if (last === t) score = 100; // exact last segment
          else if (last.startsWith(t)) score = 85;
          else if (last.includes(t)) score = 70;
          else if (full.includes(t)) score = 50;
          // shorter last segment gets a small boost (more likely precise)
          score -= Math.min(last.length, 20) * 0.2;
          if (!best || score > best.score) best = { key: f, score };
        }

        // If a strong folder match is found (score threshold) and term length is reasonable,
        // auto-select that folder and clear q so files in it are visible.
        if (best && best.score >= 50 && t.length >= minLen) {
          const norm = best.key.endsWith('/') ? best.key : `${best.key}/`;
          current.set('folderPrefix', norm);
          current.delete('folder');
          current.delete('q');
        } else {
          // Otherwise treat the term as a content filter for files only
          current.set('q', term);
        }
      } else {
        current.delete('q');
      }
      const nextUrl = `${basePath}${current.toString() ? `?${current.toString()}` : ''}`;
      const currentUrl = `${basePath}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      if (nextUrl === currentUrl || nextUrl === lastPushedRef.current) return;
      lastPushedRef.current = nextUrl;
      router.push(nextUrl);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, router, basePath, folders, searchParams]);

  // Compute prefixes/rows to render

  const prefixesToRender = useMemo(() => {
    if (activeGroup) return levelPrefixes;
    // When "All" is selected, do not render any subfolder rows
    return [] as string[];
  }, [activeGroup, levelPrefixes]);

  // RowScroller: keep a row on one line with arrows + drag scroll
  const RowScroller: React.FC<{ children: React.ReactNode; ariaLabel?: string }> = ({ children, ariaLabel }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const isDown = useRef(false);
    const startX = useRef(0);
    const startScroll = useRef(0);

    const refresh = () => {
      const el = ref.current; if (!el) return;
      setCanLeft(el.scrollLeft > 0);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };
    useEffect(() => { refresh(); const onResize = () => refresh(); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);

    const onMD = (e: React.MouseEvent) => { const el = ref.current; if (!el) return; isDown.current = true; startX.current = e.pageX; startScroll.current = el.scrollLeft; el.style.cursor = 'grabbing'; };
    const onMM = (e: React.MouseEvent) => { const el = ref.current; if (!el || !isDown.current) return; el.scrollLeft = startScroll.current - (e.pageX - startX.current); refresh(); };
    const onMU = () => { const el = ref.current; if (!el) return; isDown.current = false; el.style.cursor = ''; };
    const scrollBy = (dx: number) => { const el = ref.current; if (!el) return; el.scrollBy({ left: dx, behavior: 'smooth' }); setTimeout(refresh, 200); };

    return (
      <div className="relative w-full max-w-full overflow-x-hidden">
        {canLeft && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-1 z-10">
            <Button size="icon" variant="outline" onClick={() => scrollBy(-260)} aria-label="Scroll left"><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        )}
        {canRight && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1 z-10">
            <Button size="icon" variant="outline" onClick={() => scrollBy(260)} aria-label="Scroll right"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
        <div
          ref={ref}
          aria-label={ariaLabel}
          className={`overflow-hidden w-full ${canLeft ? 'pl-16' : ''} ${canRight ? 'pr-12' : 'pr-4'}`}
          onMouseDown={onMD}
          onMouseMove={onMM}
          onMouseUp={onMU}
          onMouseLeave={onMU}
          onScroll={refresh}
        >
          <div className="flex gap-2 items-center py-1 whitespace-nowrap">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top-level tabs + search */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <RowScroller ariaLabel="Top folders">
            <Button size="sm" variant={!selectedFolder && !selectedPrefix ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: null })}>
              All
            </Button>
            {topTabs.map((t) => {
              const isActive = selectedPrefix === `${t}/` || (!!selectedFolder && selectedFolder.startsWith(`${t}/`));
              const count = counts[`${t}/`] ?? 0;
              return (
                <Button key={t} size="sm" variant={isActive ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: `${t}/` }, true)} className="flex items-center gap-1">
                  <FolderIcon className="h-3.5 w-3.5" aria-hidden />
                  <span className="capitalize">{t}</span>
                  <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">{count}</Badge>
                </Button>
              );
            })}
          </RowScroller>
        </div>
        <div className="relative min-w-[260px]">
          <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter files and folders..." className="pl-8 h-9" />
        </div>
      </div>

      {/* Recursive rows: for each level prefix, render base + its children */}
      {prefixesToRender.map((prefix) => {
        const children = getImmediateChildren(prefix);
        if (children.length === 0) return null;
        const baseLabel = prefix.replace(/\/$/, '').split('/').pop();
        const isBaseActive = selectedPrefix === prefix;
        return (
          <RowScroller key={`row-${prefix}`} ariaLabel={`Folders under ${baseLabel}`}>
            <Button size="sm" variant={isBaseActive ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: prefix }, true)} className="flex items-center gap-1">
              <FolderIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="capitalize">{baseLabel}</span>
              <Badge variant={isBaseActive ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">{counts[prefix] ?? 0}</Badge>
            </Button>
            {children.map((child) => {
              const label = child.replace(/\/$/, '').split('/').pop();
              const isSel = (selectedPrefix === child || selectedFolder === child);
              const c = counts[child] ?? 0;
              return (
                <Button key={child} size="sm" variant={isSel ? "default" : "outline"} onClick={() => apply({ folder: null, folderPrefix: child }, true)} className="flex items-center gap-1" title={child}>
                  <FolderIcon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                  <Badge variant={isSel ? "secondary" : "outline"} className="ml-1 px-1.5 py-1 text-[10px] leading-none">{c}</Badge>
                </Button>
              );
            })}
          </RowScroller>
        );
      })}
    </div>
  );
}
