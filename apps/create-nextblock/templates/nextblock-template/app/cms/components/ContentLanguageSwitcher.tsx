// app/cms/components/ContentLanguageSwitcher.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@nextblock-cms/db';
import Link from 'next/link';
import { Button } from '@nextblock-cms/ui';
import { Languages, CheckCircle } from 'lucide-react';
import type { Database } from '@nextblock-cms/db';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nextblock-cms/ui";
import { cn } from '@nextblock-cms/utils'; // For conditional styling

type Language = Database['public']['Tables']['languages']['Row'];
type Page = Database['public']['Tables']['pages']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
interface ContentLanguageSwitcherProps {
  currentItem: (Page | Post | Product) & { language_code?: string; translation_group_id: string; }; // Must have translation_group_id
  itemType: 'page' | 'post' | 'product';
  allSiteLanguages: Language[];
}

interface TranslationVersion {
  id: number; // Primary key of the specific language version
  language_id: number;
  language_code: string;
  language_name: string;
  title: string;
  status: string;
  slug: string; // The specific slug for this language version
}

export default function ContentLanguageSwitcher({
  currentItem,
  itemType,
  allSiteLanguages,
}: ContentLanguageSwitcherProps) {
  const [translations, setTranslations] = useState<TranslationVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!currentItem.translation_group_id || allSiteLanguages.length === 0) {
      setIsLoading(false);
      setTranslations([]);
      return;
    }

    async function fetchTranslations() {
      setIsLoading(true);
      const tableMap = {
        'page': 'pages',
        'post': 'posts',
        'product': 'products'
      };
      const table = tableMap[itemType];
      const { data, error } = await supabase
        .from(table)
        .select('id, title, status, language_id, slug') // Fetch slug too
        .eq('translation_group_id', currentItem.translation_group_id);

      if (error) {
        // Surface a useful message: a network "Failed to fetch" (e.g. the browser
        // Supabase client before the runtime public env is in place) serializes to {},
        // so log the message/code explicitly.
        console.error(
          `Error fetching translations for ${itemType} group ${currentItem.translation_group_id}:`,
          error.message || error.code || JSON.stringify(error),
        );
        setTranslations([]);
      } else if (data) {
        const mappedTranslations = data.map(item => {
          const langInfo = allSiteLanguages.find(l => l.id === item.language_id);
          return {
            id: item.id,
            language_id: item.language_id,
            language_code: langInfo?.code || 'unk',
            language_name: langInfo?.name || 'Unknown',
            title: item.title,
            status: item.status,
            slug: item.slug,
          };
        });
        setTranslations(mappedTranslations);
      }
      setIsLoading(false);
    }

    fetchTranslations();
  }, [currentItem.translation_group_id, itemType, supabase, allSiteLanguages]);

  const currentItemAny = currentItem as any;
  const currentLanguageName = allSiteLanguages.find(l => l.id === currentItemAny.language_id)?.name || currentItem.language_code;


  if (allSiteLanguages.length <= 1 && !isLoading) {
    return null; // Don't show switcher if only one language configured
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto" disabled={isLoading}>
          <Languages className="mr-2 h-4 w-4" />
          {isLoading ? "Loading..." : `Editing: ${currentLanguageName} (${currentItem.language_code?.toUpperCase()})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72"> {/* Increased width */}
        <DropdownMenuLabel>Switch to Edit Other Language Version</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allSiteLanguages.map(lang => {
          const version = translations.find(t => t.language_id === lang.id);
          const currentItemAny = currentItem as any;
          const isCurrent = lang.id === currentItemAny.language_id;

          // Link to create new translation if it doesn't exist
          // This requires a more complex "create translation" flow or pre-created placeholders
          const tableMap = {
            'page': 'pages',
            'post': 'posts',
            'product': 'products'
          };
          const baseUrl = `/cms/${tableMap[itemType]}`;
          const editUrl = version
            ? `${baseUrl}/${version.id}/edit`
            : itemType === 'product'
              ? `${baseUrl}/${currentItemAny.id}/edit?missing_lang_id=${lang.id}`
              : `${baseUrl}/new?from_group=${currentItemAny.translation_group_id}&target_lang_id=${lang.id}&base_slug=${currentItemAny.slug}`; // Example URL for creating new translation

          if (version) {
            return (
              <DropdownMenuItem key={lang.id} asChild disabled={isCurrent} className={cn(isCurrent && "bg-accent font-semibold")}>
                <Link href={editUrl} className="w-full">
                  <div className="flex justify-between items-center w-full">
                    <span>{lang.name} ({lang.code.toUpperCase()})</span>
                    {isCurrent && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={version.title}>
                    Slug: /{version.slug} - <span className="capitalize">{version.status}</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          } else {
            // Offer to create a new translation (simplified link, full flow is more complex)
            return (
              <DropdownMenuItem key={lang.id} asChild className="opacity-75 hover:opacity-100">
                 <Link href={editUrl} className="w-full"> {/* Adjust URL for creating new */}
                    <div className="flex justify-between items-center w-full">
                        <span>{lang.name} ({lang.code.toUpperCase()})</span>
                        <span className="text-xs text-blue-500">(Create)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Not yet created</div>
                </Link>
              </DropdownMenuItem>
            );
          }
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
