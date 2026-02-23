// app/cms/components/LanguageFilterSelect.tsx
"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nextblock-cms/ui";
import type { Database } from '@nextblock-cms/db';
import { Languages as LanguageIcon } from 'lucide-react';

type Language = Database['public']['Tables']['languages']['Row'];

interface LanguageFilterSelectProps {
  allLanguages: Language[];
  currentFilterLangId?: number; // The ID of the currently filtered language
  basePath: string; // e.g., "/cms/pages" or "/cms/posts"
}

export default function LanguageFilterSelect({
  allLanguages,
  currentFilterLangId,
  basePath,
}: LanguageFilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLanguageChange = (selectedLangId: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (selectedLangId && selectedLangId !== "all") {
      current.set("lang", selectedLangId);
    } else {
      current.delete("lang"); // Remove lang param to show all languages
    }
    const query = current.toString();
    router.push(`${basePath}${query ? `?${query}` : ""}`);
  };

  if (allLanguages.length <= 1) {
    return null; // Don't show filter if only one or no languages
  }

  return (
    <div className="flex items-center gap-2">
      <LanguageIcon className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentFilterLangId?.toString() || "all"}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="w-[180px] h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Filter by language..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Languages</SelectItem>
          {allLanguages.map((lang) => (
            <SelectItem key={lang.id} value={lang.id.toString()}>
              {lang.name} ({lang.code.toUpperCase()})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
