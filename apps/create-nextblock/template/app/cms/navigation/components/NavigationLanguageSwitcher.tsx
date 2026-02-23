// app/cms/navigation/components/NavigationLanguageSwitcher.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@nextblock-cms/db';
import Link from 'next/link';
import { Button } from '@nextblock-cms/ui';
import { Languages as LanguagesIcon, CheckCircle, PlusCircle } from 'lucide-react'; // Changed icon name
import type { Database } from '@nextblock-cms/db';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nextblock-cms/ui";
import { cn } from '@nextblock-cms/utils';

type Language = Database['public']['Tables']['languages']['Row'];
type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
interface NavigationLanguageSwitcherProps {
  currentItem: NavigationItem; // Current navigation item being edited
  allSiteLanguages: Language[];
}

interface TranslationVersion {
  id: number;
  language_id: number;
  language_code: string;
  language_name: string;
  label: string;
  menu_key: NavigationItem['menu_key'];
}

export default function NavigationLanguageSwitcher({
  currentItem,
  allSiteLanguages,
}: NavigationLanguageSwitcherProps) {
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
      const { data, error } = await supabase
        .from('navigation_items')
        .select('id, label, language_id, menu_key')
        .eq('translation_group_id', currentItem.translation_group_id);

      if (error) {
        console.error(`Error fetching translations for nav group ${currentItem.translation_group_id}:`, error);
        setTranslations([]);
      } else if (data) {
        const mappedTranslations = data.map(item => {
          const langInfo = allSiteLanguages.find(l => l.id === item.language_id);
          return {
            id: item.id,
            language_id: item.language_id,
            language_code: langInfo?.code || 'unk',
            language_name: langInfo?.name || 'Unknown',
            label: item.label,
            menu_key: item.menu_key,
          };
        });
        setTranslations(mappedTranslations);
      }
      setIsLoading(false);
    }

    fetchTranslations();
  }, [currentItem.translation_group_id, allSiteLanguages, supabase]);

  const currentLanguageDetails = allSiteLanguages.find(l => l.id === currentItem.language_id);
  const currentLanguageName = currentLanguageDetails?.name || 'Unknown Language';
  const currentLanguageCode = currentLanguageDetails?.code?.toUpperCase() || 'N/A';


  if (allSiteLanguages.length <= 1 && !isLoading) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto" disabled={isLoading}>
          <LanguagesIcon className="mr-2 h-4 w-4" />
          {isLoading ? "Loading..." : `Editing: ${currentLanguageName} (${currentLanguageCode})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Switch Language Version</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allSiteLanguages.map(lang => {
          const version = translations.find(t => t.language_id === lang.id);
          const isCurrent = lang.id === currentItem.language_id;

          // Construct URL to create a new translation if it doesn't exist
          // It passes the original group ID and the target language ID
          const createNewUrl = `/cms/navigation/new?from_translation_group_id=${currentItem.translation_group_id}&target_language_id=${lang.id}&menu_key=${currentItem.menu_key}&original_label=${encodeURIComponent(currentItem.label)}`;
          const editUrl = version ? `/cms/navigation/${version.id}/edit` : createNewUrl;

          return (
            <DropdownMenuItem key={lang.id} asChild disabled={isCurrent && !!version} className={cn(isCurrent && !!version && "bg-accent font-semibold")}>
              <Link href={editUrl} className="w-full">
                <div className="flex justify-between items-center w-full">
                  <span>{lang.name} ({lang.code.toUpperCase()})</span>
                  {isCurrent && version && <CheckCircle className="h-4 w-4 text-primary" />}
                  {!version && <PlusCircle className="h-4 w-4 text-blue-500" />}
                </div>
                {version ? (
                  <div className="text-xs text-muted-foreground truncate" title={version.label}>
                    {version.label}
                  </div>
                ) : (
                  <div className="text-xs text-blue-500">Create new translation</div>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
